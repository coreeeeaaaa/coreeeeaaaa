# Project Context & Rules

## Tech Stack
- TypeScript (Node.js 18+)
- Rust (Engine)
- Firebase Functions (v2)
- OPA (Policy Gates)

## Agent Behavior Rules
1. **PLAN FIRST**: Always propose a plan before writing code.
2. **TEST MANDATORY**: No PR without passing tests (`npm test` & `opa test`).
3. **ISOLATION**: Do not touch files outside your assigned package.
   - Grok: `policy/`, `functions/`, `.github/`
   - Gemini: `packages/sdk/`, `packages/cli/`
   - Codex: `packages/engine-rs/`
4. **VERIFICATION**: Always verify your work with actual command outputs.