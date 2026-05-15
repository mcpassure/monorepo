import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { ICnesRepository } from "../domain/repository.js";
import { TipoEstabelecimentoEnum } from "../tools/schemas.js";
import type {
  AnalisarCoberturaUfInputType,
  MapearRedeMunicipioInputType,
  PerfilEstabelecimentoInputType,
} from "./schemas.js";

const TIPOS_VALIDOS = TipoEstabelecimentoEnum.options;

export async function handlePerfilEstabelecimento(
  args: PerfilEstabelecimentoInputType,
  repo: ICnesRepository
): Promise<GetPromptResult> {
  const {
    codigo_cnes,
    incluir_profissionais,
    incluir_leitos,
    incluir_equipamentos,
    incluir_servicos,
  } = args;

  const { data: estData, _meta } = await repo.buscarPorCodigoCnes(codigo_cnes);

  if (!estData.encontrado || !estData.estabelecimento) {
    const msg =
      estData.mensagem ??
      `Código CNES ${codigo_cnes} não localizado no cache local. Última sincronização: ${_meta.competencia || "não realizada"}.`;
    return {
      messages: [{ role: "user", content: { type: "text", text: msg } }],
    };
  }

  const est = estData.estabelecimento;
  const partes: string[] = [
    `Estabelecimento: ${est.nomeFantasia || est.razaoSocial} (CNES: ${est.codigoCnes})`,
    `Tipo: ${est.tipo}`,
    `Natureza jurídica: ${est.naturezaJuridica}`,
    `Município: ${est.municipio}/${est.uf} (IBGE: ${est.codigoIbge})`,
    `Endereço: ${est.endereco}`,
    `Telefone: ${est.telefone ?? "não informado"}`,
    `Vínculo SUS: ${est.vinculoSus ? "Sim" : "Não"}`,
    `Gestão: ${est.gestao}`,
    `Competência: ${est.competencia}`,
  ];

  if (incluir_profissionais) {
    const { data } = await repo.listarProfissionais(codigo_cnes);
    partes.push(`Profissionais: ${data.total}`);
  }

  if (incluir_leitos) {
    const { data } = await repo.listarLeitos(codigo_cnes);
    partes.push(`Leitos: ${data.total}`);
  }

  if (incluir_equipamentos) {
    const { data } = await repo.listarEquipamentos(codigo_cnes);
    partes.push(`Equipamentos: ${data.total}`);
  }

  if (incluir_servicos) {
    const { data } = await repo.listarServicos(codigo_cnes);
    const nomes = data.servicos.map((s) => s.descricao).slice(0, 10);
    partes.push(`Serviços oferecidos (${data.total}): ${nomes.join(", ") || "nenhum"}`);
  }

  partes.push(`\n_Fonte: DATASUS CNES · Competência ${_meta.competencia || "desconhecida"}_`);

  return {
    messages: [{ role: "user", content: { type: "text", text: partes.join("\n") } }],
  };
}

export async function handleMapearRedeMunicipio(
  args: MapearRedeMunicipioInputType,
  repo: ICnesRepository
): Promise<GetPromptResult> {
  const { municipio, uf, tipo_estabelecimento, limite } = args;

  const isIbgeCode = /^\d{6,7}$/.test(municipio);

  if (!isIbgeCode) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Para consultar a rede de saúde de "${municipio}", informe o código IBGE (6 ou 7 dígitos). Exemplo: São Paulo = 3550308. Consulte em: https://ibge.gov.br/explica/codigos-dos-municipios.php`,
          },
        },
      ],
    };
  }

  const tipoFiltro =
    tipo_estabelecimento && TIPOS_VALIDOS.includes(tipo_estabelecimento as never)
      ? (tipo_estabelecimento as (typeof TIPOS_VALIDOS)[number])
      : undefined;

  const { data, _meta } = await repo.buscarPorMunicipio({
    codigoIbge: municipio,
    tipo: tipoFiltro,
    limit: Math.min(limite, 100),
  });

  if (data.total === 0) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Nenhum estabelecimento encontrado para município IBGE ${municipio}${uf ? `/${uf}` : ""}${tipoFiltro ? ` do tipo ${tipoFiltro}` : ""}. Verifique se a UF foi sincronizada (npm run sync --uf <UF>).`,
          },
        },
      ],
    };
  }

  const contagens: Record<string, number> = {};
  const naturezas: Record<string, number> = {};

  for (const est of data.estabelecimentos) {
    contagens[est.tipo] = (contagens[est.tipo] ?? 0) + 1;
    naturezas[est.naturezaJuridica] = (naturezas[est.naturezaJuridica] ?? 0) + 1;
  }

  const tiposSumarizados = Object.entries(contagens)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, n]) => `  - ${tipo}: ${n}`)
    .join("\n");

  const naturezasSumarizadas = Object.entries(naturezas)
    .sort((a, b) => b[1] - a[1])
    .map(([nat, n]) => `  - ${nat}: ${n}`)
    .join("\n");

  const nomeMunicipio = data.estabelecimentos[0]?.municipio ?? `IBGE ${municipio}`;
  const ufMunicipio = data.estabelecimentos[0]?.uf ?? uf ?? "";

  const texto = [
    `Rede de saúde de ${nomeMunicipio}${ufMunicipio ? `/${ufMunicipio}` : ""} (IBGE: ${municipio})`,
    `Total encontrado: ${data.total}${limite < data.total ? ` (exibindo ${data.estabelecimentos.length})` : ""}`,
    "",
    "Por tipo:",
    tiposSumarizados,
    "",
    "Por natureza:",
    naturezasSumarizadas,
    "",
    `_Fonte: DATASUS CNES · Competência ${_meta.competencia || "desconhecida"}_`,
  ].join("\n");

  return {
    messages: [{ role: "user", content: { type: "text", text: texto } }],
  };
}

export async function handleAnalisarCoberturaUf(
  args: AnalisarCoberturaUfInputType,
  repo: ICnesRepository
): Promise<GetPromptResult> {
  const { uf, agrupar_por } = args;

  const resultados = await Promise.all(
    TIPOS_VALIDOS.map((tipo) =>
      repo
        .buscarPorTipo({ tipo, uf, limit: 100 })
        .then(({ data }) => ({ tipo, count: data.total, estabelecimentos: data.estabelecimentos }))
    )
  );

  const totalGeral = resultados.reduce((acc, r) => acc + r.count, 0);

  if (totalGeral === 0) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Nenhum estabelecimento encontrado para UF ${uf}. Execute npm run sync --uf ${uf} para sincronizar os dados.`,
          },
        },
      ],
    };
  }

  let linhasAgrupamento: string;

  if (agrupar_por === "tipo") {
    linhasAgrupamento = resultados
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((r) => `  - ${r.tipo}: ${r.count}`)
      .join("\n");
  } else if (agrupar_por === "natureza") {
    const naturezas: Record<string, number> = {};
    for (const r of resultados) {
      for (const est of r.estabelecimentos) {
        naturezas[est.naturezaJuridica] = (naturezas[est.naturezaJuridica] ?? 0) + 1;
      }
    }
    linhasAgrupamento = Object.entries(naturezas)
      .sort((a, b) => b[1] - a[1])
      .map(([nat, n]) => `  - ${nat}: ${n}`)
      .join("\n");
  } else {
    const esferas: Record<string, number> = {};
    for (const r of resultados) {
      for (const est of r.estabelecimentos) {
        const esfera = est.gestao || "Não informado";
        esferas[esfera] = (esferas[esfera] ?? 0) + 1;
      }
    }
    linhasAgrupamento = Object.entries(esferas)
      .sort((a, b) => b[1] - a[1])
      .map(([esf, n]) => `  - ${esf}: ${n}`)
      .join("\n");
  }

  const texto = [
    `Cobertura de estabelecimentos de saúde — UF: ${uf}`,
    `Total (amostra): ${totalGeral}`,
    `Agrupado por: ${agrupar_por}`,
    "",
    linhasAgrupamento,
    "",
    "_Nota: contagem baseada em amostra de até 100 registros por tipo._",
  ].join("\n");

  return {
    messages: [{ role: "user", content: { type: "text", text: texto } }],
  };
}
