import * as http from "node:http";
import * as net from "node:net";

export type RequestHandler = (
  req: http.IncomingMessage,
  respond: (status: number, body: unknown, delay?: number) => void
) => void;

export type MockServer = {
  url: string;
  port: number;
  setHandler: (handler: RequestHandler) => void;
  getRequestLog: () => Array<{ method: string; url: string; body?: string }>;
  clearLog: () => void;
  close: () => Promise<void>;
};

function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close((err) => {
        if (err) reject(err);
        else resolve(addr.port);
      });
    });
  });
}

export async function createMockHttpServer(): Promise<MockServer> {
  const port = await getRandomPort();
  const requestLog: Array<{ method: string; url: string; body?: string }> = [];
  let currentHandler: RequestHandler = (_req, respond) => respond(200, {});

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requestLog.push({
        method: req.method ?? "GET",
        url: req.url ?? "/",
        body: body || undefined,
      });
      currentHandler(req, (status, responseBody, delay = 0) => {
        const send = () => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(responseBody));
        };
        if (delay > 0) setTimeout(send, delay);
        else send();
      });
    });
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    setHandler: (handler) => {
      currentHandler = handler;
    },
    getRequestLog: () => [...requestLog],
    clearLog: () => {
      requestLog.length = 0;
    },
    close: () =>
      new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

// Preset handlers for common test scenarios
export const handlers = {
  ok:
    (body: unknown): RequestHandler =>
    (_req, respond) =>
      respond(200, body),

  sequence: (...statusCodes: number[]): RequestHandler => {
    let i = 0;
    return (_req, respond) =>
      respond(statusCodes[i < statusCodes.length ? i++ : statusCodes.length - 1] ?? 200, {});
  },

  alwaysStatus:
    (status: number, body: unknown = {}): RequestHandler =>
    (_req, respond) =>
      respond(status, body),

  slow:
    (body: unknown, delayMs: number): RequestHandler =>
    (_req, respond) =>
      respond(200, body, delayMs),
};
