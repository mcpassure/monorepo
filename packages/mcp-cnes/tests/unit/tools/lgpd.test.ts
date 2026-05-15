import { afterEach, describe, expect, it } from "vitest";
import { maskCpf, shouldMask } from "../../../src/utils/lgpd.js";

describe("maskCpf", () => {
  it("mascara CPF com 11 dígitos corretamente", () => {
    expect(maskCpf("12345678901")).toBe("***.***.789-**");
  });

  it("mascara CPF com formatação (pontos/traço) corretamente", () => {
    expect(maskCpf("123.456.789-01")).toBe("***.***.789-**");
  });

  it("retorna *** para CPF com menos de 11 dígitos", () => {
    expect(maskCpf("1234567")).toBe("***");
  });

  it("retorna *** para CPF vazio", () => {
    expect(maskCpf("")).toBe("***");
  });

  it("retorna *** para string não numérica", () => {
    expect(maskCpf("abc")).toBe("***");
  });

  it("mascara CPF com zeros", () => {
    expect(maskCpf("00000000000")).toBe("***.***.000-**");
  });

  it("preserva dígitos 7-9 do CPF (posições 6,7,8 base-0)", () => {
    // CPF: 1 2 3 4 5 6 7 8 9 0 1
    //      0 1 2 3 4 5 6 7 8 9 10
    // Dígitos 6-8 = "789"
    expect(maskCpf("12345678901")).toBe("***.***.789-**");
  });
});

describe("shouldMask", () => {
  const originalEnv = process.env.MCPASSURE_LGPD_ALLOW_PII;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MCPASSURE_LGPD_ALLOW_PII;
    } else {
      process.env.MCPASSURE_LGPD_ALLOW_PII = originalEnv;
    }
  });

  it("retorna true (masking ativo) quando env var ausente", () => {
    delete process.env.MCPASSURE_LGPD_ALLOW_PII;
    expect(shouldMask()).toBe(true);
  });

  it("retorna false (masking desativado) quando MCPASSURE_LGPD_ALLOW_PII=cnes", () => {
    process.env.MCPASSURE_LGPD_ALLOW_PII = "cnes";
    expect(shouldMask()).toBe(false);
  });

  it("retorna false quando cnes está em lista com múltiplos datasets", () => {
    process.env.MCPASSURE_LGPD_ALLOW_PII = "tuss,cnes,anvisa";
    expect(shouldMask()).toBe(false);
  });

  it("retorna true quando somente outros datasets estão permitidos", () => {
    process.env.MCPASSURE_LGPD_ALLOW_PII = "tuss";
    expect(shouldMask()).toBe(true);
  });

  it("é case-insensitive para o valor cnes", () => {
    process.env.MCPASSURE_LGPD_ALLOW_PII = "CNES";
    expect(shouldMask()).toBe(false);
  });

  it("retorna true para string vazia", () => {
    process.env.MCPASSURE_LGPD_ALLOW_PII = "";
    expect(shouldMask()).toBe(true);
  });
});

describe("integração LGPD — masking end-to-end", () => {
  const originalEnv = process.env.MCPASSURE_LGPD_ALLOW_PII;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MCPASSURE_LGPD_ALLOW_PII;
    } else {
      process.env.MCPASSURE_LGPD_ALLOW_PII = originalEnv;
    }
  });

  it("com masking ativo, CPF de 11 dígitos é mascarado", () => {
    delete process.env.MCPASSURE_LGPD_ALLOW_PII;
    const cpf = "98765432100";
    const result = shouldMask() ? maskCpf(cpf) : cpf;
    expect(result).toBe("***.***.321-**");
    expect(result).toMatch(/^\*\*\*/);
  });

  it("com masking desativado, CPF é retornado sem masking", () => {
    process.env.MCPASSURE_LGPD_ALLOW_PII = "cnes";
    const cpf = "98765432100";
    const result = shouldMask() ? maskCpf(cpf) : cpf;
    expect(result).toBe("98765432100");
  });
});
