/* eslint-disable */
"use strict";
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "api");

const searches = {
  "search-novalgina": {
    content: [
      { numProcesso: "25351617747202347", nomeProduto: "NOVALGINA", razaoSocial: "OPELLA HEALTHCARE BRAZIL LTDA", cnpj: "56998982000141", expediente: "100007", idBulaPacienteProtegido: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", idBulaProfissionalProtegido: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3", dataAtualizacao: "2024-03-15" },
      { numProcesso: "25351304473202248", nomeProduto: "NOVALGINA FLASH", razaoSocial: "OPELLA HEALTHCARE BRAZIL LTDA", cnpj: "56998982000141", expediente: "100008", idBulaPacienteProtegido: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5", idBulaProfissionalProtegido: "e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2", dataAtualizacao: "2024-02-10" }
    ], totalElements: 2, number: 0, size: 10, totalPages: 1
  },
  "search-tylenol": {
    content: [
      { numProcesso: "25351464826202349", nomeProduto: "TYLENOL", razaoSocial: "KENVUE LTDA.", cnpj: "60408075000152", expediente: "200001", idBulaPacienteProtegido: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6", idBulaProfissionalProtegido: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1", dataAtualizacao: "2024-01-20" },
      { numProcesso: "25351464493202358", nomeProduto: "TYLENOL SINUS", razaoSocial: "KENVUE LTDA.", cnpj: "60408075000152", expediente: "200002", idBulaPacienteProtegido: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1", idBulaProfissionalProtegido: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", dataAtualizacao: "2024-01-20" }
    ], totalElements: 2, number: 0, size: 10, totalPages: 1
  },
  "search-amoxil": {
    content: [
      { numProcesso: "2599202214972", nomeProduto: "AMOXIL", razaoSocial: "GLAXOSMITHKLINE BRASIL LTDA", cnpj: "33247377000110", expediente: "300001", idBulaPacienteProtegido: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", idBulaProfissionalProtegido: "b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5", dataAtualizacao: "2023-12-01" }
    ], totalElements: 1, number: 0, size: 10, totalPages: 1
  },
  "search-rivotril": {
    content: [
      { numProcesso: "25351537388202183", nomeProduto: "RIVOTRIL", razaoSocial: "BLANVER FARMOQUIMICA E FARMACEUTICA S.A.", cnpj: "49686276000127", expediente: "400001", idBulaPacienteProtegido: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3", idBulaProfissionalProtegido: "c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6", dataAtualizacao: "2023-11-15" }
    ], totalElements: 1, number: 0, size: 10, totalPages: 1
  },
  "search-advil": {
    content: [
      { numProcesso: "25351400358202201", nomeProduto: "ADVIL", razaoSocial: "PF CONSUMER HEALTHCARE BRAZIL LTDA", cnpj: "43585865000132", expediente: "500001", idBulaPacienteProtegido: "a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5", idBulaProfissionalProtegido: "d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2", dataAtualizacao: "2024-04-01" },
      { numProcesso: "25351400604202217", nomeProduto: "ADVIL 12H", razaoSocial: "PF CONSUMER HEALTHCARE BRAZIL LTDA", cnpj: "43585865000132", expediente: "500002", idBulaPacienteProtegido: "b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6", idBulaProfissionalProtegido: "e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3", dataAtualizacao: "2024-04-01" }
    ], totalElements: 3, number: 0, size: 10, totalPages: 1
  },
  "search-ritalina": {
    content: [
      { numProcesso: "2599200126855", nomeProduto: "RITALINA", razaoSocial: "NOVARTIS BIOCIENCIAS S.A", cnpj: "56994502000161", expediente: "600001", idBulaPacienteProtegido: "c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7", idBulaProfissionalProtegido: "f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4", dataAtualizacao: "2024-05-01" }
    ], totalElements: 1, number: 0, size: 10, totalPages: 1
  },
  "search-dipirona": {
    content: [
      { numProcesso: "253510307620181", nomeProduto: "DIPIRONA MONOIDRATADA", razaoSocial: "EMS S/A", cnpj: "57507378000220", expediente: "700001", idBulaPacienteProtegido: "d5e6f7a8b9c0d5e6f7a8b9c0d5e6f7a8", idBulaProfissionalProtegido: "a8b9c0d5e6f7a8b9c0d5e6f7a8b9c0d5", dataAtualizacao: "2023-09-01" },
      { numProcesso: "25351727581201990", nomeProduto: "DIPIRONA MONOIDRATADA", razaoSocial: "GERMED FARMACEUTICA LTDA", cnpj: "44734671000151", expediente: "700002", idBulaPacienteProtegido: "e6f7a8b9c0d5e6f7a8b9c0d5e6f7a8b9", idBulaProfissionalProtegido: "b9c0d5e6f7a8b9c0d5e6f7a8b9c0d5e6", dataAtualizacao: "2023-08-15" }
    ], totalElements: 2, number: 0, size: 10, totalPages: 1
  },
  "search-amoxicilina": {
    content: [
      { numProcesso: "25351534966201115", nomeProduto: "AMOXICILINA", razaoSocial: "BRAINFARMA INDUSTRIA QUIMICA E FARMACEUTICA S.A", cnpj: "03560944000134", expediente: "800001", idBulaPacienteProtegido: "f7a8b9c0d1e2f7a8b9c0d1e2f7a8b9c0", idBulaProfissionalProtegido: "c0d1e2f7a8b9c0d1e2f7a8b9c0d1e2f7", dataAtualizacao: "2023-07-01" },
      { numProcesso: "25351112705200613", nomeProduto: "AMOXICILINA", razaoSocial: "PRATI DONADUZZI CIA LTDA", cnpj: "02816696000187", expediente: "800002", idBulaPacienteProtegido: "a8b9c0d1e2f3a8b9c0d1e2f3a8b9c0d1", idBulaProfissionalProtegido: "d1e2f3a8b9c0d1e2f3a8b9c0d1e2f3a8", dataAtualizacao: "2023-06-01" }
    ], totalElements: 2, number: 0, size: 10, totalPages: 1
  },
  "search-ibuprofeno": {
    content: [
      { numProcesso: "25351080692202315", nomeProduto: "IBUPROFENO", razaoSocial: "VITAMEDIC INDUSTRIA FARMACEUTICA LTDA", cnpj: "03664441000131", expediente: "900001", idBulaPacienteProtegido: "b9c0d1e2f3a4b9c0d1e2f3a4b9c0d1e2", idBulaProfissionalProtegido: "e2f3a4b9c0d1e2f3a4b9c0d1e2f3a4b9", dataAtualizacao: "2024-06-01" },
      { numProcesso: "25351641146200816", nomeProduto: "IBUPROFENO", razaoSocial: "GERMED FARMACEUTICA LTDA", cnpj: "44734671000151", expediente: "900002", idBulaPacienteProtegido: "c0d1e2f3a4b5c0d1e2f3a4b5c0d1e2f3", idBulaProfissionalProtegido: "f3a4b5c0d1e2f3a4b5c0d1e2f3a4b5c0", dataAtualizacao: "2023-05-01" }
    ], totalElements: 2, number: 0, size: 10, totalPages: 1
  },
  "search-omeprazol": {
    content: [
      { numProcesso: "25351693344201480", nomeProduto: "OMEPRAZOL", razaoSocial: "SANOFI MEDLEY FARMACEUTICA LTDA.", cnpj: "56998982000220", expediente: "1000001", idBulaPacienteProtegido: "d1e2f3a4b5c6d1e2f3a4b5c6d1e2f3a4", idBulaProfissionalProtegido: "a4b5c6d1e2f3a4b5c6d1e2f3a4b5c6d1", dataAtualizacao: "2024-01-10" }
    ], totalElements: 1, number: 0, size: 10, totalPages: 1
  },
  "search-buscopan": {
    content: [
      { numProcesso: "25351898921202008", nomeProduto: "BUSCOPAN COMPOSTO", razaoSocial: "COSMED INDUSTRIA DE COSMETICOS E MEDICAMENTOS S.A.", cnpj: "60716075000190", expediente: "1100001", idBulaPacienteProtegido: "e2f3a4b5c6d7e2f3a4b5c6d7e2f3a4b5", idBulaProfissionalProtegido: "b5c6d7e2f3a4b5c6d7e2f3a4b5c6d7e2", dataAtualizacao: "2023-10-01" },
      { numProcesso: "25351042897202122", nomeProduto: "BUSCOPAN PEDIATRICO", razaoSocial: "COSMED INDUSTRIA DE COSMETICOS E MEDICAMENTOS S.A.", cnpj: "60716075000190", expediente: "1100002", idBulaPacienteProtegido: "f3a4b5c6d7e8f3a4b5c6d7e8f3a4b5c6", idBulaProfissionalProtegido: "c6d7e8f3a4b5c6d7e8f3a4b5c6d7e8f3", dataAtualizacao: "2023-09-15" }
    ], totalElements: 3, number: 0, size: 10, totalPages: 1
  }
};

const details = {
  "details-novalgina": {
    numProcesso: "25351617747202347", nomeProduto: "NOVALGINA", razaoSocial: "OPELLA HEALTHCARE BRAZIL LTDA", cnpj: "56998982000141",
    tarja: "TARJA VERMELHA", principioAtivo: "dipirona monoidratada",
    classesTerapeuticas: [{ descricao: "ANALGESICOS NAO NARCOTICOS" }],
    idBulaPacienteProtegido: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", idBulaProfissionalProtegido: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3",
    dataAtualizacao: "2024-03-15",
    apresentacoes: [
      { descricao: "500MG/ML GOTAS 10 ML" }, { descricao: "500MG COMPRIMIDO 10 UNIDADES" },
      { descricao: "500MG/ML SOLUCAO INJETAVEL 5 ML" }, { descricao: "50MG/ML SOLUCAO ORAL 100 ML" }
    ]
  },
  "details-tylenol": {
    numProcesso: "25351464826202349", nomeProduto: "TYLENOL", razaoSocial: "KENVUE LTDA.", cnpj: "60408075000152",
    tarja: "ISENTO DE PRESCRICAO", principioAtivo: "PARACETAMOL",
    classesTerapeuticas: [{ descricao: "ANALGESICOS NAO NARCOTICOS" }],
    idBulaPacienteProtegido: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6", idBulaProfissionalProtegido: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1",
    dataAtualizacao: "2024-01-20",
    apresentacoes: [
      { descricao: "750MG COMPRIMIDO REVESTIDO 20 UNIDADES" }, { descricao: "500MG COMPRIMIDO REVESTIDO 20 UNIDADES" },
      { descricao: "160MG/5ML SUSPENSAO ORAL 15ML" }
    ]
  },
  "details-amoxil": {
    numProcesso: "2599202214972", nomeProduto: "AMOXIL", razaoSocial: "GLAXOSMITHKLINE BRASIL LTDA", cnpj: "33247377000110",
    tarja: "TARJA VERMELHA", principioAtivo: "AMOXICILINA TRIHIDRATADA",
    classesTerapeuticas: [{ descricao: "PENICILINA DE AMPLO ESPECTRO" }],
    idBulaPacienteProtegido: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", idBulaProfissionalProtegido: "b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
    dataAtualizacao: "2023-12-01",
    apresentacoes: [
      { descricao: "500MG CAPSULAS 21 UNIDADES" }, { descricao: "875MG COMPRIMIDOS 14 UNIDADES" },
      { descricao: "400MG/5ML PO P/ SUSP ORAL FR 60ML" }, { descricao: "250MG/5ML PO P/ SUSP ORAL FR 60ML" }
    ]
  },
  "details-rivotril": {
    numProcesso: "25351537388202183", nomeProduto: "RIVOTRIL", razaoSocial: "BLANVER FARMOQUIMICA E FARMACEUTICA S.A.", cnpj: "49686276000127",
    tarja: "TARJA PRETA", principioAtivo: "CLONAZEPAM",
    classesTerapeuticas: [{ descricao: "ANTICONVULSIVANTES" }, { descricao: "BENZODIAZEPINICOS" }],
    idBulaPacienteProtegido: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3", idBulaProfissionalProtegido: "c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6",
    dataAtualizacao: "2023-11-15",
    apresentacoes: [
      { descricao: "0,5MG COMPRIMIDO 30 UNIDADES" }, { descricao: "2MG COMPRIMIDO 30 UNIDADES" },
      { descricao: "2,5MG/ML SOLUCAO ORAL 10ML" }
    ]
  },
  "details-ritalina": {
    numProcesso: "2599200126855", nomeProduto: "RITALINA", razaoSocial: "NOVARTIS BIOCIENCIAS S.A", cnpj: "56994502000161",
    tarja: "TARJA PRETA", principioAtivo: "CLORIDRATO DE METILFENIDATO",
    classesTerapeuticas: [{ descricao: "PSICOANALETICOS" }, { descricao: "ESTIMULANTES DO SISTEMA NERVOSO CENTRAL" }],
    idBulaPacienteProtegido: "c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7", idBulaProfissionalProtegido: "f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4",
    dataAtualizacao: "2024-05-01",
    apresentacoes: [
      { descricao: "10MG COMPRIMIDO 30 UNIDADES" }, { descricao: "20MG COMPRIMIDO 20 UNIDADES" }
    ]
  },
  "details-advil": {
    numProcesso: "25351400358202201", nomeProduto: "ADVIL", razaoSocial: "PF CONSUMER HEALTHCARE BRAZIL LTDA", cnpj: "43585865000132",
    tarja: "TARJA VERMELHA", principioAtivo: "IBUPROFENO",
    classesTerapeuticas: [{ descricao: "ANALGESICOS NAO NARCOTICOS" }, { descricao: "ANTINFLAMATORIOS NAO ESTEROIDAIS" }],
    idBulaPacienteProtegido: "a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5", idBulaProfissionalProtegido: "d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2",
    dataAtualizacao: "2024-04-01",
    apresentacoes: [
      { descricao: "200MG CAPSULA MOLE 20 UNIDADES" }, { descricao: "400MG COMPRIMIDO REVESTIDO 20 UNIDADES" },
      { descricao: "600MG COMPRIMIDO REVESTIDO 20 UNIDADES" }
    ]
  }
};

const bulaLinks = {
  "bula-link-paciente": { link: "https://consultas.anvisa.gov.br/api/consulta/medicamentos/arquivo/bula/parecer/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4/?Authorization=Guest" },
  "bula-link-profissional": { link: "https://consultas.anvisa.gov.br/api/consulta/medicamentos/arquivo/bula/parecer/f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3/?Authorization=Guest" },
  "bula-link-generic": { link: "https://consultas.anvisa.gov.br/api/consulta/medicamentos/arquivo/bula/parecer/c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6/?Authorization=Guest" }
};

const all = { ...searches, ...details, ...bulaLinks };
let count = 0;
for (const [key, value] of Object.entries(all)) {
  fs.writeFileSync(path.join(dir, key + ".json"), JSON.stringify(value, null, 2), "utf8");
  count++;
}
console.log("Written", count, "fixture files to", dir);
