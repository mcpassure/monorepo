// Stub de fallback online — v1.1.1
//
// HISTÓRICO: nas versões 1.0 e 1.1 inicial, este módulo expunha um fallback REST
// ao endpoint `mobile-aceite.tcu.gov.br/mapa-da-saude/rest` quando o cache SQLite
// local estava vazio. Durante a validação do canário em 2026-05, descobriu-se:
//
//   1. O endpoint TCU usa `codUnidade` (ID interno do TCU), não o código CNES.
//      O fallback retornava 404 em todos os formatos (7 e 13 dígitos).
//   2. Mesmo se funcionasse, cobriria apenas 2 das 8 tools — as outras 6
//      (listar_leitos, listar_equipamentos, listar_profissionais, listar_servicos,
//      buscar_por_municipio, buscar_por_tipo) sempre exigiram o cache local.
//   3. A alternativa moderna oficial — API DEMAS (`apidadosabertos.saude.gov.br`)
//      — exige autenticação login+senha com cadastro de IP, incompatível com a
//      UX `npx -y @mcpassure/mcp-cnes` zero-config.
//
// Decisão v1.1.1: remover o fallback online. O caminho único e oficial é o
// FTP DATASUS via `npx @mcpassure/mcp-cnes sync`. Quando o cache está vazio,
// as tools retornam erro estruturado orientando o usuário a rodar sync.
//
// Roadmap v1.2: pre-built SQLite como GitHub Release artifact, eliminando a
// necessidade de blast CLI local para o caso 90% (consulta de leitura).

import type { EstabelecimentoOutput } from "../tools/schemas.js";

export class CacheVazioError extends Error {
  constructor(grupos: string[] = ["ST"]) {
    const gruposStr = grupos.join(" ");
    super(
      `Cache local vazio. Execute primeiro: npx -y @mcpassure/mcp-cnes sync --uf <UF> --grupos ${gruposStr}`
    );
    this.name = "CacheVazioError";
  }
}

/**
 * @deprecated v1.1.1 — fallback online removido. Use sync via FTP DATASUS.
 */
export async function buscarPorCodigoCnes(
  _codUnidade: string
): Promise<EstabelecimentoOutput | null> {
  throw new CacheVazioError(["ST"]);
}

/**
 * @deprecated v1.1.1 — fallback online removido. Use sync via FTP DATASUS.
 */
export async function buscarPorNomeFallback(
  _nome: string,
  _uf?: string,
  _limit = 10
): Promise<EstabelecimentoOutput[]> {
  throw new CacheVazioError(["ST"]);
}
