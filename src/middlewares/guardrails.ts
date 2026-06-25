import type { Phase } from "../types/schemas.js";

/**
 * Protects execution flow (Extracted from VECTOR).
 * Blocks LLM from calling Tools when not in the correct Phase.
 */
export class PhaseGuardrails {
  ensureToolPhase(toolName: string, currentPhase: Phase, allowedPhases: Phase[]): void {
    if (!allowedPhases.includes(currentPhase)) {
      throw new Error(`[SUPER-MCP] Guardrail Error: Tool '${toolName}' is not allowed in phase '${currentPhase}'. Must be in one of: ${allowedPhases.join(", ")}`);
    }
  }
}

export const globalGuardrails = new PhaseGuardrails();
