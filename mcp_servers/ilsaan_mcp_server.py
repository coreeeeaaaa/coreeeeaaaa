#!/usr/bin/env python3
"""
ILSAAN MCP Server - 워크플로우 및 사고 시스템
"""

import asyncio
import json
import logging
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ilsaan-mcp")

class IlsaanMCPServer:
    def __init__(self):
        self.server = Server("ilsaan-mcp")
        self.setup_handlers()

    def setup_handlers(self):
        """MCP 핸들러 설정"""

        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            return [
                Tool(
                    name="workflow_step",
                    description="순차적 워크플로우 단계 실행",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "step": {"type": "string", "description": "실행할 단계"},
                            "context": {"type": "string", "description": "컨텍스트 정보"}
                        },
                        "required": ["step"]
                    }
                ),
                Tool(
                    name="thinking_process",
                    description="구조화된 사고 프로세스 실행",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "problem": {"type": "string", "description": "문제 설명"},
                            "method": {"type": "string", "description": "사고 방법"}
                        },
                        "required": ["problem"]
                    }
                )
            ]

        @self.server.call_tool()
        async def call_tool(name: str, arguments: dict) -> list[TextContent]:
            if name == "workflow_step":
                step = arguments.get("step", "")
                context = arguments.get("context", "")
                result = f"ILSAAN 워크플로우 단계 실행: {step}\n컨텍스트: {context}\n상태: 완료"
                return [TextContent(type="text", text=result)]

            elif name == "thinking_process":
                problem = arguments.get("problem", "")
                method = arguments.get("method", "structured")
                result = f"ILSAAN 사고 프로세스\n문제: {problem}\n방법: {method}\n분석: 구조적 사고 진행 중..."
                return [TextContent(type="text", text=result)]

            else:
                return [TextContent(type="text", text=f"알 수 없는 툴: {name}")]

async def main():
    """메인 실행 함수"""
    ilsaan_server = IlsaanMCPServer()

    # stdio 서버 실행
    async with stdio_server() as (read_stream, write_stream):
        await ilsaan_server.server.run(
            read_stream,
            write_stream,
            ilsaan_server.server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())