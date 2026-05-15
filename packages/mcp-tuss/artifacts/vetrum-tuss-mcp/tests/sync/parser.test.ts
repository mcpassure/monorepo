import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseCorrelacaoTussRol, parseTabelaTuss } from "../../src/sync/parser.js";

async function buildCorrelacaoBuffer(
  rows: Array<Record<string, string | number | boolean>>
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Correlação");

  // Header row at row 8 (data starts row 9)
  ws.getRow(8).values = [
    "",
    "Código TUSS",
    "Descrição TUSS",
    "Correlação",
    "Procedimento ROL",
    "RN Origem",
    "Vigência",
    "OD",
    "AMB",
    "HCO",
    "HSO",
    "PAC",
    "DUT",
    "Subgrupo",
    "Grupo",
    "Capítulo",
  ];

  rows.forEach((r, i) => {
    ws.getRow(9 + i).values = [
      "",
      r.codigo,
      r.descricao,
      r.correlacao,
      r.procedimento_rol ?? "",
      r.rn_origem ?? "",
      r.vigencia ?? "",
      r.od ? "SIM" : "",
      r.amb ? "SIM" : "",
      r.hco ? "SIM" : "",
      r.hso ? "SIM" : "",
      r.pac ? "SIM" : "",
      r.tem_dut ? "SIM" : "",
      r.subgrupo ?? "",
      r.grupo ?? "",
      r.capitulo ?? "",
    ];
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildTabelaBuffer(
  rows: Array<{ codigo: string; descricao: string }>
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tabela");

  ws.getRow(1).values = ["", "Código", "Descrição"];
  rows.forEach((r, i) => {
    ws.getRow(2 + i).values = ["", r.codigo, r.descricao];
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parseCorrelacaoTussRol", () => {
  it("parseia linha com correlação SIM e segmentos corretos", async () => {
    const buffer = await buildCorrelacaoBuffer([
      {
        codigo: "10101012",
        descricao: "Consulta médica",
        correlacao: "SIM",
        procedimento_rol: "CONSULTA MÉDICA",
        rn_origem: "RN 465/2021",
        vigencia: "02/01/2022",
        od: false,
        amb: true,
        hco: true,
        hso: true,
        pac: true,
        tem_dut: false,
        subgrupo: "CONSULTAS",
        grupo: "PROCEDIMENTOS GERAIS",
        capitulo: "PROCEDIMENTOS GERAIS",
      },
    ]);

    const rows = await parseCorrelacaoTussRol(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      codigo: "10101012",
      correlacao: "SIM",
      amb: true,
      od: false,
    });
  });

  it("parseia linha com correlação NÃO", async () => {
    const buffer = await buildCorrelacaoBuffer([
      {
        codigo: "40101015",
        descricao: "Colonoscopia com biópsias",
        correlacao: "NÃO",
        od: false,
        amb: false,
        hco: false,
        hso: false,
        pac: false,
        tem_dut: false,
      },
    ]);

    const rows = await parseCorrelacaoTussRol(buffer);
    expect(rows[0].correlacao).toBe("NÃO");
  });

  it("ignora linhas sem código de 8 dígitos", async () => {
    const buffer = await buildCorrelacaoBuffer([
      {
        codigo: "INVALIDO",
        descricao: "Linha inválida",
        correlacao: "SIM",
        od: false,
        amb: false,
        hco: false,
        hso: false,
        pac: false,
        tem_dut: false,
      },
      {
        codigo: "10101012",
        descricao: "Consulta médica",
        correlacao: "SIM",
        od: false,
        amb: true,
        hco: true,
        hso: true,
        pac: true,
        tem_dut: false,
      },
    ]);

    const rows = await parseCorrelacaoTussRol(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0].codigo).toBe("10101012");
  });

  it("parseia flag DUT corretamente", async () => {
    const buffer = await buildCorrelacaoBuffer([
      {
        codigo: "40301370",
        descricao: "Ressonância magnética",
        correlacao: "SIM",
        od: false,
        amb: true,
        hco: true,
        hso: true,
        pac: false,
        tem_dut: true,
      },
    ]);

    const rows = await parseCorrelacaoTussRol(buffer);
    expect(rows[0].tem_dut).toBe(true);
  });

  it("retorna array vazio para planilha sem dados válidos", async () => {
    const buffer = await buildCorrelacaoBuffer([]);
    const rows = await parseCorrelacaoTussRol(buffer);
    expect(rows).toHaveLength(0);
  });
});

describe("parseTabelaTuss", () => {
  it("parseia tabela simples com código e descrição", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "10101012", descricao: "Consulta médica" },
      { codigo: "40301370", descricao: "Ressonância magnética" },
    ]);

    const rows = await parseTabelaTuss(buffer, "22");
    expect(rows).toHaveLength(2);
    expect(rows[0].codigo).toBe("10101012");
    expect(rows[1].descricao).toBe("Ressonância magnética");
  });

  it("ignora linhas com código inválido", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "INVALIDO", descricao: "Linha inválida" },
      { codigo: "10101012", descricao: "Consulta médica" },
    ]);

    const rows = await parseTabelaTuss(buffer, "22");
    expect(rows).toHaveLength(1);
    expect(rows[0].codigo).toBe("10101012");
  });

  it("aceita tabela 19 (materiais)", async () => {
    const buffer = await buildTabelaBuffer([
      { codigo: "98765432", descricao: "Parafuso de titânio" },
    ]);

    const rows = await parseTabelaTuss(buffer, "19");
    expect(rows).toHaveLength(1);
  });
});
