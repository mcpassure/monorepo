import { createWriteStream, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as unzipper from "unzipper";
import type { TussRow } from "../domain/types.js";
import type { HttpDownload } from "../utils/http.js";
import { parseXlsxBuffer } from "./xlsx-parser.js";

const BASE_URL = "https://www.ans.gov.br/arquivos/extras/tiss";

// Regex candidates for each table — cascata, sem regex única (R4)
const TUSS22_CANDIDATES = [
  /TUSS 22.*\.xlsx$/i,
  /TUSS22.*\.xlsx$/i,
  /PROCEDIMENTOS.*EVENTOS.*\.xlsx$/i,
  /Tab 22.*\.xlsx$/i,
];

const TUSS20_CANDIDATES = [
  /TUSS 20.*Medicamentos.*\.xlsx$/i,
  /TUSS20.*\.xlsx$/i,
  /Medicamentos.*VERS[AÃ]O.*\.xlsx$/i,
];

const TUSS18_CANDIDATES = [/TUSS 18.*\.xlsx$/i, /TUSS18.*\.xlsx$/i, /DI[AÁ]RIAS.*TAXAS.*\.xlsx$/i];

function matchesCandidates(name: string, candidates: RegExp[]): boolean {
  return candidates.some((re) => re.test(name));
}

async function probeLatestVersion(client: HttpDownload): Promise<string> {
  const now = new Date();
  const candidates: string[] = [];
  for (let delta = 0; delta <= 12; delta++) {
    const d = new Date(now.getFullYear(), now.getMonth() - delta, 1);
    candidates.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  for (const ver of candidates) {
    const url = `${BASE_URL}/Padrao_TISS_Representacao_de_Conceitos_em_Saude_${ver}.zip`;
    const r = await client.headCheck(url);
    if (r.ok) return ver;
  }
  throw new Error("Could not find any available TUSS ZIP version");
}

async function downloadToFile(client: HttpDownload, url: string, destPath: string): Promise<void> {
  const stream = await client.getStream(url);
  return new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(destPath);
    let downloaded = 0;
    stream.on("data", (chunk: Buffer) => {
      downloaded += chunk.length;
      if (downloaded % (50 * 1024 * 1024) < (chunk.length || 1)) {
        process.stderr.write(
          `[tuss-source] Baixado: ${(downloaded / 1024 / 1024).toFixed(0)} MB\n`
        );
      }
    });
    stream.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    stream.on("error", reject);
  });
}

export type TussExtractResult = {
  versao: string;
  tuss22: TussRow[];
  tuss20: TussRow[];
  tuss18: TussRow[];
};

export async function extractTussData(
  client: HttpDownload,
  versao?: string
): Promise<TussExtractResult> {
  const ver = versao ?? (await probeLatestVersion(client));
  const url = `${BASE_URL}/Padrao_TISS_Representacao_de_Conceitos_em_Saude_${ver}.zip`;
  const tmpPath = join(tmpdir(), `tuss_${ver}_${Date.now()}.zip`);

  process.stderr.write(`[tuss-source] Downloading ZIP versão ${ver} from ${url}\n`);
  process.stderr.write(`[tuss-source] Salvando em: ${tmpPath}\n`);

  try {
    await downloadToFile(client, url, tmpPath);
    process.stderr.write("[tuss-source] Download completo. Extraindo planilhas...\n");

    const tuss22Buffers: Buffer[] = [];
    const tuss20Buffers: Buffer[] = [];
    const tuss18Buffers: Buffer[] = [];

    const directory = await unzipper.Open.file(tmpPath);
    for (const file of directory.files) {
      const name = file.path;
      if (file.type !== "File") continue;

      if (matchesCandidates(name, TUSS22_CANDIDATES) && !name.includes("PARTE_")) {
        process.stderr.write(`[tuss-source] Extraindo TUSS 22: ${name}\n`);
        tuss22Buffers.push(await file.buffer());
      } else if (matchesCandidates(name, TUSS20_CANDIDATES) && !name.includes("PARTE_")) {
        process.stderr.write(`[tuss-source] Extraindo TUSS 20: ${name}\n`);
        tuss20Buffers.push(await file.buffer());
      } else if (matchesCandidates(name, TUSS18_CANDIDATES) && !name.includes("PARTE_")) {
        process.stderr.write(`[tuss-source] Extraindo TUSS 18: ${name}\n`);
        tuss18Buffers.push(await file.buffer());
      }
    }

    if (tuss22Buffers.length === 0) throw new Error(`TUSS 22 XLSX not found in ZIP versão ${ver}`);

    process.stderr.write("[tuss-source] Parseando planilhas...\n");

    const tuss22 = parseXlsxBuffer(tuss22Buffers[0]);
    const tuss20 = tuss20Buffers.length > 0 ? parseXlsxBuffer(tuss20Buffers[0]) : [];
    const tuss18 = tuss18Buffers.length > 0 ? parseXlsxBuffer(tuss18Buffers[0]) : [];

    process.stderr.write(
      `[tuss-source] Parsed: TUSS22=${tuss22.length}, TUSS20=${tuss20.length}, TUSS18=${tuss18.length}\n`
    );

    return { versao: ver, tuss22, tuss20, tuss18 };
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
