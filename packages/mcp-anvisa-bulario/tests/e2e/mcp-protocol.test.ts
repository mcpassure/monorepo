import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import path from "node:path";
import { McpTestClient } from "@mcpassure/test-utils";

const binPath = path.resolve(import.meta.dirname, "../../dist/index.js");

function defaultDbPath(): string {
  return process.platform === "win32"
    ? join(process.env.APPDATA ?? homedir(), "mcpassure", "anvisa-bulario", "bulario.db")
    : join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "mcpassure", "anvisa-bulario", "bulario.db");
}

const customDb = process.env.MCPASSURE_DB_PATH;
const hasDb = customDb ? existsSync(customDb) : existsSync(defaultDbPath());
const hasBin = existsSync(binPath);

describe.skipIf(!hasBin || !hasDb)("MCP ANVISA Bulário — E2E protocol", () => {
  const client = new McpTestClient();

  beforeAll(async () => {
    await client.start(binPath);
    await client.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "e2e-test", version: "0.0.1" },
    });
    client.sendNotification("notifications/initialized", {});
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
    expect(result.serverInfo.name).toBe("mcpassure-anvisa-bulario");
    expect(result.protocolVersion).toBeDefined();
  });

  it("tools/list retorna tools esperadas", async () => {
    const result = await client.sendRequest("tools/list") as { tools: Array<{ name: string }> };
    expect(result.tools).toBeInstanceOf(Array);
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("buscar_por_nome");
    expect(names).toContain("buscar_por_principio_ativo");
    expect(names).toContain("filtrar_por_tarja");
  });

  it("tools/call buscar_por_nome dipirona retorna resultados", async () => {
    const result = await client.sendRequest("tools/call", {
      name: "buscar_por_nome",
      arguments: { nome: "dipirona" },
    }) as { content: Array<{ text: string }> };
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });
});
