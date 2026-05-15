// Dados realistas de 6 hospitais de referência nacional para seed de integração.
// Baseados em informações públicas do DATASUS / publicações anuais.
// Competência base: 202501 (Janeiro 2025).

const COMP = "202501";

export type LeitoSeed = {
  co_cnes: string;
  tp_leito: string;
  co_leito: string;
  qt_exist: number;
  qt_sus: number;
  qt_nsus: number;
  competencia: string;
};

export type EquipamentoSeed = {
  co_cnes: string;
  co_equip: string;
  ds_equip: string;
  qt_exist: number;
  qt_uso: number;
  competencia: string;
};

export type ProfissionalSeed = {
  co_cnes: string;
  cpf_prof: string;
  nm_prof: string;
  co_cbo: string;
  ds_cbo: string;
  tp_vinculo: string;
  competencia: string;
};

export type ServicoSeed = {
  co_cnes: string;
  co_servico: string;
  ds_servico: string;
  co_class_sr: string;
  ds_class_sr: string;
  competencia: string;
};

export type HospitalSeed = {
  co_cnes: string;
  no_fantasia: string;
  no_razao_social: string;
  tp_unidade: string;
  no_municipio: string;
  sg_uf: string;
  co_municipio: string;
  no_logradouro: string;
  nu_telefone: string;
  nu_latitude: number;
  nu_longitude: number;
  vinculo_sus: number;
  tp_gestao: string;
  competencia: string;
  leitos: LeitoSeed[];
  equipamentos: EquipamentoSeed[];
  profissionais: ProfissionalSeed[];
  servicos: ServicoSeed[];
};

function l(cnes: string, tp: string, cod: string, exist: number, sus: number, nsus: number): LeitoSeed {
  return { co_cnes: cnes, tp_leito: tp, co_leito: cod, qt_exist: exist, qt_sus: sus, qt_nsus: nsus, competencia: COMP };
}

function e(cnes: string, cod: string, ds: string, exist: number, uso: number): EquipamentoSeed {
  return { co_cnes: cnes, co_equip: cod, ds_equip: ds, qt_exist: exist, qt_uso: uso, competencia: COMP };
}

function p(cnes: string, cpf: string, nm: string, cbo: string, dsCbo: string, tp: string): ProfissionalSeed {
  return { co_cnes: cnes, cpf_prof: cpf, nm_prof: nm, co_cbo: cbo, ds_cbo: dsCbo, tp_vinculo: tp, competencia: COMP };
}

function s(cnes: string, coServ: string, dsServ: string, coClass: string, dsClass: string): ServicoSeed {
  return { co_cnes: cnes, co_servico: coServ, ds_servico: dsServ, co_class_sr: coClass, ds_class_sr: dsClass, competencia: COMP };
}

// ─── HC FMUSP (2077485) ────────────────────────────────────────────────────
const HC_FMUSP = "2077485";

// ─── InCor (2079046) ──────────────────────────────────────────────────────
const INCOR = "2079046";

// ─── HU UFSC (3467485) ────────────────────────────────────────────────────
const HU_UFSC = "3467485";

// ─── INCA (2270295) ───────────────────────────────────────────────────────
const INCA = "2270295";

// ─── Hospital de Base DF (2237076) ────────────────────────────────────────
const HBASE_DF = "2237076";

// ─── HCPA Porto Alegre (4049869) ──────────────────────────────────────────
const HCPA = "4049869";

export const HOSPITALS: HospitalSeed[] = [
  {
    co_cnes: HC_FMUSP,
    no_fantasia: "HOSPITAL DAS CLINICAS DA FMUSP",
    no_razao_social: "HOSPITAL DAS CLINICAS DA FACULDADE DE MEDICINA DA USP",
    tp_unidade: "05",
    no_municipio: "SAO PAULO",
    sg_uf: "SP",
    co_municipio: "355030",
    no_logradouro: "AV DR ENEAS CARVALHO AGUIAR 255 CERQUEIRA CESAR",
    nu_telefone: "1126616000",
    nu_latitude: -23.5545,
    nu_longitude: -46.6699,
    vinculo_sus: 1,
    tp_gestao: "E",
    competencia: COMP,
    leitos: [
      l(HC_FMUSP, "Cirúrgico", "01", 350, 310, 40),
      l(HC_FMUSP, "Clínico", "02", 620, 580, 40),
      l(HC_FMUSP, "Obstétrico", "03", 60, 60, 0),
      l(HC_FMUSP, "Pediátrico", "04", 180, 160, 20),
      l(HC_FMUSP, "UTI Adulto - Tipo II", "14", 210, 180, 30),
      l(HC_FMUSP, "UTI Adulto - Tipo III", "15", 230, 210, 20),
      l(HC_FMUSP, "UTI Pediátrica", "16", 80, 70, 10),
      l(HC_FMUSP, "UTI Neonatal", "17", 60, 55, 5),
    ],
    equipamentos: [
      e(HC_FMUSP, "031", "Ressonância Magnética", 5, 5),
      e(HC_FMUSP, "032", "Tomógrafo Computadorizado", 8, 7),
      e(HC_FMUSP, "025", "Mamógrafo", 4, 4),
      e(HC_FMUSP, "033", "Ultrassonógrafo", 20, 18),
      e(HC_FMUSP, "020", "Hemodinâmica (sala)", 4, 4),
      e(HC_FMUSP, "010", "Centro Cirúrgico (sala)", 42, 40),
      e(HC_FMUSP, "002", "Aparelho de Hemodiálise", 40, 35),
    ],
    profissionais: [
      p(HC_FMUSP, "***.234.567-**", "ANA PAULA OLIVEIRA", "225125", "Médico Clínico", "2"),
      p(HC_FMUSP, "***.345.678-**", "CARLOS ROBERTO SILVA", "225135", "Médico Cardiologista", "2"),
      p(HC_FMUSP, "***.456.789-**", "FERNANDA COSTA LIMA", "225150", "Médico Cirurgião Geral", "2"),
      p(HC_FMUSP, "***.567.890-**", "MARCELO HENRIQUE SOUZA", "225265", "Médico Pediatra", "2"),
      p(HC_FMUSP, "***.678.901-**", "PATRICIA MENDES ROCHA", "223505", "Enfermeiro", "2"),
      p(HC_FMUSP, "***.789.012-**", "JOAO BATISTA FERREIRA", "225320", "Médico Neurologista", "2"),
      p(HC_FMUSP, "***.890.123-**", "SILVIA REGINA MARTINS", "223505", "Enfermeiro", "2"),
      p(HC_FMUSP, "***.901.234-**", "ROBERTO ALVES PEREIRA", "223810", "Fisioterapeuta", "2"),
      p(HC_FMUSP, "***.012.345-**", "LUCIANA FREITAS CAMPOS", "225185", "Médico Oncologista", "2"),
      p(HC_FMUSP, "***.123.456-**", "EDUARDO SANTOS NETO", "225125", "Médico Clínico", "2"),
    ],
    servicos: [
      s(HC_FMUSP, "007", "Oncologia", "001", "Serviço Habilitado de Alta Complexidade"),
      s(HC_FMUSP, "003", "Transplante de Órgãos e Tecidos", "001", "Serviço Habilitado de Alta Complexidade"),
      s(HC_FMUSP, "004", "Hemoterapia", "002", "Serviço de Referência"),
      s(HC_FMUSP, "005", "Terapia Renal Substitutiva", "001", "Serviço Habilitado"),
      s(HC_FMUSP, "009", "Cirurgia Bariátrica e Metabólica", "001", "Serviço Habilitado"),
    ],
  },
  {
    co_cnes: INCOR,
    no_fantasia: "INCOR INSTITUTO DO CORACAO",
    no_razao_social: "INSTITUTO DO CORACAO DO HOSPITAL DAS CLINICAS FMUSP",
    tp_unidade: "07",
    no_municipio: "SAO PAULO",
    sg_uf: "SP",
    co_municipio: "355030",
    no_logradouro: "AV DR ENEAS CARVALHO AGUIAR 44 CERQUEIRA CESAR",
    nu_telefone: "1126615000",
    nu_latitude: -23.5549,
    nu_longitude: -46.6695,
    vinculo_sus: 1,
    tp_gestao: "E",
    competencia: COMP,
    leitos: [
      l(INCOR, "Clínico", "02", 180, 150, 30),
      l(INCOR, "Cirúrgico", "01", 120, 100, 20),
      l(INCOR, "UTI Adulto - Tipo III", "15", 90, 80, 10),
      l(INCOR, "UTI Coronariana Tipo II", "19", 60, 55, 5),
      l(INCOR, "UTI Coronariana Tipo III", "20", 40, 35, 5),
    ],
    equipamentos: [
      e(INCOR, "020", "Hemodinâmica (sala)", 8, 8),
      e(INCOR, "013", "Ecocardiograma", 10, 9),
      e(INCOR, "032", "Tomógrafo Computadorizado", 4, 4),
      e(INCOR, "031", "Ressonância Magnética", 2, 2),
    ],
    profissionais: [
      p(INCOR, "***.234.111-**", "PAULO CEZAR ALMEIDA", "225135", "Médico Cardiologista", "2"),
      p(INCOR, "***.345.222-**", "MARIA JOSE CARDOSO", "225135", "Médico Cardiologista", "2"),
      p(INCOR, "***.456.333-**", "ANTONIO MARCOS VIEIRA", "225150", "Médico Cirurgião Cardiovascular", "2"),
      p(INCOR, "***.567.444-**", "CLAUDIA BEATRIZ MOREIRA", "223505", "Enfermeiro", "2"),
      p(INCOR, "***.678.555-**", "FRANCISCO JOSE BARBOSA", "225135", "Médico Cardiologista", "2"),
      p(INCOR, "***.789.666-**", "JULIANA RAMOS TEIXEIRA", "223810", "Fisioterapeuta", "2"),
    ],
    servicos: [
      s(INCOR, "010", "Atenção Cardiovascular de Alta Complexidade", "001", "Serviço Habilitado"),
      s(INCOR, "003", "Transplante Cardíaco", "001", "Serviço Habilitado de Alta Complexidade"),
      s(INCOR, "004", "Hemoterapia", "002", "Serviço de Referência"),
    ],
  },
  {
    co_cnes: HU_UFSC,
    no_fantasia: "HU PROF POLYDORO ERNANI DE SAO THIAGO UFSC",
    no_razao_social: "HOSPITAL UNIVERSITARIO DA UNIVERSIDADE FEDERAL DE SANTA CATARINA",
    tp_unidade: "05",
    no_municipio: "FLORIANOPOLIS",
    sg_uf: "SC",
    co_municipio: "420540",
    no_logradouro: "R PROFA MARIA FLORA PAUSEWANG S/N TRINDADE",
    nu_telefone: "4837219100",
    nu_latitude: -27.5981,
    nu_longitude: -48.5207,
    vinculo_sus: 1,
    tp_gestao: "E",
    competencia: COMP,
    leitos: [
      l(HU_UFSC, "Clínico", "02", 90, 90, 0),
      l(HU_UFSC, "Cirúrgico", "01", 70, 70, 0),
      l(HU_UFSC, "Pediátrico", "04", 40, 40, 0),
      l(HU_UFSC, "UTI Adulto - Tipo II", "14", 30, 30, 0),
      l(HU_UFSC, "UTI Neonatal", "17", 20, 20, 0),
    ],
    equipamentos: [
      e(HU_UFSC, "032", "Tomógrafo Computadorizado", 2, 2),
      e(HU_UFSC, "033", "Ultrassonógrafo", 5, 5),
      e(HU_UFSC, "029", "Raio X Convencional", 4, 4),
      e(HU_UFSC, "031", "Ressonância Magnética", 1, 1),
    ],
    profissionais: [
      p(HU_UFSC, "***.234.999-**", "HELENA CRISTINA PIRES", "225125", "Médico Clínico", "2"),
      p(HU_UFSC, "***.345.888-**", "BRUNO AUGUSTO LEMOS", "225150", "Médico Cirurgião Geral", "2"),
      p(HU_UFSC, "***.456.777-**", "ANDREA SILVEIRA NUNES", "225265", "Médico Pediatra", "2"),
      p(HU_UFSC, "***.567.666-**", "RODRIGO MAIA FONSECA", "223505", "Enfermeiro", "2"),
      p(HU_UFSC, "***.678.555-**", "TATIANA BORGES LIMA", "223505", "Enfermeiro", "2"),
    ],
    servicos: [
      s(HU_UFSC, "001", "Genética Clínica", "002", "Serviço de Referência"),
      s(HU_UFSC, "004", "Hemoterapia", "002", "Serviço de Referência"),
      s(HU_UFSC, "005", "Terapia Renal Substitutiva", "001", "Serviço Habilitado"),
    ],
  },
  {
    co_cnes: INCA,
    no_fantasia: "INCA INSTITUTO NACIONAL DE CANCER",
    no_razao_social: "INSTITUTO NACIONAL DE CANCER JOSE ALENCAR GOMES DA SILVA",
    tp_unidade: "07",
    no_municipio: "RIO DE JANEIRO",
    sg_uf: "RJ",
    co_municipio: "330455",
    no_logradouro: "RUA MARIO VARGAS FILHO 225 CENTRO",
    nu_telefone: "2132076500",
    nu_latitude: -22.9073,
    nu_longitude: -43.1793,
    vinculo_sus: 1,
    tp_gestao: "F",
    competencia: COMP,
    leitos: [
      l(INCA, "Clínico", "02", 200, 200, 0),
      l(INCA, "Cirúrgico", "01", 140, 140, 0),
      l(INCA, "UTI Adulto - Tipo II", "14", 60, 60, 0),
      l(INCA, "Outras Especialidades", "05", 80, 80, 0),
    ],
    equipamentos: [
      e(INCA, "017", "Equipamento de Radioterapia", 3, 3),
      e(INCA, "032", "Tomógrafo Computadorizado", 4, 4),
      e(INCA, "031", "Ressonância Magnética", 2, 2),
      e(INCA, "033", "Ultrassonógrafo", 8, 7),
    ],
    profissionais: [
      p(INCA, "***.234.001-**", "SIMONE APARECIDA GOMES", "225185", "Médico Oncologista", "2"),
      p(INCA, "***.345.002-**", "GUSTAVO HENRIQUE ARAUJO", "225185", "Médico Oncologista", "2"),
      p(INCA, "***.456.003-**", "RENATA LUCIA CARVALHO", "225185", "Médico Oncologista", "2"),
      p(INCA, "***.567.004-**", "LEANDRO JOSE NASCIMENTO", "223505", "Enfermeiro", "2"),
      p(INCA, "***.678.005-**", "VANESSA CRISTINA PINTO", "223505", "Enfermeiro", "2"),
    ],
    servicos: [
      s(INCA, "007", "Oncologia", "001", "Serviço Habilitado de Alta Complexidade"),
      s(INCA, "006", "Radioterapia", "001", "Serviço Habilitado"),
      s(INCA, "008", "Quimioterapia", "001", "Serviço Habilitado"),
      s(INCA, "011", "Cirurgia Oncológica", "001", "Serviço Habilitado"),
    ],
  },
  {
    co_cnes: HBASE_DF,
    no_fantasia: "HOSPITAL DE BASE DO DISTRITO FEDERAL",
    no_razao_social: "FUNDACAO DE ENSINO E PESQUISA EM CIENCIAS DA SAUDE FEPECS",
    tp_unidade: "05",
    no_municipio: "BRASILIA",
    sg_uf: "DF",
    co_municipio: "530010",
    no_logradouro: "SMSF ÁREA ESPECIAL S/N ASA SUL",
    nu_telefone: "6132251200",
    nu_latitude: -15.7942,
    nu_longitude: -47.9022,
    vinculo_sus: 1,
    tp_gestao: "E",
    competencia: COMP,
    leitos: [
      l(HBASE_DF, "Clínico", "02", 220, 200, 20),
      l(HBASE_DF, "Cirúrgico", "01", 160, 140, 20),
      l(HBASE_DF, "UTI Adulto - Tipo II", "14", 80, 75, 5),
      l(HBASE_DF, "UTI Adulto - Tipo III", "15", 40, 38, 2),
      l(HBASE_DF, "UTI Neonatal", "17", 30, 28, 2),
    ],
    equipamentos: [
      e(HBASE_DF, "031", "Ressonância Magnética", 2, 2),
      e(HBASE_DF, "032", "Tomógrafo Computadorizado", 3, 3),
      e(HBASE_DF, "020", "Hemodinâmica (sala)", 2, 2),
    ],
    profissionais: [
      p(HBASE_DF, "***.234.501-**", "MARCOS VINICIUS LIMA", "225125", "Médico Clínico", "2"),
      p(HBASE_DF, "***.345.502-**", "DANIELA PATRICIA FONSECA", "225150", "Médico Cirurgião Geral", "2"),
      p(HBASE_DF, "***.456.503-**", "ANDRE LUIZ CAVALCANTE", "225135", "Médico Cardiologista", "2"),
      p(HBASE_DF, "***.567.504-**", "ROSANGELA MARIA BRAGA", "223505", "Enfermeiro", "2"),
      p(HBASE_DF, "***.678.505-**", "THIAGO RODRIGUES MELO", "223810", "Fisioterapeuta", "2"),
    ],
    servicos: [
      s(HBASE_DF, "004", "Hemoterapia", "002", "Serviço de Referência"),
      s(HBASE_DF, "005", "Terapia Renal Substitutiva", "001", "Serviço Habilitado"),
      s(HBASE_DF, "010", "Atenção Cardiovascular", "001", "Serviço Habilitado"),
    ],
  },
  {
    co_cnes: HCPA,
    no_fantasia: "HCPA HOSPITAL DE CLINICAS DE PORTO ALEGRE",
    no_razao_social: "HOSPITAL DE CLINICAS DE PORTO ALEGRE",
    tp_unidade: "05",
    no_municipio: "PORTO ALEGRE",
    sg_uf: "RS",
    co_municipio: "431490",
    no_logradouro: "R RAMIRO BARCELOS 2350 SANTA CECILIA",
    nu_telefone: "5133598000",
    nu_latitude: -30.0346,
    nu_longitude: -51.2177,
    vinculo_sus: 1,
    tp_gestao: "E",
    competencia: COMP,
    leitos: [
      l(HCPA, "Clínico", "02", 280, 250, 30),
      l(HCPA, "Cirúrgico", "01", 200, 180, 20),
      l(HCPA, "Pediátrico", "04", 60, 55, 5),
      l(HCPA, "UTI Adulto - Tipo II", "14", 80, 72, 8),
      l(HCPA, "UTI Adulto - Tipo III", "15", 40, 36, 4),
      l(HCPA, "UTI Neonatal", "17", 30, 27, 3),
    ],
    equipamentos: [
      e(HCPA, "031", "Ressonância Magnética", 3, 3),
      e(HCPA, "032", "Tomógrafo Computadorizado", 5, 5),
      e(HCPA, "033", "Ultrassonógrafo", 12, 11),
      e(HCPA, "025", "Mamógrafo", 2, 2),
    ],
    profissionais: [
      p(HCPA, "***.234.701-**", "CRISTINA APARECIDA SANTOS", "225125", "Médico Clínico", "2"),
      p(HCPA, "***.345.702-**", "MAURICIO RIBEIRO DIAS", "225135", "Médico Cardiologista", "2"),
      p(HCPA, "***.456.703-**", "ISABELA CORREIA MOURA", "225150", "Médico Cirurgião Geral", "2"),
      p(HCPA, "***.567.704-**", "NELSON AUGUSTO FRANCO", "225320", "Médico Neurologista", "2"),
      p(HCPA, "***.678.705-**", "ALINE FERREIRA CUNHA", "223505", "Enfermeiro", "2"),
      p(HCPA, "***.789.706-**", "VITOR HUGO MACHADO", "223810", "Fisioterapeuta", "2"),
    ],
    servicos: [
      s(HCPA, "003", "Transplante de Órgãos e Tecidos", "001", "Serviço Habilitado de Alta Complexidade"),
      s(HCPA, "007", "Oncologia", "001", "Serviço Habilitado"),
      s(HCPA, "010", "Atenção Cardiovascular", "001", "Serviço Habilitado"),
      s(HCPA, "005", "Terapia Renal Substitutiva", "001", "Serviço Habilitado"),
    ],
  },
];
