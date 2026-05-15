/**
 * canary.ts — v2.0
 *
 * Valida que o CSV dados.anvisa.gov.br está acessível e contém campos esperados.
 * Substituição do canary Playwright (v1.0) que dependia da API ANVISA bloqueada por Cloudflare.
 *
 * Executado por .github/workflows/canary.yml (npm run canary).
 * Exit 0 em sucesso, exit 1 em divergência detectada.
 */

const CSV_URL = "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv";
const TIMEOUT_MS = 60_000;
const MIN_SIZE_BYTES = 1_000_000; // 1MB mínimo esperado

const EXPECTED_COLUMNS = [
  "TIPO_PRODUTO",
  "NOME_PRODUTO",
  "DATA_FINALIZACAO_PROCESSO",
  "CATEGORIA_REGULATORIA",
  "NUMERO_REGISTRO_PRODUTO",
  "DATA_VENCIMENTO_REGISTRO",
  "NUMERO_PROCESSO",
  "CLASSE_TERAPEUTICA",
  "EMPRESA_DETENTORA_REGISTRO",
  "SITUACAO_REGISTRO",
  "PRINCIPIO_ATIVO",
];

async function main(): Promise<void> {
  process.stderr.write("[canary] v2.0 — Validando CSV dados.anvisa.gov.br...\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let buf: ArrayBuffer;
  try {
    const resp = await fetch(CSV_URL, {
      signal: ctrl.signal,
      headers: { "User-Agent": "mcpassure/mcp-anvisa-bulario canary" },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }
    buf = await resp.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[canary] FAIL — não foi possível baixar CSV: ${msg}\n`);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }

  const size = buf.byteLength;
  process.stderr.write(`[canary] CSV baixado: ${(size / 1024 / 1024).toFixed(2)} MB\n`);

  if (size < MIN_SIZE_BYTES) {
    process.stderr.write(
      `[canary] FAIL — CSV suspeitosamente pequeno: ${size} bytes (esperado > ${MIN_SIZE_BYTES})\n`
    );
    process.exit(1);
  }

  // Parse header (Latin1)
  const bytes = new Uint8Array(buf);
  let header = "";
  for (let i = 0; i < bytes.length && i < 2000; i++) {
    const ch = String.fromCharCode(bytes[i]);
    if (ch === "\n" || ch === "\r") break;
    header += ch;
  }

  const columns = header.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
  process.stderr.write(`[canary] Colunas detectadas (${columns.length}): ${columns.join(", ")}\n`);

  const drifts: string[] = [];
  for (const expected of EXPECTED_COLUMNS) {
    if (!columns.includes(expected)) {
      drifts.push(`Coluna esperada '${expected}' não encontrada no header do CSV`);
    }
  }

  if (drifts.length > 0) {
    process.stderr.write(`[canary] FAIL — ${drifts.length} drift(s) detectado(s):\n`);
    for (const d of drifts) {
      process.stderr.write(`  - ${d}\n`);
    }
    process.exit(1);
  }

  process.stderr.write(
    `[canary] OK — CSV acessível (${(size / 1024 / 1024).toFixed(2)} MB), ` +
      `${columns.length} colunas validadas. Nenhum drift detectado.\n`
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  process.stderr.write(`[canary] ERROR — ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
