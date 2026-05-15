#!/usr/bin/env node
/**
 * Canário diário — valida que as fontes upstream não mudaram estrutura.
 * Exit code 0: tudo OK
 * Exit code 1: drift detectado (estrutura mudou)
 * Exit code 2: rede offline / fonte indisponível
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SCHEMAS_DIR = join(ROOT, "src", "sources", "schemas");

const USER_AGENT = "mcpassure-mcp-tuss/1.1 canary (https://github.com/mcpassure/mcp-tuss)";

interface CanaryResult {
  terminologia: "TUSS" | "Rol ANS" | "CBHPM";
  status: "ok" | "drift" | "offline" | "error";
  detail: string;
  latency_ms: number;
}

async function checkTuss(): Promise<CanaryResult> {
  const start = Date.now();
  const schema = JSON.parse(
    readFileSync(join(SCHEMAS_DIR, "tuss_codesystem.v1.json"), "utf-8")
  );

  try {
    const url = "https://terminologia.saude.gov.br/fhir/CodeSystem/BRCBHPMTUSS";
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/fhir+json, application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        terminologia: "TUSS",
        status: "offline",
        detail: `HTTP ${res.status} ${res.statusText}`,
        latency_ms,
      };
    }

    const data = await res.json() as Record<string, unknown>;

    // Validar campos obrigatórios
    const missingFields: string[] = [];
    for (const field of schema.required_fields as string[]) {
      if (!(field in data)) missingFields.push(field);
    }

    if (missingFields.length > 0) {
      return {
        terminologia: "TUSS",
        status: "drift",
        detail: `Campos ausentes no CodeSystem FHIR: ${missingFields.join(", ")}`,
        latency_ms,
      };
    }

    const resourceType = data["resourceType"] as string;
    if (resourceType !== schema.expected_resource_type) {
      return {
        terminologia: "TUSS",
        status: "drift",
        detail: `resourceType esperado "${schema.expected_resource_type}", obtido "${resourceType}"`,
        latency_ms,
      };
    }

    const concepts = data["concept"] as unknown[];
    if (!Array.isArray(concepts) || concepts.length < (schema.min_concepts as number)) {
      return {
        terminologia: "TUSS",
        status: "drift",
        detail: `Número de concepts insuficiente: ${Array.isArray(concepts) ? concepts.length : "N/A"} < ${schema.min_concepts}`,
        latency_ms,
      };
    }

    return {
      terminologia: "TUSS",
      status: "ok",
      detail: `CodeSystem OK — ${concepts.length} concepts, version: ${data["version"] ?? "desconhecida"}`,
      latency_ms,
    };
  } catch (err) {
    return {
      terminologia: "TUSS",
      status: err instanceof Error && err.name === "TimeoutError" ? "offline" : "error",
      detail: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    };
  }
}

async function checkRolAns(): Promise<CanaryResult> {
  const start = Date.now();
  const schema = JSON.parse(
    readFileSync(join(SCHEMAS_DIR, "rol_ans_planilha.v1.json"), "utf-8")
  );

  try {
    const pageUrl =
      "https://www.gov.br/ans/pt-br/acesso-a-informacao/participacao-da-sociedade/atualizacao-do-rol-de-procedimentos";

    const res = await fetch(pageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });

    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        terminologia: "Rol ANS",
        status: "offline",
        detail: `Página ANS retornou HTTP ${res.status}`,
        latency_ms,
      };
    }

    const html = await res.text();
    const pattern = new RegExp(schema.source_url_pattern as string, "i");
    const found = pattern.test(html);

    if (!found) {
      return {
        terminologia: "Rol ANS",
        status: "drift",
        detail: `Arquivo de correlação TUSS-ROL não encontrado na página ANS (padrão: ${schema.source_url_pattern})`,
        latency_ms,
      };
    }

    return {
      terminologia: "Rol ANS",
      status: "ok",
      detail: "Arquivo de correlação TUSS-ROL encontrado na página ANS",
      latency_ms,
    };
  } catch (err) {
    return {
      terminologia: "Rol ANS",
      status: err instanceof Error && err.name === "TimeoutError" ? "offline" : "error",
      detail: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    };
  }
}

async function checkCbhpm(): Promise<CanaryResult> {
  const start = Date.now();
  const schema = JSON.parse(
    readFileSync(join(SCHEMAS_DIR, "cbhpm_amb.v1.json"), "utf-8")
  );

  try {
    const res = await fetch(schema.probe_url as string, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });

    const latency_ms = Date.now() - start;

    if (res.status !== (schema.expected_http_status as number)) {
      return {
        terminologia: "CBHPM",
        status: res.status >= 500 ? "offline" : "drift",
        detail: `Site AMB retornou HTTP ${res.status} (esperado ${schema.expected_http_status})`,
        latency_ms,
      };
    }

    return {
      terminologia: "CBHPM",
      status: "ok",
      detail: `Site AMB acessível (HTTP ${res.status})`,
      latency_ms,
    };
  } catch (err) {
    return {
      terminologia: "CBHPM",
      status: "offline",
      detail: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    };
  }
}

async function main(): Promise<void> {
  console.log("[canary] Iniciando validação upstream...");
  console.log(`[canary] Data: ${new Date().toISOString()}`);

  const results = await Promise.allSettled([
    checkTuss(),
    checkRolAns(),
    checkCbhpm(),
  ]);

  let hasDrift = false;
  let hasOffline = false;
  let hasError = false;

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[canary] ERRO inesperado:", result.reason);
      hasError = true;
      continue;
    }

    const r = result.value;
    const icon = r.status === "ok" ? "✓" : r.status === "offline" ? "✗" : "⚠";
    console.log(
      `[canary] ${icon} [${r.terminologia}] ${r.status.toUpperCase()} — ${r.detail} (${r.latency_ms}ms)`
    );

    if (r.status === "drift") hasDrift = true;
    if (r.status === "offline") hasOffline = true;
    if (r.status === "error") hasError = true;
  }

  if (hasError) {
    console.error("[canary] FALHA: erro interno no canário");
    process.exit(1);
  }

  if (hasOffline && !hasDrift) {
    console.warn("[canary] AVISO: uma ou mais fontes offline (label: upstream-down)");
    process.exit(2);
  }

  if (hasDrift) {
    console.error("[canary] DRIFT DETECTADO: estrutura de terminologia mudou (label: upstream-drift)");
    process.exit(1);
  }

  console.log("[canary] OK — todas as fontes estão estáveis");
  process.exit(0);
}

main();
