import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export const CNES_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: true,
};
