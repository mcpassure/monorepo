// Mapeamento tipo legível (input da tool) → códigos TP_UNIDADE do DATASUS
// Referência: dicionário de dados CNES/DATASUS grupo ST

export const TIPO_PARA_CODIGOS: Record<string, string[]> = {
  hospital: ["05", "07", "15", "36", "62", "69", "73", "81", "84"],
  UBS: ["01", "02"],
  UPA: ["70"],
  clinica: ["39", "40", "43", "61", "77"],
  laboratorio: ["14", "17", "27", "44"],
  farmacia: ["20", "21", "22"],
  SAMU: ["72"],
  consultorio: ["39", "43"],
  apoio_saude: ["36", "45", "64"],
  atencao_especifica: ["15", "36", "62", "69"],
  domiciliar: ["86"],
  outro: [],
};

export function tipoParaCodigos(tipo: string): string[] {
  return TIPO_PARA_CODIGOS[tipo] ?? [];
}

export const CODIGO_PARA_DESCRICAO: Record<string, string> = {
  "01": "Posto de Saúde",
  "02": "Centro de Saúde / Unidade Básica",
  "05": "Hospital Geral",
  "07": "Hospital Especializado",
  "14": "Laboratório de Saúde Pública",
  "15": "Unidade de Apoio Diagnose e Terapia (SADT Isolado)",
  "17": "Laboratório de Citologia",
  "20": "Farmácia",
  "21": "Farmácia de Manipulação",
  "22": "Drogaria",
  "27": "Laboratório de Prótese Dentária",
  "36": "Clínica / Centro de Especialidade",
  "39": "Unidade de Saúde da Família",
  "40": "Consultório Isolado",
  "43": "Unidade Móvel Fluvial",
  "44": "Serviço de Apoio Diagnóstico e Terapêutico (SADT)",
  "45": "Centro de Atenção Hemoterapia e ou Hematológica",
  "61": "Centro de Atenção Psicossocial",
  "62": "Hospital Dia Isolado",
  "64": "Central de Regulação de Serviços de Saúde",
  "69": "Centro de Atenção à Saúde Indígena",
  "70": "Unidade de Pronto Atendimento (UPA)",
  "72": "Unidade de Atenção em Regime Residencial",
  "73": "Pronto-Socorro Geral",
  "77": "Servico de Atenção Domiciliar Isolado (Home Care)",
  "81": "Laboratório de Saúde Pública",
  "84": "Central de Gestão em Saúde",
  "86": "Serviço de Atenção Domiciliar",
};
