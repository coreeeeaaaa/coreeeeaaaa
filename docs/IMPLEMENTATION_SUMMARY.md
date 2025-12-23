# coreeeeaaaa - MCP Development Automation Server

## 📋 Implementation Summary

Successfully implemented the **[로컬 완결형 개발 자동화 + 표준 MCP 도구]** as requested in the directive.

### ✅ 1. 구조 정리 (Cleanup)
- Removed all AI calling/communication code
- Simplified to core modules (`packages/core`) and CLI interface
- Created MCP-ready server implementation

### ✅ 2. 기능 구현 (Core Features)
Created 4 MCP-ready tools that AI platforms can call:

- **`task_runner`**: Executes tasks from Taskfile.yml (lint, test, build, etc.)
- **`quality_gate`**: Runs local quality checks (lint + test + security scan)
- **`spec_validator`**: Validates project specifications against current code
- **`git_ops`**: Git operations (status, diff, branch management)

### ✅ 3. 로컬 인프라 통합
- **`Taskfile.yml`**: Defined `quality` and `dev` tasks
- **`.pre-commit-config.yaml`**: Added gitleaks and check-yaml hooks

### ✅ 4. 배포 및 실행
- Configurable via `package.json` bin entry
- MCP-style communication via stdin/stdout
- Available through `npm link` for local use

## 🤝 MCP Server Operation

The server operates using MCP-style JSON message passing:

**Input** (via stdin):
```json
{
  "method": "quality_gate",
  "params": {"strict": true}
}
```

**Output** (via stdout):
```json
{
  "result": { "success": true, "output": "..." },
  "success": true
}
```

## ✅ MCP 설정 예시

For Claude Desktop or other MCP clients:
```json
{
  "mcpServers": {
    "coreeeeaaaa": {
      "command": "node",
      "args": ["path/to/coreeeeaaaa/packages/core/dist/mcp-server.js"]
    }
  }
}
```

## 🎯 Purpose

This implementation provides AI platforms with a **"AI 비서가 꺼내 쓸 최고급 공구 세트"** as requested, not a "똑똑한 척하는 AI 비서". Each tool can be called individually by AI systems when needed for development automation tasks.