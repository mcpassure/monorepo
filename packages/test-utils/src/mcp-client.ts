import { spawn, ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

export class McpTestClient {
  private process: ChildProcess | null = null;
  private rl: ReturnType<typeof createInterface> | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  async start(binaryPath: string, env: Record<string, string> = {}): Promise<void> {
    this.process = spawn("node", [binaryPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });

    this.rl = createInterface({ input: this.process.stdout! });

    this.rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && this.pendingRequests.has(msg.id)) {
          const { resolve, reject } = this.pendingRequests.get(msg.id)!;
          this.pendingRequests.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch {}
    });

    // Wait for server to be ready
    await new Promise((r) => setTimeout(r, 1000));
  }

  async sendRequest(method: string, params: unknown = {}): Promise<unknown> {
    if (!this.process) throw new Error("Not started");
    const id = ++this.requestId;
    const req = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    this.process.stdin!.write(req + "\n");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Timeout waiting for ${method} (id=${id})`)),
        15000,
      );
      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });
    });
  }

  sendNotification(method: string, params: unknown = {}): void {
    if (!this.process) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params });
    this.process.stdin!.write(msg + "\n");
  }

  async stop(): Promise<void> {
    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error("Client stopped"));
    }
    this.pendingRequests.clear();
    if (this.rl) { this.rl.close(); this.rl = null; }
    if (this.process) { this.process.kill(); this.process = null; }
  }
}
