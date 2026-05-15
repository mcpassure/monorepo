import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AwsClient } from "aws4fetch";

const DATASET = "cnes";
const BUCKET = "mcpassure-datasets";
const MANIFEST_KEY = `${DATASET}/latest/manifest.json`;

type Manifest = {
  dataset: string;
  version: string;
  generated_at: string;
  schema_version: string;
  source: { name: string; url: string; publisher: string; license: string };
  transformation: { script_url: string; script_version: string; notes: string };
  artifact: {
    bucket: string;
    key: string;
    size_bytes: number;
    sha256: string;
    mime_type: string;
    records?: Record<string, number>;
  };
  previous_version_url: string | null;
  next_check_at: string;
};

function getDataDir(): string {
  return process.platform === "win32"
    ? join(process.env.APPDATA ?? homedir(), "mcpassure", DATASET)
    : join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "mcpassure", DATASET);
}

function getDbPath(): string {
  return process.env.MCPASSURE_DB_PATH ?? join(getDataDir(), `${DATASET}.db`);
}

function getLocalManifestPath(): string {
  return join(getDataDir(), "manifest.json");
}

function log(msg: string): void {
  process.stderr.write(`[bootstrap] ${msg}\n`);
}

async function fetchManifest(client: AwsClient, endpoint: string): Promise<Manifest> {
  const url = `${endpoint}/${BUCKET}/${MANIFEST_KEY}`;
  const resp = await client.fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ao buscar manifest em ${url}`);
  }
  return (await resp.json()) as Manifest;
}

async function downloadAndVerify(
  client: AwsClient,
  endpoint: string,
  manifest: Manifest,
  targetPath: string
): Promise<void> {
  const url = `${endpoint}/${manifest.artifact.bucket}/${manifest.artifact.key}`;
  const tmp = `${targetPath}.download`;

  await mkdir(dirname(targetPath), { recursive: true });

  log(`Baixando ${url} (${(manifest.artifact.size_bytes / 1024 / 1024).toFixed(1)} MB)...`);
  const resp = await client.fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ao baixar artifact ${url}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());

  if (buf.length !== manifest.artifact.size_bytes) {
    throw new Error(
      `Tamanho inesperado. Esperado ${manifest.artifact.size_bytes}, recebido ${buf.length}.`
    );
  }

  const hash = createHash("sha256").update(buf).digest("hex");
  if (hash.toLowerCase() !== manifest.artifact.sha256.toLowerCase()) {
    throw new Error(
      `Checksum SHA-256 não bate. Esperado ${manifest.artifact.sha256}, recebido ${hash}.`
    );
  }

  await writeFile(tmp, buf);
  await rename(tmp, targetPath);
  log(`Download concluído. SHA-256 validado.`);
}

export type BootstrapResult =
  | { ok: true; action: "downloaded" | "up_to_date" | "skipped_offline"; version: string }
  | { ok: false; reason: string };

export async function ensureDataset(): Promise<BootstrapResult> {
  const dbPath = getDbPath();
  const manifestPath = getLocalManifestPath();
  const dbExists = existsSync(dbPath);

  const accessKey = process.env.MCPASSURE_R2_ACCESS_KEY_ID;
  const secretKey = process.env.MCPASSURE_R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.MCPASSURE_R2_ENDPOINT;

  if (!accessKey || !secretKey || !endpoint) {
    if (dbExists) {
      log("Credenciais R2 ausentes — usando cache local existente.");
      return { ok: true, action: "skipped_offline", version: "local" };
    }
    return {
      ok: false,
      reason:
        "Cache local inexistente e credenciais R2 ausentes. Configure MCPASSURE_R2_ACCESS_KEY_ID, MCPASSURE_R2_SECRET_ACCESS_KEY e MCPASSURE_R2_ENDPOINT.",
    };
  }

  const client = new AwsClient({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    service: "s3",
    region: "auto",
  });

  let remoteManifest: Manifest;
  try {
    remoteManifest = await fetchManifest(client, endpoint);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (dbExists) {
      log(`Falha ao buscar manifest remoto (${reason}). Usando cache local.`);
      return { ok: true, action: "skipped_offline", version: "stale" };
    }
    return { ok: false, reason: `Sem cache e sem rede: ${reason}` };
  }

  if (dbExists && existsSync(manifestPath)) {
    try {
      const localManifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
      if (localManifest.version === remoteManifest.version) {
        return { ok: true, action: "up_to_date", version: localManifest.version };
      }
      log(
        `Versão local (${localManifest.version}) difere de remota (${remoteManifest.version}). Atualizando.`
      );
    } catch {
      log("Manifest local corrompido. Re-baixando.");
    }
  }

  try {
    await downloadAndVerify(client, endpoint, remoteManifest, dbPath);
    await writeFile(manifestPath, JSON.stringify(remoteManifest, null, 2));
    return { ok: true, action: "downloaded", version: remoteManifest.version };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const tmp = `${dbPath}.download`;
    if (existsSync(tmp)) {
      await unlink(tmp).catch(() => {});
    }
    if (dbExists) {
      log(`Falha no download (${reason}). Mantendo cache anterior.`);
      return { ok: true, action: "skipped_offline", version: "stale" };
    }
    return { ok: false, reason };
  }
}
