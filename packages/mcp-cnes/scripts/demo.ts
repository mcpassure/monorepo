import { getInMemoryDb } from "../src/db/connection.js";
import { CnesRepository } from "../src/domain/repository.js";
import { seedDatabase } from "../tests/fixtures/seed.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const DIM = "\x1b[2m";

function header(title: string): void {
  console.log(`\n${BOLD}${CYAN}${"═".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${"═".repeat(60)}${RESET}\n`);
}

function print(label: string, value: unknown): void {
  console.log(`  ${YELLOW}${label}:${RESET} ${GREEN}${JSON.stringify(value, null, 2).split("\n").join("\n  ")}${RESET}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log(`\n${BOLD}${BLUE}╔═══════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${BLUE}║  @mcpassure/mcp-cnes — Demo                          ║${RESET}`);
  console.log(`${BOLD}${BLUE}║  CNES — Cadastro Nacional de Estabelecimentos de Saúde ║${RESET}`);
  console.log(`${BOLD}${BLUE}╚═══════════════════════════════════════════════════════╝${RESET}\n`);

  console.log(`${DIM}Inicializando banco de dados de demonstração...${RESET}`);
  const db = getInMemoryDb();
  seedDatabase(db);
  const repo = new CnesRepository(() => db);
  console.log(`${GREEN}✓ Banco de dados carregado${RESET}\n`);

  await sleep(1500);

  // 1. buscar_por_codigo_cnes
  header("1/4 — buscar_por_codigo_cnes({ codigo_cnes: '2077485' })");
  const { data: byCode } = await repo.buscarPorCodigoCnes("2077485");
  if (byCode.encontrado && byCode.estabelecimento) {
    const est = byCode.estabelecimento;
    print("Nome", est.nomeFantasia || est.razaoSocial);
    print("CNES", est.codigoCnes);
    print("Tipo", est.tipo);
    print("Município", `${est.municipio}/${est.uf}`);
    print("Vínculo SUS", est.vinculoSus);
  } else {
    console.log(`  ${DIM}${byCode.mensagem}${RESET}`);
  }

  await sleep(1500);

  // 2. buscar_por_municipio
  header("2/4 — buscar_por_municipio({ codigoIbge: '3550308', limit: 5 })");
  const { data: byMun } = await repo.buscarPorMunicipio({ codigoIbge: "3550308", limit: 5 });
  console.log(`  ${YELLOW}Total encontrado:${RESET} ${GREEN}${byMun.total}${RESET}`);
  if (byMun.estabelecimentos.length > 0) {
    for (const est of byMun.estabelecimentos.slice(0, 5)) {
      console.log(`  ${DIM}• ${est.nomeFantasia || est.razaoSocial} (${est.tipo})${RESET}`);
    }
  } else {
    console.log(`  ${DIM}Nenhum estabelecimento encontrado (execute sync para carregar dados reais)${RESET}`);
  }

  await sleep(1500);

  // 3. listar_profissionais
  header("3/4 — listar_profissionais({ codigoCnes: '2077485', limit: 10 })");
  const { data: profs } = await repo.listarProfissionais("2077485");
  console.log(`  ${YELLOW}Total profissionais:${RESET} ${GREEN}${profs.total}${RESET}`);
  if (profs.profissionais.length > 0) {
    for (const pf of profs.profissionais.slice(0, 5)) {
      console.log(`  ${DIM}• ${pf.nome} — ${pf.descricaoCbo}${RESET}`);
    }
  } else {
    console.log(`  ${DIM}Nenhum profissional no cache de demonstração${RESET}`);
  }

  await sleep(1500);

  // 4. perfil_estabelecimento (prompt)
  header("4/4 — prompt perfil_estabelecimento({ codigo_cnes: '2077485' })");
  const { data: estData2 } = await repo.buscarPorCodigoCnes("2077485");
  const { data: leitos } = await repo.listarLeitos("2077485");
  const { data: equips } = await repo.listarEquipamentos("2077485");
  const { data: servicos } = await repo.listarServicos("2077485");

  if (estData2.encontrado && estData2.estabelecimento) {
    const est = estData2.estabelecimento;
    console.log(`  ${BOLD}Estabelecimento:${RESET} ${GREEN}${est.nomeFantasia || est.razaoSocial}${RESET}`);
    console.log(`  ${BOLD}CNES:${RESET}            ${GREEN}${est.codigoCnes}${RESET}`);
    console.log(`  ${BOLD}Tipo:${RESET}            ${GREEN}${est.tipo}${RESET}`);
    console.log(`  ${BOLD}Município:${RESET}       ${GREEN}${est.municipio}/${est.uf}${RESET}`);
    console.log(`  ${BOLD}Profissionais:${RESET}   ${GREEN}${profs.total}${RESET}`);
    console.log(`  ${BOLD}Leitos:${RESET}          ${GREEN}${leitos.total}${RESET}`);
    console.log(`  ${BOLD}Equipamentos:${RESET}    ${GREEN}${equips.total}${RESET}`);
    console.log(`  ${BOLD}Serviços:${RESET}        ${GREEN}${servicos.total}${RESET}`);
  } else {
    console.log(`  ${DIM}${estData2.mensagem}${RESET}`);
  }

  console.log(`\n${BOLD}${BLUE}${"═".repeat(60)}${RESET}`);
  console.log(`${BOLD}${GREEN}  ✓ Demo concluído — @mcpassure/mcp-cnes v1.1.2${RESET}`);
  console.log(`${BOLD}${BLUE}${"═".repeat(60)}${RESET}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
