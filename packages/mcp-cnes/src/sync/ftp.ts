import { createWriteStream, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "basic-ftp";

// MCPASSURE_FTP_HOST takes priority; VETRUM_FTP_HOST kept as fallback (deprecated, removed in v0.2.0)
const FTP_HOST =
  process.env.MCPASSURE_FTP_HOST ?? process.env.VETRUM_FTP_HOST ?? "ftp.datasus.gov.br";
const BASE_PATH = "/dissemin/publicos/CNES/200508_/Dados";

export type ArquivoFtp = {
  nome: string;
  grupo: string;
  uf: string;
  competencia: string; // AAAAMM
};

// Mock data usado quando MCPASSURE_FTP_MOCK=1 — simula resposta do FTP DATASUS
// VETRUM_FTP_MOCK=1 também funciona como fallback (deprecated, removido em v0.2.0)
const MOCK_ARQUIVOS: Record<string, ArquivoFtp[]> = {
  "ST/SP": [
    { nome: "STSP202501.dbc", grupo: "ST", uf: "SP", competencia: "202501" },
    { nome: "STSP202412.dbc", grupo: "ST", uf: "SP", competencia: "202412" },
  ],
  "LT/SC": [{ nome: "LTSC202501.dbc", grupo: "LT", uf: "SC", competencia: "202501" }],
  "EQ/RJ": [{ nome: "EQRJ202501.dbc", grupo: "EQ", uf: "RJ", competencia: "202501" }],
  "PF/SP": [{ nome: "PFSP202501.dbc", grupo: "PF", uf: "SP", competencia: "202501" }],
  "ST/SC": [{ nome: "STSC202501.dbc", grupo: "ST", uf: "SC", competencia: "202501" }],
};

// Conteúdo CSV mínimo usado no mock download (simula DBC convertido)
const MOCK_CSV_ST = `CO_CNES,NO_FANTASIA,NO_RAZAO_SOCIAL,TP_UNIDADE,NO_MUNICIPIO,SG_UF,CO_MUNICIPIO,NU_LATITUDE,NU_LONGITUDE,VINCULO_SUS,CO_NATUREZA_JUR,NU_CNPJ,NO_LOGRADOURO,NU_TELEFONE,TP_GESTAO
2077485,HOSPITAL DAS CLINICAS DA FMUSP,HOSPITAL DAS CLINICAS DA FMUSP,05,SAO PAULO,SP,355030,-23.558,-46.669,1,1023,60919110000126,AV DR ENEAS CARVALHO AGUIAR 255,1130693000,M
`;

export async function listarArquivos(grupo: string, uf: string): Promise<ArquivoFtp[]> {
  if (process.env.MCPASSURE_FTP_MOCK === "1" || process.env.VETRUM_FTP_MOCK === "1") {
    return MOCK_ARQUIVOS[`${grupo}/${uf}`] ?? [];
  }

  const client = new Client();
  try {
    await client.access({ host: FTP_HOST, user: "anonymous", password: "" });
    const path = `${BASE_PATH}/${grupo}/`;
    const lista = await client.list(path);
    const regex = new RegExp(`^${grupo}${uf}(\\d{4})(\\d{2})\\.dbc$`, "i");
    return lista
      .filter((f) => regex.test(f.name))
      .map((f) => {
        const m = f.name.match(regex);
        if (!m) return null;
        return { nome: f.name, grupo, uf, competencia: `${m[1]}${m[2]}` };
      })
      .filter((x): x is ArquivoFtp => x !== null)
      .sort((a, b) => b.competencia.localeCompare(a.competencia));
  } finally {
    client.close();
  }
}

export async function downloadArquivo(
  grupo: string,
  arquivo: string,
  destDir: string
): Promise<string> {
  if (process.env.MCPASSURE_FTP_MOCK === "1" || process.env.VETRUM_FTP_MOCK === "1") {
    const localPath = join(destDir, arquivo);
    // Cria arquivo DBC fake (conteúdo é CSV válido para o mapper ST)
    writeFileSync(localPath, MOCK_CSV_ST, "latin1");
    return localPath;
  }

  const client = new Client();
  try {
    await client.access({ host: FTP_HOST, user: "anonymous", password: "" });
    const remotePath = `${BASE_PATH}/${grupo}/${arquivo}`;
    const localPath = join(destDir, arquivo);
    const writeStream = createWriteStream(localPath);
    await client.downloadTo(writeStream, remotePath);
    return localPath;
  } finally {
    client.close();
  }
}
