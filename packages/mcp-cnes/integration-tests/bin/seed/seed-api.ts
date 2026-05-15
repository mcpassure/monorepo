// Semeia o banco SQLite de integração.
// 1. Insere os 6 hospitais de referência de hospitals.ts (dados realistas garantidos).
// 2. Tenta buscar mais estabelecimentos reais via REST API TCU (se disponível).
// 3. Não falha se a API estiver offline — os 6 hospitais base garantem cobertura dos testes.

import type Database from "better-sqlite3";
import { HOSPITALS, type HospitalSeed } from "./hospitals.js";

const BASE_URL = "http://mobile-aceite.tcu.gov.br/mapa-da-saude/rest";
const TIMEOUT_MS = 8000;

type TcuEstab = {
  codCnes?: number;
  codUnidade?: string;
  nomeFantasia?: string;
  cidade?: string;
  uf?: string;
  lat?: number;
  long?: number;
  telefone?: string;
  vinculoSus?: string;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function insertEstabelecimento(db: Database.Database, h: HospitalSeed): void {
  db.prepare(`
    INSERT OR REPLACE INTO estabelecimentos
    (co_cnes, no_fantasia, no_razao_social, tp_unidade, no_municipio, sg_uf,
     co_municipio, no_logradouro, nu_telefone, nu_latitude, nu_longitude,
     vinculo_sus, tp_gestao, competencia, updated_at)
    VALUES
    (@co_cnes,@no_fantasia,@no_razao_social,@tp_unidade,@no_municipio,@sg_uf,
     @co_municipio,@no_logradouro,@nu_telefone,@nu_latitude,@nu_longitude,
     @vinculo_sus,@tp_gestao,@competencia,@updated_at)
  `).run({ ...h, updated_at: new Date().toISOString() });
}

function insertDependentData(db: Database.Database, h: HospitalSeed): void {
  const insertLeito = db.prepare(`
    INSERT OR REPLACE INTO leitos (co_cnes,tp_leito,co_leito,qt_exist,qt_sus,qt_nsus,competencia)
    VALUES (@co_cnes,@tp_leito,@co_leito,@qt_exist,@qt_sus,@qt_nsus,@competencia)
  `);
  const insertEquip = db.prepare(`
    INSERT OR REPLACE INTO equipamentos (co_cnes,co_equip,ds_equip,qt_exist,qt_uso,competencia)
    VALUES (@co_cnes,@co_equip,@ds_equip,@qt_exist,@qt_uso,@competencia)
  `);
  const insertProf = db.prepare(`
    INSERT OR REPLACE INTO profissionais (co_cnes,cpf_prof,nm_prof,co_cbo,ds_cbo,tp_vinculo,competencia)
    VALUES (@co_cnes,@cpf_prof,@nm_prof,@co_cbo,@ds_cbo,@tp_vinculo,@competencia)
  `);
  const insertServ = db.prepare(`
    INSERT OR REPLACE INTO servicos_especializados (co_cnes,co_servico,ds_servico,co_class_sr,ds_class_sr,competencia)
    VALUES (@co_cnes,@co_servico,@ds_servico,@co_class_sr,@ds_class_sr,@competencia)
  `);

  db.transaction(() => {
    for (const item of h.leitos) insertLeito.run(item);
    for (const item of h.equipamentos) insertEquip.run(item);
    for (const item of h.profissionais) insertProf.run(item);
    for (const item of h.servicos) insertServ.run(item);
  })();
}

function tcuToRow(e: TcuEstab, comp = "202501") {
  return {
    co_cnes: e.codCnes ? String(e.codCnes).padStart(7, "0") : null,
    no_fantasia: e.nomeFantasia ?? null,
    no_razao_social: null,
    tp_unidade: "05",
    no_municipio: e.cidade ?? null,
    sg_uf: e.uf ?? null,
    co_municipio: null,
    no_logradouro: null,
    nu_telefone: e.telefone ?? null,
    nu_latitude: e.lat ?? null,
    nu_longitude: e.long ?? null,
    vinculo_sus: e.vinculoSus === "Sim" ? 1 : 0,
    tp_gestao: null,
    competencia: comp,
    updated_at: new Date().toISOString(),
  };
}

async function fetchByName(nome: string, uf: string, qtd = 8): Promise<TcuEstab[]> {
  const params = new URLSearchParams({ nomeFantasia: nome, quantidade: String(qtd), uf });
  const data = await fetchJson<TcuEstab[]>(`${BASE_URL}/estabelecimentos?${params}`);
  return data ?? [];
}

export async function seedDatabase(db: Database.Database): Promise<void> {
  console.log("\n🌱 Seeding banco de integração...");

  // Passo 1: inserir 6 hospitais base garantidos
  console.log("  → Inserindo 6 hospitais de referência (dados garantidos)...");
  const inserirHospital = db.transaction((h: HospitalSeed) => {
    insertEstabelecimento(db, h);
    insertDependentData(db, h);
  });
  for (const h of HOSPITALS) {
    inserirHospital(h);
  }
  console.log(`  ✓ ${HOSPITALS.length} hospitais inseridos com leitos/equipamentos/profissionais/serviços`);

  // Passo 2: buscar estabelecimentos adicionais via TCU API
  const searches: Array<{ nome: string; uf: string }> = [
    { nome: "hospital das clinicas", uf: "SP" },
    { nome: "hospital universitario", uf: "MG" },
    { nome: "hospital regional", uf: "DF" },
    { nome: "hospital geral", uf: "RJ" },
    { nome: "unidade basica saude", uf: "SC" },
    { nome: "upa", uf: "SP" },
    { nome: "complexo hospitalar", uf: "RS" },
    { nome: "hospital santa casa", uf: "SP" },
  ];

  const insertTcuRow = db.prepare(`
    INSERT OR IGNORE INTO estabelecimentos
    (co_cnes,no_fantasia,no_razao_social,tp_unidade,no_municipio,sg_uf,
     co_municipio,no_logradouro,nu_telefone,nu_latitude,nu_longitude,
     vinculo_sus,tp_gestao,competencia,updated_at)
    VALUES
    (@co_cnes,@no_fantasia,@no_razao_social,@tp_unidade,@no_municipio,@sg_uf,
     @co_municipio,@no_logradouro,@nu_telefone,@nu_latitude,@nu_longitude,
     @vinculo_sus,@tp_gestao,@competencia,@updated_at)
  `);

  let apiTotal = 0;
  let apiFailed = false;

  for (const s of searches) {
    const results = await fetchByName(s.nome, s.uf);
    if (results.length === 0 && !apiFailed) {
      apiFailed = true;
      console.log("  ⚠ API TCU indisponível ou sem resultados — continuando apenas com dados base");
    }
    const batch = db.transaction((rows: TcuEstab[]) => {
      for (const r of rows) {
        const row = tcuToRow(r);
        if (row.co_cnes && row.co_cnes !== "0000000") {
          try { insertTcuRow.run(row); apiTotal++; } catch { /* duplicate */ }
        }
      }
    });
    batch(results);
    if (results.length > 0) {
      process.stdout.write(`  ✓ +${results.length} via TCU API (${s.nome}/${s.uf})\n`);
    }
  }

  const total = (db.prepare("SELECT COUNT(*) as n FROM estabelecimentos").get() as { n: number }).n;
  const totalLeitos = (db.prepare("SELECT COUNT(*) as n FROM leitos").get() as { n: number }).n;
  const totalEquip = (db.prepare("SELECT COUNT(*) as n FROM equipamentos").get() as { n: number }).n;
  const totalProf = (db.prepare("SELECT COUNT(*) as n FROM profissionais").get() as { n: number }).n;
  const totalServ = (db.prepare("SELECT COUNT(*) as n FROM servicos_especializados").get() as { n: number }).n;

  console.log(`\n  📦 Banco populado:`);
  console.log(`     Estabelecimentos : ${total} (${apiTotal} via API)`);
  console.log(`     Leitos           : ${totalLeitos}`);
  console.log(`     Equipamentos     : ${totalEquip}`);
  console.log(`     Profissionais    : ${totalProf}`);
  console.log(`     Serviços         : ${totalServ}`);
}
