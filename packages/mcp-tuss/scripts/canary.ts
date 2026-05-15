#!/usr/bin/env tsx
/**
 * Canary — verifica se a fonte ANS TUSS está acessível.
 * NÃO faz download do ZIP completo — apenas HEAD requests.
 *
 * Em dev local com proxy SSL (Norton, Zscaler): set MCPASSURE_INSECURE_TLS=1
 * Em CI (Linux GitHub Actions): TLS funciona sem configuração adicional.
 */
import { FetchHttpDownload } from "../src/utils/http.js";

const BASE_URL = "https://www.ans.gov.br/arquivos/extras/tiss";

async function findLatestVersion(
  client: FetchHttpDownload
): Promise<{ versao: string; size: number } | null> {
  const now = new Date();
  for (let delta = 0; delta <= 12; delta++) {
    const d = new Date(now.getFullYear(), now.getMonth() - delta, 1);
    const ver = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const url = `${BASE_URL}/Padrao_TISS_Representacao_de_Conceitos_em_Saude_${ver}.zip`;
    const r = await client.headCheck(url);
    if (r.ok) return { versao: ver, size: r.size ?? 0 };
  }
  return null;
}

async function main(): Promise<void> {
  if (process.env.MCPASSURE_INSECURE_TLS === "1") {
    process.stderr.write("[canary] AVISO: TLS inseguro ativado (MCPASSURE_INSECURE_TLS=1)\n");
  }

  process.stderr.write("[canary] Verificando fonte ANS TUSS...\n");

  const client = new FetchHttpDownload(0); // sem rate limit para canary

  const latest = await findLatestVersion(client);
  if (!latest) {
    process.stderr.write("[canary] FALHA: Nenhuma versão TUSS encontrada nos últimos 12 meses\n");
    process.exit(1);
  }

  const sizeMB = (latest.size / 1024 / 1024).toFixed(1);
  process.stderr.write(`[canary] OK: versão ${latest.versao} disponível (${sizeMB} MB)\n`);

  if (latest.size > 0 && latest.size < 50 * 1024 * 1024) {
    process.stderr.write(
      `[canary] AVISO: ZIP menor que 50 MB (${sizeMB} MB). Verifique se o arquivo é completo.\n`
    );
  }

  process.stdout.write(
    `${JSON.stringify({ status: "ok", versao: latest.versao, size_bytes: latest.size })}\n`
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[canary] ERRO: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
