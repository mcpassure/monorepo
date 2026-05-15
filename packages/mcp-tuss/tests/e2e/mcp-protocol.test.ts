import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { McpTestClient } from "@mcpassure/test-utils";

const binPath = path.resolve(import.meta.dirname, "../../dist/index.js");
const dbPath = path.resolve(import.meta.dirname, "../../tuss_real.db");
const hasDb = existsSync(dbPath) || existsSync(path.join(process.env.APPDATA ?? "", "mcpassure", "tuss", "tuss.db"));
const hasBin = existsSync(binPath);

describe.skipIf(!hasBin || !hasDb)("MCP TUSS — E2E protocol", () => {
  const client = new McpTestClient();

  beforeAll(async () => {
    const env: Record<string, string> = {};
    if (existsSync(dbPath)) {
      env.MCPASSURE_DB_PATH = dbPath;
    }
    await client.start(binPath, env);
    const result = await client.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "e2e-test", version: "0.0.1" },
    }) as { serverInfo: { name: string }; protocolVersion: string };
    // Send initialized notification to complete handshake
    client.sendNotification("notifications/initialized", {});
    return result;
  });

  afterAll(async () => {
    await client.stop();
  });

  it("handshake initialize", async () => {
    const result = await client.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "e2e-test", version: "0.0.1" },
    }) as { serverInfo: { name: string }; protocolVersion: string };
    expect(result.serverInfo.name).toBe("@mcpassure/mcp-tuss");
    expect(result.protocolVersion).toBeDefined();
  });

  it("tools/list retorna tools", async () => {
    const result = await client.sendRequest("tools/list") as { tools: Array<{ name: string }> };
    expect(result.tools).toBeInstanceOf(Array);
    expect(result.tools.length).toBeGreaterThan(0);
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("buscar_procedimento_tuss");
  });

  it("tools/call buscar_procedimento_tuss", async () => {
    const result = await client.sendRequest("tools/call", {
      name: "buscar_procedimento_tuss",
      arguments: { query: "consulta" },
    }) as { content: unknown; structuredContent?: unknown };
    expect(result.content).toBeDefined();
  });
});
