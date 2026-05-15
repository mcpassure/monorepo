/**
 * config.ts — v2.0
 *
 * Configuração simplificada. O dataset agora é gerenciado pelo bootstrap.ts (R2)
 * ou pelo script sync.ts (CSV direto da ANVISA).
 *
 * Paths migrados:
 *   ~/.local/share/mcpassure-anvisa/ → ~/.local/share/mcpassure/anvisa-bulario/
 *   %APPDATA%/mcpassure-anvisa/      → %APPDATA%/mcpassure/anvisa-bulario/
 */

export type Config = {
  degradedThresholdDays: number;
};

export function loadConfig(): Config {
  return {
    degradedThresholdDays: Number.parseInt(
      process.env.MCPASSURE_DEGRADED_THRESHOLD_DAYS ?? "7",
      10
    ),
  };
}
