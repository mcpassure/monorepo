import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IBularioRepository } from "../domain/repository.js";
import { getClassesTerapeuticasJson, SCOPE_MARKDOWN, TARJAS_JSON } from "./handlers.js";

export function registerResources(server: McpServer, repository: IBularioRepository): void {
  server.registerResource(
    "bulario://tarjas",
    "bulario://tarjas",
    {
      title: "Taxonomia de Tarjas ANVISA",
      description:
        "Taxonomia regulatória de tarjas (RDC 357/2020, Portaria 344/98). " +
        "Lista todas as categorias de controle de venda de medicamentos no Brasil.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "bulario://tarjas",
          mimeType: "application/json",
          text: TARJAS_JSON,
        },
      ],
    })
  );

  server.registerResource(
    "bulario://classes_terapeuticas",
    "bulario://classes_terapeuticas",
    {
      title: "Classes Terapêuticas Indexadas",
      description:
        "Lista das principais classes terapêuticas indexadas no Bulário Eletrônico ANVISA.",
      mimeType: "application/json",
    },
    async () => {
      const json = await getClassesTerapeuticasJson(repository);
      return {
        contents: [
          {
            uri: "bulario://classes_terapeuticas",
            mimeType: "application/json",
            text: json,
          },
        ],
      };
    }
  );

  server.registerResource(
    "bulario://scope",
    "bulario://scope",
    {
      title: "Escopo do MCP (PT/EN)",
      description:
        "Escopo do MCP (PT/EN): o que faz, o que não faz, disclaimer regulatório " +
        "e atenção especial a Tarja Preta (Portaria 344/98).",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "bulario://scope",
          mimeType: "text/markdown",
          text: SCOPE_MARKDOWN,
        },
      ],
    })
  );
}
