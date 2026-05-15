import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");

function loadJson<T>(filename: string): T[] {
  return JSON.parse(readFileSync(join(dataDir, filename), "utf-8")) as T[];
}

export function seedDatabase(db: Database.Database): void {
  const estabelecimentos = loadJson<Record<string, unknown>>("estabelecimentos.json");
  const leitos = loadJson<Record<string, unknown>>("leitos.json");
  const equipamentos = loadJson<Record<string, unknown>>("equipamentos.json");
  const profissionais = loadJson<Record<string, unknown>>("profissionais.json");
  const servicos = loadJson<Record<string, unknown>>("servicos.json");

  const insertEst = db.prepare(
    `INSERT OR REPLACE INTO estabelecimentos
     (co_cnes, no_fantasia, no_razao_social, nu_cnpj, tp_unidade, co_natureza_jur,
      no_municipio, sg_uf, co_municipio, no_logradouro, nu_latitude, nu_longitude,
      nu_telefone, vinculo_sus, tp_gestao, competencia, updated_at)
     VALUES (@co_cnes, @no_fantasia, @no_razao_social, @nu_cnpj, @tp_unidade, @co_natureza_jur,
             @no_municipio, @sg_uf, @co_municipio, @no_logradouro, @nu_latitude, @nu_longitude,
             @nu_telefone, @vinculo_sus, @tp_gestao, @competencia, @updated_at)`
  );
  for (const row of estabelecimentos) insertEst.run(row);

  const insertLt = db.prepare(
    `INSERT OR REPLACE INTO leitos (co_cnes, tp_leito, co_leito, qt_exist, qt_sus, qt_nsus, competencia)
     VALUES (@co_cnes, @tp_leito, @co_leito, @qt_exist, @qt_sus, @qt_nsus, @competencia)`
  );
  for (const row of leitos) insertLt.run(row);

  const insertEq = db.prepare(
    `INSERT OR REPLACE INTO equipamentos (co_cnes, co_equip, ds_equip, qt_exist, qt_uso, competencia)
     VALUES (@co_cnes, @co_equip, @ds_equip, @qt_exist, @qt_uso, @competencia)`
  );
  for (const row of equipamentos) insertEq.run(row);

  const insertPf = db.prepare(
    `INSERT OR REPLACE INTO profissionais (co_cnes, cpf_prof, nm_prof, co_cbo, ds_cbo, tp_vinculo, competencia)
     VALUES (@co_cnes, @cpf_prof, @nm_prof, @co_cbo, @ds_cbo, @tp_vinculo, @competencia)`
  );
  for (const row of profissionais) insertPf.run(row);

  const insertSr = db.prepare(
    `INSERT OR REPLACE INTO servicos_especializados (co_cnes, co_servico, ds_servico, co_class_sr, ds_class_sr, competencia)
     VALUES (@co_cnes, @co_servico, @ds_servico, @co_class_sr, @ds_class_sr, @competencia)`
  );
  for (const row of servicos) insertSr.run(row);
}
