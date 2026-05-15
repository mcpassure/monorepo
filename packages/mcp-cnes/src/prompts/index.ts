import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICnesRepository } from "../domain/repository.js";
import {
  handleAnalisarCoberturaUf,
  handleMapearRedeMunicipio,
  handlePerfilEstabelecimento,
} from "./handlers.js";
import {
  AnalisarCoberturaUfInput,
  MapearRedeMunicipioInput,
  PerfilEstabelecimentoInput,
} from "./schemas.js";

export function registerPrompts(server: McpServer, repo: ICnesRepository): void {
  server.registerPrompt(
    "perfil_estabelecimento",
    {
      title: "Perfil Completo de Estabelecimento CNES",
      description:
        "Consolida perfil completo de um estabelecimento CNES: dados cadastrais, profissionais, leitos, equipamentos e serviços.",
      argsSchema: PerfilEstabelecimentoInput.shape,
    },
    (args) => handlePerfilEstabelecimento(args, repo)
  );

  server.registerPrompt(
    "mapear_rede_municipio",
    {
      title: "Mapa da Rede de Saúde Municipal",
      description:
        "Mapeia a rede de saúde de um município, agrupando estabelecimentos por tipo e natureza jurídica.",
      argsSchema: MapearRedeMunicipioInput.shape,
    },
    (args) => handleMapearRedeMunicipio(args, repo)
  );

  server.registerPrompt(
    "analisar_cobertura_uf",
    {
      title: "Análise de Cobertura por UF",
      description:
        "Analisa a cobertura de estabelecimentos de saúde em uma UF, agrupando por tipo, natureza ou esfera administrativa.",
      argsSchema: AnalisarCoberturaUfInput.shape,
    },
    (args) => handleAnalisarCoberturaUf(args, repo)
  );
}
