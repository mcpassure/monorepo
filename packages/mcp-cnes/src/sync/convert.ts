import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export class BlastNaoEncontradoError extends Error {
  constructor() {
    super(
      "Executável 'blast' não encontrado no PATH.\n" +
        "Instale antes de executar a sincronização:\n" +
        "  macOS:   brew install blast-datasus\n" +
        "  Ubuntu:  sudo apt install blast\n" +
        "  Windows: baixe o binário em https://github.com/datasus/blast/releases"
    );
    this.name = "BlastNaoEncontradoError";
  }
}

function blastDisponivel(): boolean {
  try {
    execSync("blast --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function converterDbcParaCsv(dbcPath: string, csvPath: string): void {
  if (!blastDisponivel()) throw new BlastNaoEncontradoError();
  if (!existsSync(dbcPath)) throw new Error(`Arquivo DBC não encontrado: ${dbcPath}`);
  execSync(`blast "${dbcPath}" "${csvPath}"`, { stdio: "pipe" });
}
