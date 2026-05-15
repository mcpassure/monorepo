import * as http from "node:http";
import * as https from "node:https";
import type { Readable } from "node:stream";

const BOT_UA = "MCPAssure-TUSS-Bot/0.1.0 (+https://github.com/mcpassure/mcp-tuss)";

/**
 * Em ambientes de desenvolvimento com proxy SSL (Norton, Zscaler, etc.) que
 * interceptam TLS com CA própria não confiada pelo bundle do Node.js:
 * set MCPASSURE_INSECURE_TLS=1
 *
 * Em CI (Linux GitHub Actions) e produção: NÃO usar esta variável.
 */
if (process.env.MCPASSURE_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export interface HttpDownload {
  getStream(url: string): Promise<Readable>;
  headCheck(url: string): Promise<{ ok: boolean; status: number; size?: number }>;
  close?(): Promise<void>;
}

export class FetchHttpDownload implements HttpDownload {
  private readonly rateLimitMs: number;
  private lastRequest = 0;

  constructor(rateLimitMs?: number) {
    this.rateLimitMs = rateLimitMs ?? Number(process.env.MCPASSURE_RATE_LIMIT_MS ?? "2000");
  }

  async headCheck(url: string): Promise<{ ok: boolean; status: number; size?: number }> {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": BOT_UA },
        signal: AbortSignal.timeout(30_000),
      });
      const size = res.headers.get("content-length");
      return { ok: res.ok, status: res.status, size: size ? Number(size) : undefined };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  getStream(url: string): Promise<Readable> {
    const now = Date.now();
    const wait = this.rateLimitMs - (now - this.lastRequest);

    const doRequest = (): Promise<Readable> =>
      new Promise((resolve, reject) => {
        this.lastRequest = Date.now();
        const protocol = url.startsWith("https") ? https : http;
        const req = protocol.get(
          url,
          { headers: { "User-Agent": BOT_UA }, timeout: 300_000 },
          (res) => {
            // Follow up to 3 redirects
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              res.resume();
              this.lastRequest = 0; // reset so next call doesn't wait
              this.getStream(res.headers.location).then(resolve).catch(reject);
              return;
            }
            if (!res.statusCode || res.statusCode >= 400) {
              let body = "";
              res.on("data", (chunk: Buffer) => (body += chunk.toString()));
              res.on("end", () =>
                reject(new Error(`HTTP ${res.statusCode} — ${url}\nBody: ${body.slice(0, 300)}`))
              );
              return;
            }
            resolve(res);
          }
        );
        req.on("timeout", () => {
          req.destroy();
          reject(new Error(`Request timeout after 300s — ${url}`));
        });
        req.on("error", reject);
      });

    if (wait > 0) {
      return new Promise((r) => setTimeout(r, wait)).then(doRequest);
    }
    return doRequest();
  }
}
