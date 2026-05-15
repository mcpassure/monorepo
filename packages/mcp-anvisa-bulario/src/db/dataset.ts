import Database from "better-sqlite3";
import type {
  Apresentacao,
  BulaLink,
  BularioSource,
  MedicamentoDetalhes,
  MedicamentoResumo,
  SearchByClasseTerapeuticaParams,
  SearchByNameParams,
  SearchByPrincipalAtivoParams,
  SearchByTarjaParams,
  Tarja,
} from "../sources/types.js";

// ── Internal row type ─────────────────────────────────────────────────────────

type MedicamentoRow = {
  rowid: number;
  tipo_produto: string | null;
  nome_produto: string;
  data_finalizacao: string | null;
  categoria_regulatoria: string | null;
  numero_registro: string | null;
  data_vencimento: string | null;
  numero_processo: string | null;
  classe_terapeutica: string | null;
  empresa: string | null;
  situacao_registro: string | null;
  principio_ativo: string | null;
};

// ── Tarja normalisation ───────────────────────────────────────────────────────

// v2.0: CATEGORIA_REGULATORIA no CSV não mapeia diretamente para LIVRE/VERMELHA/PRETA.
// As categorias reais do CSV são: "Similar", "Novo", "Genérico", "BAIXO RISCO", etc.
// O campo tarja (da Portaria 344/98) NÃO está disponível no CSV de dados abertos.
// Mapeamos heuristicamente pelo tipo de produto e categoria para fins de filtragem.
const TARJA_KEYWORDS: Array<{ pattern: RegExp; tarja: Tarja }> = [
  { pattern: /psicotr[oó]pic|entorpecente|controle especial/i, tarja: "PRETA" },
  { pattern: /antimicrobiano|antibiótico|antibi[oó]tic/i, tarja: "VERMELHA" },
  { pattern: /baixo risco|isento/i, tarja: "LIVRE" },
];

function inferTarja(row: MedicamentoRow): Tarja | undefined {
  const text = [row.categoria_regulatoria, row.classe_terapeutica].filter(Boolean).join(" ");
  for (const { pattern, tarja } of TARJA_KEYWORDS) {
    if (pattern.test(text)) return tarja;
  }
  return undefined;
}

function rowToResumo(row: MedicamentoRow): MedicamentoResumo {
  return {
    numProcesso: row.numero_processo ?? row.numero_registro ?? String(row.rowid),
    nomeProduto: row.nome_produto,
    empresa: row.empresa ?? "",
    dataAtualizacao: row.data_finalizacao ?? undefined,
  };
}

function rowToDetalhes(row: MedicamentoRow): MedicamentoDetalhes {
  return {
    numProcesso: row.numero_processo ?? row.numero_registro ?? String(row.rowid),
    nomeProduto: row.nome_produto,
    empresa: row.empresa ?? "",
    dataAtualizacao: row.data_finalizacao ?? undefined,
    tarja: inferTarja(row),
    classesTerapeuticas: row.classe_terapeutica ? [row.classe_terapeutica] : undefined,
    principioAtivo: row.principio_ativo ?? undefined,
    numeroRegistro: row.numero_registro ?? undefined,
  };
}

// ── BularioDatasetSource ──────────────────────────────────────────────────────

export class BularioDatasetSource implements BularioSource {
  readonly name = "anvisa_dados_abertos_sqlite";
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
    this.db.pragma("journal_mode = WAL");
  }

  searchByName(params: SearchByNameParams): Promise<MedicamentoResumo[]> {
    const { nome, pagina = 1, count = 10 } = params;
    const offset = (pagina - 1) * count;
    const term = `%${nome}%`;

    const rows = this.db
      .prepare(
        `SELECT rowid, * FROM medicamentos
         WHERE nome_produto LIKE ? COLLATE NOCASE
         LIMIT ? OFFSET ?`
      )
      .all(term, count, offset) as MedicamentoRow[];

    return Promise.resolve(rows.map(rowToResumo));
  }

  searchByPrincipalAtivo(params: SearchByPrincipalAtivoParams): Promise<MedicamentoResumo[]> {
    const { principioAtivo, pagina = 1, count = 10 } = params;
    const offset = (pagina - 1) * count;
    const term = `%${principioAtivo}%`;

    const rows = this.db
      .prepare(
        `SELECT rowid, * FROM medicamentos
         WHERE principio_ativo LIKE ? COLLATE NOCASE
         LIMIT ? OFFSET ?`
      )
      .all(term, count, offset) as MedicamentoRow[];

    return Promise.resolve(rows.map(rowToResumo));
  }

  searchByClasseTerapeutica(params: SearchByClasseTerapeuticaParams): Promise<MedicamentoResumo[]> {
    const { classeTerapeutica, pagina = 1, count = 10 } = params;
    const offset = (pagina - 1) * count;
    const term = `%${classeTerapeutica}%`;

    const rows = this.db
      .prepare(
        `SELECT rowid, * FROM medicamentos
         WHERE classe_terapeutica LIKE ? COLLATE NOCASE
         LIMIT ? OFFSET ?`
      )
      .all(term, count, offset) as MedicamentoRow[];

    return Promise.resolve(rows.map(rowToResumo));
  }

  searchByTarja(params: SearchByTarjaParams): Promise<MedicamentoResumo[]> {
    const { tarja, pagina = 1, count = 10 } = params;
    const offset = (pagina - 1) * count;

    // Heuristic tarja mapping — see inferTarja above
    let whereClause: string;
    let _bindValue: string;
    if (tarja === "PRETA") {
      whereClause =
        "(classe_terapeutica LIKE ? OR categoria_regulatoria LIKE ?) " +
        "AND (classe_terapeutica LIKE '%PSICOTR%' OR classe_terapeutica LIKE '%ENTORP%' OR " +
        "classe_terapeutica LIKE '%CONTROLE ESPECIAL%')";
      _bindValue = "%";
    } else if (tarja === "VERMELHA") {
      whereClause =
        "(classe_terapeutica LIKE '%ANTIMICROBIANO%' OR classe_terapeutica LIKE '%ANTIBI%' " +
        "OR categoria_regulatoria IN ('Similar', 'Novo', 'Genérico', 'Biológico')) " +
        "AND (classe_terapeutica NOT LIKE '%PSICOTR%')";
      _bindValue = "%";
    } else {
      // LIVRE — baixo risco
      whereClause =
        "categoria_regulatoria LIKE '%BAIXO RISCO%' OR categoria_regulatoria LIKE '%ISENTO%'";
      _bindValue = "%";
    }

    let rows: MedicamentoRow[];
    if (tarja === "VERMELHA" || tarja === "PRETA") {
      rows = this.db
        .prepare(`SELECT rowid, * FROM medicamentos WHERE ${whereClause} LIMIT ? OFFSET ?`)
        .all(count, offset) as MedicamentoRow[];
    } else {
      rows = this.db
        .prepare(`SELECT rowid, * FROM medicamentos WHERE ${whereClause} LIMIT ? OFFSET ?`)
        .all(count, offset) as MedicamentoRow[];
    }

    return Promise.resolve(rows.map(rowToResumo));
  }

  getDetalhes(numProcesso: string): Promise<MedicamentoDetalhes> {
    const row = (this.db
      .prepare(
        `SELECT rowid, * FROM medicamentos
         WHERE numero_processo = ? OR numero_registro = ?
         LIMIT 1`
      )
      .get(numProcesso, numProcesso) ?? null) as MedicamentoRow | null;

    if (!row) {
      return Promise.reject(
        new Error(`Medicamento não encontrado para numProcesso: ${numProcesso}`)
      );
    }

    return Promise.resolve(rowToDetalhes(row));
  }

  getApresentacoes(numProcesso: string): Promise<Apresentacao[]> {
    // O CSV de dados abertos não contém apresentações detalhadas.
    // Retornamos a categoria regulatória como informação disponível.
    const row = (this.db
      .prepare(
        `SELECT rowid, * FROM medicamentos
         WHERE numero_processo = ? OR numero_registro = ?
         LIMIT 1`
      )
      .get(numProcesso, numProcesso) ?? null) as MedicamentoRow | null;

    if (!row) return Promise.resolve([]);

    const apresentacoes: Apresentacao[] = [];
    if (row.categoria_regulatoria) {
      apresentacoes.push({
        descricao: `Categoria: ${row.categoria_regulatoria}`,
      });
    }
    if (row.situacao_registro) {
      apresentacoes.push({
        descricao: `Situação: ${row.situacao_registro}`,
      });
    }
    if (row.principio_ativo) {
      apresentacoes.push({
        descricao: `Princípio Ativo: ${row.principio_ativo}`,
      });
    }

    return Promise.resolve(apresentacoes);
  }

  getBulaLink(_idBulaProtegido: string): Promise<BulaLink> {
    // Não disponível no CSV de dados abertos (v2.0 — texto completo em v2.1 via Worker)
    return Promise.resolve({ id: _idBulaProtegido });
  }

  close(): Promise<void> {
    this.db.close();
    return Promise.resolve();
  }
}
