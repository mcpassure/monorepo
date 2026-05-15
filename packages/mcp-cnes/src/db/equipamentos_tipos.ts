// Mapeamento código de equipamento DATASUS → descrição legível
// Referência: dicionário de dados CNES/DATASUS grupo EQ

export const EQUIP_CODIGO_PARA_DESCRICAO: Record<string, string> = {
  "001": "Aparelho de Anestesia",
  "002": "Aparelho de Hemodiálise",
  "003": "Arco Cirúrgico / Intensificador de Imagem",
  "004": "Autoclave",
  "005": "Bisturi Elétrico",
  "006": "Bisturi de Argônio",
  "007": "Bisturi Ultrassônico",
  "008": "Bomba de Infusão",
  "009": "Cama de UTI",
  "010": "Centro Cirúrgico (sala)",
  "011": "Colposcópio",
  "012": "Densitômetro Ósseo",
  "013": "Ecocardiograma",
  "014": "Eletrocardiograma",
  "015": "Eletroencefalograma",
  "016": "Endoscópio",
  "017": "Equipamento de Radioterapia",
  "018": "Espirômetro",
  "019": "Foco Cirúrgico",
  "020": "Hemodinâmica (sala)",
  "021": "Incubadora",
  "022": "Laparoscópio",
  "023": "Laser",
  "024": "Litotriptor",
  "025": "Mamógrafo",
  "026": "Microscópio Cirúrgico",
  "027": "Monitor Multiparamétrico",
  "028": "Oxímetro de Pulso",
  "029": "Raio X Convencional",
  "030": "Raio X Digital",
  "031": "Ressonância Magnética",
  "032": "Tomógrafo Computadorizado",
  "033": "Ultrassonógrafo",
  "034": "Ventilador Pulmonar",
  "035": "Videolaparoscópio",
};

export function equipCodParaDescricao(codigo: string): string {
  return EQUIP_CODIGO_PARA_DESCRICAO[codigo] ?? `Equipamento código ${codigo}`;
}
