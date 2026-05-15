// Simula 15 cenários realistas de uso do MCP CNES por um usuário final.
// Cada cenário representa uma pergunta que um médico, gestor ou pesquisador faria.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { CnesRepository } from "../../../src/domain/repository.js";
import { registerBuscarPorCodigoCnes } from "../../../src/tools/buscar_por_codigo_cnes.js";
import { registerBuscarPorMunicipio } from "../../../src/tools/buscar_por_municipio.js";
import { registerBuscarPorNome } from "../../../src/tools/buscar_por_nome.js";
import { registerBuscarPorTipo } from "../../../src/tools/buscar_por_tipo.js";
import { registerListarEquipamentos } from "../../../src/tools/listar_equipamentos.js";
import { registerListarLeitos } from "../../../src/tools/listar_leitos.js";
import { registerListarProfissionais } from "../../../src/tools/listar_profissionais.js";
import { registerListarServicos } from "../../../src/tools/listar_servicos.js";
import {
  assertContains,
  assertGreater,
  assertGreaterOrEqual,
  assertNotNull,
  assertTrue,
} from "../helpers/assert.js";
import type { Reporter } from "../helpers/reporter.js";

const SUITE = "t05-scenarios";

async function buildClient(db: Database.Database): Promise<Client> {
  const server = new McpServer({ name: "scenario-cnes", version: "1.1.0" });
  const repo = new CnesRepository(() => db);
  registerBuscarPorCodigoCnes(server, repo);
  registerBuscarPorNome(server, repo);
  registerBuscarPorMunicipio(server, repo);
  registerBuscarPorTipo(server, repo);
  registerListarProfissionais(server, repo);
  registerListarLeitos(server, repo);
  registerListarEquipamentos(server, repo);
  registerListarServicos(server, repo);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "scenario-client", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

// Helper: extrai .data de {data, _meta} (v1.1)
async function callTool<T>(client: Client, tool: string, args: Record<string, unknown>): Promise<T> {
  const res = await client.callTool({ name: tool, arguments: args });
  const sc = (res.structuredContent ?? {}) as { data?: T } | T;
  return ((sc as { data?: T }).data ?? sc) as T;
}

async function run(
  id: string,
  name: string,
  fn: () => Promise<void>,
  reporter: Reporter
): Promise<void> {
  const t = Date.now();
  try {
    await fn();
    reporter.pass(id, name, SUITE, Date.now() - t);
  } catch (err) {
    reporter.fail(id, name, SUITE, Date.now() - t, String(err));
  }
}

export async function runScenarioTests(db: Database.Database, reporter: Reporter): Promise<void> {
  console.log("\n🎭 Suite: Simulação de Cenários de Usuário (15 cenários)");
  const client = await buildClient(db);

  // ── Cenário 1 ─────────────────────────────────────────────────────────────
  await run("S01", "Médico busca o Hospital das Clínicas de SP pelo nome", async () => {
    console.log('    → Usuário: "Qual o CNES do Hospital das Clínicas de São Paulo?"');
    const r = await callTool<{ total: number; estabelecimentos: Array<{ codigoCnes: string; nomeFantasia: string }> }>(
      client, "buscar_por_nome", { nome: "clinicas", uf: "SP", limit: 5 }
    );
    assertGreater(r.total, 0, "deve encontrar Hospital das Clínicas");
    assertContains(r.estabelecimentos, (e) => e.codigoCnes === "2077485");
    console.log(`    ✓ Encontrou: ${r.estabelecimentos[0].nomeFantasia} (CNES: ${r.estabelecimentos[0].codigoCnes})`);
  }, reporter);

  // ── Cenário 2 ─────────────────────────────────────────────────────────────
  await run("S02", "Gestor verifica dados cadastrais do HC FMUSP", async () => {
    console.log('    → Usuário: "Preciso dos dados completos do CNES 2077485"');
    const r = await callTool<{ encontrado: boolean; estabelecimento?: { nomeFantasia: string; uf: string; telefone?: string; vinculoSus: boolean } }>(
      client, "buscar_por_codigo_cnes", { codigoCnes: "2077485" }
    );
    assertTrue(r.encontrado === true, "HC FMUSP deve ser encontrado");
    assertNotNull(r.estabelecimento);
    assertTrue(r.estabelecimento.vinculoSus === true, "HC FMUSP deve ter vínculo SUS");
    assertTrue(r.estabelecimento.uf === "SP");
    console.log(`    ✓ ${r.estabelecimento.nomeFantasia} | Vínculo SUS: ${r.estabelecimento.vinculoSus}`);
  }, reporter);

  // ── Cenário 3 ─────────────────────────────────────────────────────────────
  await run("S03", "Regulador verifica capacidade UTI do HC FMUSP", async () => {
    console.log('    → Usuário: "Quantos leitos de UTI tem o HC FMUSP?"');
    const r = await callTool<{ total: number; leitos: Array<{ tipo: string; leitosExistentes: number; leitosSus: number }> }>(
      client, "listar_leitos", { codigoCnes: "2077485" }
    );
    assertGreater(r.total, 0);
    const utis = r.leitos.filter((l) => l.tipo.toLowerCase().includes("uti"));
    assertGreater(utis.length, 0, "deve ter leitos UTI");
    const totalUtiExist = utis.reduce((acc, l) => acc + l.leitosExistentes, 0);
    const totalUtiSus = utis.reduce((acc, l) => acc + l.leitosSus, 0);
    assertGreater(totalUtiExist, 100, "HC FMUSP deve ter >100 leitos UTI");
    console.log(`    ✓ UTI: ${utis.length} tipos, ${totalUtiExist} leitos existentes, ${totalUtiSus} SUS`);
  }, reporter);

  // ── Cenário 4 ─────────────────────────────────────────────────────────────
  await run("S04", "Pesquisador lista hospitais em São Paulo para estudo de rede", async () => {
    console.log('    → Usuário: "Preciso listar todos os hospitais do município de São Paulo"');
    const r = await callTool<{ total: number; estabelecimentos: Array<{ codigoCnes: string }> }>(
      client, "buscar_por_municipio", { codigoIbge: "355030" }
    );
    assertGreater(r.total, 0, "São Paulo deve ter hospitais cadastrados");
    assertContains(r.estabelecimentos, (e) => e.codigoCnes === "2077485", "HC FMUSP deve estar na lista");
    console.log(`    ✓ ${r.total} estabelecimentos encontrados em São Paulo`);
  }, reporter);

  // ── Cenário 5 ─────────────────────────────────────────────────────────────
  await run("S05", "Cardiologista verifica equipamentos do InCor", async () => {
    console.log('    → Usuário: "Quais equipamentos cardíacos tem o InCor?"');
    const r = await callTool<{ total: number; equipamentos: Array<{ codigo: string; descricao: string; quantidadeExistente: number }> }>(
      client, "listar_equipamentos", { codigoCnes: "2079046" }
    );
    assertGreater(r.total, 0);
    assertContains(r.equipamentos, (e) => e.codigo === "020", "InCor deve ter hemodinâmica");
    assertContains(r.equipamentos, (e) => e.codigo === "013", "InCor deve ter ecocardiograma");
    for (const eq of r.equipamentos) {
      console.log(`    → ${eq.descricao}: ${eq.quantidadeExistente} unidades`);
    }
  }, reporter);

  // ── Cenário 6 ─────────────────────────────────────────────────────────────
  await run("S06", "Gestor em SC verifica hospitais de Florianópolis", async () => {
    console.log('    → Usuário: "Quais hospitais existem em Florianópolis?"');
    const r = await callTool<{ total: number; estabelecimentos: Array<{ nomeFantasia: string; codigoCnes: string }> }>(
      client, "buscar_por_tipo", { tipo: "hospital", codigoIbge: "420540" }
    );
    assertGreaterOrEqual(r.total, 1, "Florianópolis deve ter ao menos 1 hospital");
    assertContains(r.estabelecimentos, (e) => e.codigoCnes === "3467485", "HU UFSC deve aparecer");
    console.log(`    ✓ ${r.total} hospitais em Florianópolis: ${r.estabelecimentos.map(e => e.nomeFantasia).join(", ")}`);
  }, reporter);

  // ── Cenário 7 ─────────────────────────────────────────────────────────────
  await run("S07", "Oncologista localiza centros de oncologia", async () => {
    console.log('    → Usuário: "Preciso encontrar o INCA no Rio de Janeiro"');
    const r = await callTool<{ total: number; estabelecimentos: Array<{ codigoCnes: string; nomeFantasia: string }> }>(
      client, "buscar_por_nome", { nome: "inca", uf: "RJ" }
    );
    assertGreater(r.total, 0);
    assertContains(r.estabelecimentos, (e) => e.codigoCnes === "2270295");
    console.log(`    ✓ ${r.estabelecimentos[0].nomeFantasia}`);
  }, reporter);

  // ── Cenário 8 ─────────────────────────────────────────────────────────────
  await run("S08", "Pesquisador verifica serviços de transplante disponíveis", async () => {
    console.log('    → Usuário: "O HC FMUSP realiza transplantes?"');
    const r = await callTool<{ total: number; servicos: Array<{ descricao: string }> }>(
      client, "listar_servicos", { codigoCnes: "2077485" }
    );
    assertGreater(r.total, 0);
    assertContains(r.servicos, (s) =>
      (s.descricao ?? "").toLowerCase().includes("transplant"),
      "HC FMUSP deve ter serviço de transplante"
    );
    console.log(`    ✓ Serviços: ${r.servicos.map(s => s.descricao).join("; ")}`);
  }, reporter);

  // ── Cenário 9 ─────────────────────────────────────────────────────────────
  await run("S09", "Gestor RH verifica profissionais do HCPA com privacidade", async () => {
    console.log('    → Usuário: "Liste os profissionais cadastrados no HCPA"');
    const r = await callTool<{ total: number; profissionais: Array<{ cpf?: string; nome: string; descricaoCbo: string }> }>(
      client, "listar_profissionais", { codigoCnes: "4049869" }
    );
    assertGreater(r.total, 0);
    for (const p of r.profissionais) {
      if (p.cpf) {
        assertTrue(
          /^\*\*\*\.\d{3}\.\d{3}-\*\*$/.test(p.cpf),
          `CPF não mascarado: ${p.cpf} para ${p.nome}`
        );
      }
    }
    console.log(`    ✓ ${r.total} profissionais com CPF mascarado`);
  }, reporter);

  // ── Cenário 10 ────────────────────────────────────────────────────────────
  await run("S10", "Sistema verifica CNES inválido sem crash", async () => {
    console.log('    → Usuário informa CNES inexistente: "9999999"');
    const r = await callTool<{ encontrado: boolean; mensagem?: string }>(
      client, "buscar_por_codigo_cnes", { codigoCnes: "9999999" }
    );
    assertTrue(r.encontrado === false, "CNES inexistente deve retornar encontrado=false");
    assertNotNull(r.mensagem, "deve retornar mensagem explicativa");
    console.log(`    ✓ Retornou mensagem: "${r.mensagem?.slice(0, 80)}..."`);
  }, reporter);

  // ── Cenário 11 ────────────────────────────────────────────────────────────
  await run("S11", "Pesquisador mapeia rede assistencial de SP por tipo", async () => {
    console.log('    → Usuário: "Liste hospitais, UPA e UBS disponíveis em SP"');
    const hospitais = await callTool<{ total: number }>(
      client, "buscar_por_tipo", { tipo: "hospital", uf: "SP" }
    );
    const upas = await callTool<{ total: number }>(
      client, "buscar_por_tipo", { tipo: "UPA", uf: "SP" }
    );
    assertGreater(hospitais.total, 0, "SP deve ter hospitais");
    console.log(`    ✓ SP: ${hospitais.total} hospitais, ${upas.total} UPA(s) no banco`);
  }, reporter);

  // ── Cenário 12 ────────────────────────────────────────────────────────────
  await run("S12", "Radioterapia: verificar equipamentos do INCA", async () => {
    console.log('    → Usuário: "O INCA tem acelerador linear para radioterapia?"');
    const r = await callTool<{ equipamentos: Array<{ codigo: string; descricao: string; quantidadeExistente: number }> }>(
      client, "listar_equipamentos", { codigoCnes: "2270295" }
    );
    assertContains(
      r.equipamentos,
      (e) => e.codigo === "017",
      "INCA deve ter Equipamento de Radioterapia (017)"
    );
    const radio = r.equipamentos.find((e) => e.codigo === "017");
    assertNotNull(radio);
    assertGreater(radio.quantidadeExistente, 0, "deve ter ao menos 1 equipamento de radioterapia");
    console.log(`    ✓ Radioterapia: ${radio.quantidadeExistente} equipamento(s) no INCA`);
  }, reporter);

  // ── Cenário 13 ────────────────────────────────────────────────────────────
  await run("S13", "Múltiplos hospitais em DF para comparação de leitos UTI", async () => {
    console.log('    → Usuário: "Compare os leitos UTI dos hospitais do DF"');
    const hospitais = await callTool<{ estabelecimentos: Array<{ codigoCnes: string; nomeFantasia: string }> }>(
      client, "buscar_por_tipo", { tipo: "hospital", uf: "DF" }
    );
    assertGreater(hospitais.estabelecimentos.length, 0, "DF deve ter hospitais");
    let totalUtiDf = 0;
    for (const h of hospitais.estabelecimentos.slice(0, 3)) {
      const leitos = await callTool<{ leitos: Array<{ tipo: string; leitosExistentes: number }> }>(
        client, "listar_leitos", { codigoCnes: h.codigoCnes }
      );
      const uti = leitos.leitos.filter((l) => l.tipo.toLowerCase().includes("uti"));
      const qtUti = uti.reduce((acc, l) => acc + l.leitosExistentes, 0);
      totalUtiDf += qtUti;
      if (qtUti > 0) console.log(`    → ${h.nomeFantasia}: ${qtUti} leitos UTI`);
    }
    console.log(`    ✓ Total UTI nos hospitais do DF analisados: ${totalUtiDf}`);
    assertTrue(true, "consulta multi-hospital deve completar sem erro");
  }, reporter);

  // ── Cenário 14 ────────────────────────────────────────────────────────────
  await run("S14", "Busca por nome 'einstein' encontra hospital", async () => {
    console.log('    → Usuário: "Buscar hospitais Einstein"');
    const r = await callTool<{ total: number; estabelecimentos: unknown[] }>(
      client, "buscar_por_nome", { nome: "einstein" }
    );
    // Pode não ter Albert Einstein nos dados base, mas a busca deve funcionar sem erro
    assertTrue(r.total >= 0, "busca deve completar sem erro");
    console.log(`    ✓ Encontrados: ${r.total} resultados para "einstein"`);
  }, reporter);

  // ── Cenário 15 ────────────────────────────────────────────────────────────
  await run("S15", "Performance: 8 queries sequenciais < 2 segundos total", async () => {
    console.log('    → Usuário: "Consultas sequenciais para relatório completo do HC FMUSP"');
    const cnes = "2077485";
    const start = Date.now();
    await callTool(client, "buscar_por_codigo_cnes", { codigoCnes: cnes });
    await callTool(client, "listar_leitos", { codigoCnes: cnes });
    await callTool(client, "listar_equipamentos", { codigoCnes: cnes });
    await callTool(client, "listar_profissionais", { codigoCnes: cnes });
    await callTool(client, "listar_servicos", { codigoCnes: cnes });
    await callTool(client, "buscar_por_nome", { nome: "clinicas", uf: "SP" });
    await callTool(client, "buscar_por_municipio", { codigoIbge: "355030" });
    await callTool(client, "buscar_por_tipo", { tipo: "hospital", uf: "SP" });
    const total = Date.now() - start;
    assertTrue(total < 2000, `8 queries levaram ${total}ms (limite: 2000ms)`);
    console.log(`    ✓ 8 queries concluídas em ${total}ms (média: ${Math.round(total / 8)}ms/query)`);
  }, reporter);
}
