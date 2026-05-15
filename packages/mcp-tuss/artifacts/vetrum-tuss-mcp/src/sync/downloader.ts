const RETRY_DELAYS = [1000, 2000, 4000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadFile(url: string): Promise<Buffer> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "mcpassure-mcp-tuss/1.1 (https://github.com/mcpassure/mcp-tuss)" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_DELAYS.length) {
        console.error(`[downloader] Tentativa ${attempt + 1} falhou: ${lastError.message}. Aguardando ${RETRY_DELAYS[attempt]}ms...`);
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }
  throw lastError ?? new Error(`Falha ao baixar: ${url}`);
}

export async function detectNewVersion(
  pageUrl: string,
  resourcePattern: RegExp
): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "mcpassure-mcp-tuss/1.1" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const matches = html.match(resourcePattern);
    if (!matches || matches.length === 0) return null;
    return matches[0];
  } catch {
    return null;
  }
}

export async function findCorrelacaoUrl(pageUrl: string): Promise<string | null> {
  const pattern =
    /https?:\/\/[^"'\s]+CorrelaoTUSS[^"'\s]+\.xlsx/gi;
  return detectNewVersion(pageUrl, pattern);
}

export async function findAnexoIUrl(pageUrl: string): Promise<string | null> {
  const pattern =
    /https?:\/\/[^"'\s]+Anexo_I_Rol[^"'\s]+\.xlsx/gi;
  return detectNewVersion(pageUrl, pattern);
}
