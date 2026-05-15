import { describe, expect, it } from "vitest";
import {
  handleCategoriasServicos,
  handleScope,
  handleTiposEstabelecimento,
} from "../../src/resources/handlers.js";

describe("handleTiposEstabelecimento", () => {
  it("retorna URI cnes://tipos_estabelecimento, MIME json e lista de tipos", () => {
    const uri = new URL("cnes://tipos_estabelecimento");
    const result = handleTiposEstabelecimento(uri);

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("cnes://tipos_estabelecimento");
    expect(content.mimeType).toBe("application/json");

    const parsed = JSON.parse((content as { uri: string; text: string }).text) as {
      tipos_estabelecimento: unknown[];
    };
    expect(parsed.tipos_estabelecimento).toBeInstanceOf(Array);
    expect(parsed.tipos_estabelecimento.length).toBeGreaterThan(0);
    expect(parsed.tipos_estabelecimento[0]).toHaveProperty("codigo");
    expect(parsed.tipos_estabelecimento[0]).toHaveProperty("descricao");
  });
});

describe("handleCategoriasServicos", () => {
  it("retorna URI cnes://categorias_servicos, MIME json e lista de categorias", () => {
    const uri = new URL("cnes://categorias_servicos");
    const result = handleCategoriasServicos(uri);

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("cnes://categorias_servicos");
    expect(content.mimeType).toBe("application/json");

    const parsed = JSON.parse((content as { uri: string; text: string }).text) as {
      categorias_servicos: unknown[];
    };
    expect(parsed.categorias_servicos).toBeInstanceOf(Array);
    expect(parsed.categorias_servicos.length).toBeGreaterThan(0);
    expect(parsed.categorias_servicos[0]).toHaveProperty("codigo");
    expect(parsed.categorias_servicos[0]).toHaveProperty("descricao");
  });
});

describe("handleScope", () => {
  it("retorna URI cnes://scope, MIME text/markdown e conteúdo bilíngue", () => {
    const uri = new URL("cnes://scope");
    const result = handleScope(uri);

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0];
    expect(content.uri).toBe("cnes://scope");
    expect(content.mimeType).toBe("text/markdown");

    const text = (content as { uri: string; text: string }).text;
    expect(text).toContain("CNES");
    expect(text).toContain("DATASUS");
    expect(text).toContain("🇧🇷");
    expect(text).toContain("🇺🇸");
  });
});
