/**
 * http.ts — stub (v2.0)
 *
 * O HttpClient baseado em Playwright foi removido em v2.0.
 * A fonte de dados agora é o CSV dados.anvisa.gov.br via SQLite local.
 *
 * Este arquivo existe apenas para backward compatibility de imports.
 * Será removido em v2.1.
 */

export interface HttpGet {
  get(path: string, params?: Record<string, string>): Promise<unknown>;
  close?(): Promise<void>;
}

/**
 * HttpClient stub — removido em v2.0.
 * Mantido apenas para evitar erros de import em código legado.
 * @deprecated Use BularioDatasetSource em vez de HttpClient.
 */
export class HttpClient implements HttpGet {
  // biome-ignore lint/suspicious/noExplicitAny: stub — aceita qualquer arg para compatibilidade
  constructor(..._args: any[]) {}

  get(_path: string, _params?: Record<string, string>): Promise<unknown> {
    return Promise.reject(
      new Error("HttpClient foi removido em v2.0. Use BularioDatasetSource (SQLite).")
    );
  }

  async close(): Promise<void> {}
}
