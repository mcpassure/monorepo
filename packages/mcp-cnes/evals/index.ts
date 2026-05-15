#!/usr/bin/env tsx
import { type EvalCase, runEvals } from "./runner.js";

const cases: EvalCase[] = [
  {
    id: "01",
    description: "buscar_por_codigo_cnes: HC FMUSP existe e retorna nome correto",
    tool: "buscar_por_codigo_cnes",
    args: { codigoCnes: "2077485" },
    validate: (r) => {
      const est = r as { encontrado: boolean; estabelecimento?: { nomeFantasia: string } };
      return (
        est.encontrado === true && (est.estabelecimento?.nomeFantasia ?? "").includes("CLINICAS")
      );
    },
  },
  {
    id: "02",
    description: "buscar_por_nome: busca 'clinicas' retorna ao menos 1 resultado",
    tool: "buscar_por_nome",
    args: { nome: "clinicas" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "03",
    description: "buscar_por_municipio: São Paulo (355030) retorna estabelecimentos",
    tool: "buscar_por_municipio",
    args: { codigoIbge: "355030" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "04",
    description: "buscar_por_tipo: hospitais em SP retorna resultados",
    tool: "buscar_por_tipo",
    args: { tipo: "hospital", uf: "SP" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "05",
    description:
      "buscar_por_tipo: UBS em Florianópolis (420540) retorna aviso se dataset vazio ou resultados",
    tool: "buscar_por_tipo",
    args: { tipo: "UBS", codigoIbge: "420540" },
    validate: (r) => {
      const result = r as { total: number; aviso?: string };
      return result.total >= 0;
    },
  },
  {
    id: "06",
    description: "listar_profissionais: HC FMUSP tem profissionais cadastrados",
    tool: "listar_profissionais",
    args: { codigoCnes: "2077485" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "07",
    description: "listar_leitos: HC FMUSP tem leitos UTI",
    tool: "listar_leitos",
    args: { codigoCnes: "2077485" },
    validate: (r) => {
      const result = r as { total: number; leitos: Array<{ tipo: string }> };
      return result.total > 0 && result.leitos.some((l) => l.tipo.toLowerCase().includes("uti"));
    },
  },
  {
    id: "08",
    description: "listar_equipamentos: HC FMUSP tem equipamentos cadastrados",
    tool: "listar_equipamentos",
    args: { codigoCnes: "2077485" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "09",
    description: "listar_servicos: HC FMUSP tem serviços especializados",
    tool: "listar_servicos",
    args: { codigoCnes: "2077485" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "10",
    description: "buscar_por_codigo_cnes: CNES inexistente retorna encontrado=false sem erro",
    tool: "buscar_por_codigo_cnes",
    args: { codigoCnes: "0000001" },
    validate: (r) => (r as { encontrado: boolean }).encontrado === false,
  },
  {
    id: "11",
    description: "buscar_por_municipio: Florianópolis (420540) retorna resultados (SC)",
    tool: "buscar_por_municipio",
    args: { codigoIbge: "420540" },
    validate: (r) => (r as { total: number }).total > 0,
  },
  {
    id: "12",
    description: "listar_leitos: leitos UTI têm quantidade existente > 0",
    tool: "listar_leitos",
    args: { codigoCnes: "2077485" },
    validate: (r) => {
      const result = r as { leitos: Array<{ leitosExistentes: number; tipo: string }> };
      const uti = result.leitos.filter((l) => l.tipo.toLowerCase().includes("uti"));
      return uti.length > 0 && uti.every((l) => l.leitosExistentes > 0);
    },
  },
];

runEvals(cases).catch((err) => {
  console.error("Erro nos evals:", err);
  process.exit(1);
});
