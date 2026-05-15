/**
 * Utilitários de teste compartilhados entre `tests/`, `evals/` e `integration-tests/`.
 *
 * O `McpServer` do SDK oficial mantém `_registeredTools` como membro privado, então
 * não podemos usar intersection types diretos (TypeScript reduz pra `never` quando
 * o mesmo nome aparece como `private` em um lado e `public` no outro). Por isso
 * acessamos o registry via cast `unknown` localizado nas duas funções abaixo.
 *
 * Esse atalho fica restrito ao escopo de testes — não usar em código de produção.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * `_meta` retornado pelos handlers que seguem o pattern Repository com `ResponseWithMeta`.
 */
export type ToolResultMeta = {
  data_da_base?: string;
  fonte?: string;
  defasagem_dias?: number;
  modo?: "online" | "cache_local";
  status?: "ok" | "stale";
};

/**
 * Shape genérico de retorno de uma tool MCP — espelha o que o SDK monta.
 * Campos são opcionais porque tools de sucesso retornam `structuredContent`,
 * enquanto tools de erro retornam `isError + content`.
 *
 * Bulário tools seguem envelope `{ data: T, _meta }`. Use `getToolData<T>(result)`
 * para extrair o payload tipado.
 */
export type McpToolResult = {
  isError?: boolean;
  content?: Array<{ type: string; text: string }>;
  structuredContent?: {
    data?: unknown;
    _meta?: ToolResultMeta;
  } & Record<string, unknown>;
};

/**
 * Entrada do registry interno do MCP SDK.
 */
type RegisteredTool = {
  handler: (args: Record<string, unknown>) => Promise<McpToolResult>;
  inputSchema?: {
    safeParse: (args: unknown) => {
      success: boolean;
      error?: { message: string };
    };
  };
  annotations?: Record<string, unknown>;
};

/**
 * Shape interno que sabemos existir em `McpServer` em runtime.
 * Standalone (não intersection com McpServer) pra evitar conflito com o membro `private`.
 */
type ServerInternals = {
  _registeredTools?: Record<string, RegisteredTool>;
};

function getInternals(server: McpServer): ServerInternals {
  return server as unknown as ServerInternals;
}

/**
 * Chama uma tool registrada diretamente, sem passar pela camada de transport.
 * Valida via `inputSchema` se a tool tiver um, retornando `isError` em caso de falha de validação.
 *
 * @throws se a tool não estiver registrada
 */
export async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  const tool = getInternals(server)._registeredTools?.[name];
  if (!tool) throw new Error(`Tool not registered: ${name}`);

  if (tool.inputSchema) {
    const validation = tool.inputSchema.safeParse(args);
    if (!validation.success) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: validation.error?.message ?? "validation failed",
          },
        ],
      };
    }
  }

  return tool.handler(args);
}

/**
 * Acessa o registry interno (para verificações de annotations etc).
 * Retorna objeto vazio se nenhuma tool estiver registrada.
 */
export function getRegisteredTools(server: McpServer): Record<string, RegisteredTool> {
  return getInternals(server)._registeredTools ?? {};
}

/**
 * Extrai o payload `data` de um `McpToolResult` tipado pelo shape `T`.
 *
 * Bulário tools retornam `structuredContent = { data: T, _meta: Meta }`. Esse helper
 * abstrai o acesso a `result.structuredContent?.data` com cast pra `T`. Retorna
 * `undefined` se o result for de erro ou ausente.
 *
 * @example
 *   type Lista = { medicamentos: Array<{ nomeProduto: string }>, total: number, pagina: number };
 *   const data = getToolData<Lista>(result);
 *   if (data) expect(data.medicamentos.length).toBe(1);
 */
export function getToolData<T>(result: McpToolResult): T | undefined {
  return result.structuredContent?.data as T | undefined;
}
