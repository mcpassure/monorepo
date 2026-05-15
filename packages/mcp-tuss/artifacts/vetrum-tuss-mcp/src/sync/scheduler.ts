import type { Database } from "better-sqlite3";
import { findCorrelacaoUrl } from "./downloader.js";
import { ingestAll } from "./ingestor.js";
import { ANS_URLS } from "../constants.js";

export async function checkAndSync(db: Database): Promise<void> {
  console.log("[scheduler] Verificando nova versão da correlação TUSS-ROL...");

  const currentVersionRow = db
    .prepare("SELECT versao FROM sincronizacao_versoes WHERE tabela = 'rol_correlacao'")
    .get() as { versao: string } | undefined;

  const currentVersion = currentVersionRow?.versao ?? null;

  const latestUrl = await findCorrelacaoUrl(ANS_URLS.PAGINA_ROL);
  if (!latestUrl) {
    console.log("[scheduler] Não foi possível detectar nova versão. Mantendo versão atual.");
    return;
  }

  const latestVersionMatch = latestUrl.match(/TUSS(\d+)/i);
  const latestVersion = latestVersionMatch ? latestVersionMatch[1] : null;

  if (currentVersion && latestVersion && currentVersion === latestVersion) {
    console.log(`[scheduler] Versão atual (${currentVersion}) já é a mais recente. Nenhuma ação necessária.`);
    return;
  }

  console.log(
    `[scheduler] Nova versão detectada: ${latestVersion ?? "desconhecida"} (atual: ${currentVersion ?? "nenhuma"}). Iniciando sincronização...`
  );
  await ingestAll(db);
}
