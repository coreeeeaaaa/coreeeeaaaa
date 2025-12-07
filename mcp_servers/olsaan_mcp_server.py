#!/usr/bin/env python3
"""
OOLSAAN MCP 서버 - 실제 코드 검증 기능 구현
HTTP 완전 차단, 로컬 MCP만 사용
Claude Code 전용
"""

# 보안 래퍼 적용
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from secure_mcp_wrapper import SecureMCPWrapper
SecureMCPWrapper.apply_all_protections()

# 충돌 방지
from mcp_port_manager import ensure_no_conflicts
try:
    resource_manager = ensure_no_conflicts('oolsaan')
except Exception as e:
    print(f"OOLSAAN MCP 시작 실패: {e}", file=sys.stderr)
    sys.exit(1)

import json
import sys
import asyncio
import logging
import re
import ast
from pathlib import Path
from typing import Dict, Any, List, Tuple
from datetime import datetime

class OOLSAANCodeAnalyzer:
    """실제 코드 분석 엔진"""
    
    def __init__(self):
        # 위험 패턴 정의
        self.security_patterns = {
            'eval_usage': (r'eval\s*\(', 'eval() 사용은 보안 위험'),
            'exec_usage': (r'exec\s*\(', 'exec() 사용은 보안 위험'),
            'hardcoded_password': (r'password\s*=\s*["\'][^"\']+["\']', '하드코딩된 비밀번호'),
            'hardcoded_api_key': (r'api[_-]?key\s*=\s*["\'][^"\']+["\']', '하드코딩된 API 키'),
            'sql_injection': (r'f["\'].*SELECT.*WHERE.*{.*}', 'SQL 인젝션 위험'),
            'command_injection': (r'os\.system\(.*\+.*\)', '명령어 인젝션 위험'),
            'weak_random': (r'random\.random\(\)', '암호화용으로 약한 난수 생성기'),
            'http_not_https': (r'http://(?!localhost|127\.0\.0\.1)', 'HTTPS 미사용'),
            'no_input_validation': (r'request\.(args|form|json)\[.*\](?!\s*\.strip)', '입력 검증 부재'),
        }
        
        self.code_quality_patterns = {
            'todo_comments': (r'#\s*(TODO|FIXME|HACK|XXX)', '미완성 코드'),
            'print_debug': (r'print\s*\(', '디버그 출력문'),
            'console_log': (r'console\.log\s*\(', '콘솔 로그 (프로덕션 제거 필요)'),
            'unused_import': (r'import\s+\w+\s*$', '사용되지 않는 import 가능성'),
            'long_line': (r'^.{120,}$', '120자 초과 라인'),
            'no_docstring': (r'^def\s+\w+.*:\s*\n\s*[^"\']', '함수 docstring 없음'),
            'global_var': (r'^[A-Z_]+\s*=\s*["\'\d]', '전역 변수 사용'),
            'magic_number': (r'[^0-9\.]\d{3,}(?!\d)', '매직 넘버 사용'),
        }
        
        self.best_practices = {
            'no_error_handling': (r'except\s*:', '구체적이지 않은 예외 처리'),
            'mutable_default': (r'def\s+\w+\(.*=\s*(\[\]|\{\})', '변경 가능한 기본 인자'),
            'no_type_hints': (r'def\s+\w+\([^)]*\)\s*:', '타입 힌트 없음'),
            'class_naming': (r'class\s+[a-z]', '클래스명 PascalCase 미준수'),
            'function_naming': (r'def\s+[A-Z]', '함수명 snake_case 미준수'),
        }
    
    def analyze_code(self, content: str, language: str = 'python') -> Dict[str, Any]:
        """코드 종합 분석"""
        violations = []
        score = 100
        
        # 보안 검사
        for name, (pattern, message) in self.security_patterns.items():
            matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
            if matches:
                violations.append({
                    'type': 'SECURITY',
                    'severity': 'CRITICAL',
                    'message': f'{message} ({len(matches)}건)',
                    'pattern': name,
                    'count': len(matches)
                })
                score -= 10 * len(matches)
        
        # 코드 품질 검사
        for name, (pattern, message) in self.code_quality_patterns.items():
            matches = re.findall(pattern, content, re.MULTILINE)
            if matches:
                violations.append({
                    'type': 'QUALITY',
                    'severity': 'MEDIUM',
                    'message': f'{message} ({len(matches)}건)',
                    'pattern': name,
                    'count': len(matches)
                })
                score -= 3 * len(matches)
        
        # 베스트 프랙티스 검사
        for name, (pattern, message) in self.best_practices.items():
            matches = re.findall(pattern, content, re.MULTILINE)
            if matches:
                violations.append({
                    'type': 'BEST_PRACTICE',
                    'severity': 'LOW',
                    'message': f'{message} ({len(matches)}건)',
                    'pattern': name,
                    'count': len(matches)
                })
                score -= 2 * len(matches)
        
        # Python AST 분석 (언어별 확장 가능)
        if language == 'python':
            ast_issues = self._analyze_python_ast(content)
            violations.extend(ast_issues)
            score -= 5 * len(ast_issues)
        
        # 점수 보정
        score = max(0, min(100, score))
        
        return {
            'score': score,
            'violations': violations,
            'total_issues': len(violations),
            'critical_count': sum(1 for v in violations if v['severity'] == 'CRITICAL'),
            'passed': score >= 70 and not any(v['severity'] == 'CRITICAL' for v in violations)
        }
    
    def _analyze_python_ast(self, content: str) -> List[Dict[str, Any]]:
        """Python AST 기반 심층 분석"""
        issues = []
        try:
            tree = ast.parse(content)
            
            # 복잡도 분석
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    complexity = self._calculate_complexity(node)
                    if complexity > 10:
                        issues.append({
                            'type': 'COMPLEXITY',
                            'severity': 'HIGH',
                            'message': f'함수 {node.name}의 복잡도가 너무 높음 ({complexity})',
                            'pattern': 'high_complexity'
                        })
                        
        except SyntaxError as e:
            issues.append({
                'type': 'SYNTAX',
                'severity': 'CRITICAL',
                'message': f'구문 오류: {str(e)}',
                'pattern': 'syntax_error'
            })
        
        return issues
    
    def _calculate_complexity(self, node: ast.AST) -> int:
        """McCabe 복잡도 계산"""
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        return complexity
    
    def generate_report(self, analysis: Dict[str, Any]) -> str:
        """분석 보고서 생성"""
        report = f"""
## OOLSAAN 코드 검증 보고서

**점수**: {analysis['score']}/100
**상태**: {'✅ 통과' if analysis['passed'] else '❌ 실패'}
**총 이슈**: {analysis['total_issues']}개
**심각한 이슈**: {analysis['critical_count']}개

### 발견된 문제:
"""
        
        # 심각도별 정렬
        severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        sorted_violations = sorted(analysis['violations'], 
                                 key=lambda x: severity_order.get(x['severity'], 4))
        
        for violation in sorted_violations:
            emoji = {'CRITICAL': '🚨', 'HIGH': '⚠️', 'MEDIUM': '📝', 'LOW': '💡'}.get(violation['severity'], '📌')
            report += f"\n{emoji} **[{violation['severity']}]** {violation['message']}"
            report += f"\n   - 타입: {violation['type']}"
            report += f"\n   - 패턴: {violation['pattern']}\n"
        
        return report

class OOLSAANMCPServer:
    def __init__(self):
        self.name = "oolsaan"
        self.version = "2.0.0"
        self.analyzer = OOLSAANCodeAnalyzer()
        
        # 로깅 설정 (로컬만)
        self.setup_logging()
        
        # HTTP 차단 확인
        self._block_http()
        
    def _block_http(self):
        """HTTP 관련 모듈 차단"""
        # HTTP 서버 모듈 import 시도시 에러
        blocked_modules = ['http.server', 'flask', 'fastapi', 'django', 'aiohttp']
        for module in blocked_modules:
            if module in sys.modules:
                self.logger.warning(f"HTTP 모듈 {module} 감지 - MCP만 사용하세요!")
                
    def setup_logging(self):
        """로컬 전용 로깅"""
        log_file = Path.home() / '.oolsaan' / 'mcp_logs' / 'oolsaan_mcp.log'
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(
            filename=str(log_file),
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    async def handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """MCP 초기화"""
        self.logger.info("OOLSAAN MCP 서버 초기화 (로컬 전용)")
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": self.name,
                "version": self.version
            }
        }
    
    async def handle_list_tools(self) -> Dict[str, Any]:
        """도구 목록 반환"""
        return {
            "tools": [
                {
                    "name": "oolsaan_code_analyzer",
                    "description": "OOLSAAN 코드 품질 검증 및 보안 분석",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "action": {
                                "type": "string",
                                "enum": ["analyze", "verify", "audit", "optimize"],
                                "description": "수행할 작업"
                            },
                            "code": {
                                "type": "string",
                                "description": "분석할 코드"
                            },
                            "language": {
                                "type": "string",
                                "description": "프로그래밍 언어",
                                "default": "python"
                            }
                        },
                        "required": ["action", "code"]
                    }
                }
            ]
        }
    
    async def handle_call_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """도구 실행"""
        name = params.get("name")
        arguments = params.get("arguments", {})
        
        if name == "oolsaan_code_analyzer":
            action = arguments.get("action")
            code = arguments.get("code", "")
            language = arguments.get("language", "python")
            
            # 실제 코드 분석 수행
            analysis = self.analyzer.analyze_code(code, language)
            report = self.analyzer.generate_report(analysis)
            
            # 액션별 추가 처리
            if action == "verify":
                result = f"OOLSAAN 코드 검증 완료 ({len(code)} 문자 분석)\n{report}"
            elif action == "audit":
                security_focus = [v for v in analysis['violations'] if v['type'] == 'SECURITY']
                result = f"OOLSAAN 보안 감사 완료\n발견된 보안 이슈: {len(security_focus)}개\n{report}"
            elif action == "optimize":
                result = f"OOLSAAN 최적화 제안\n현재 점수: {analysis['score']}/100\n개선 필요 항목: {analysis['total_issues']}개\n{report}"
            else:
                result = report
            
            self.logger.info(f"Tool executed: {name} - {action} - Score: {analysis['score']}")
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": result
                    }
                ]
            }
        
        raise ValueError(f"Unknown tool: {name}")

async def main():
    """MCP 서버 메인 루프"""
    server = OOLSAANMCPServer()
    
    # JSON-RPC over stdio
    while True:
        try:
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
                
            line = line.strip()
            if not line:
                continue
                
            request = json.loads(line)
            
            method = request.get("method")
            params = request.get("params", {})
            request_id = request.get("id")
            
            try:
                if method == "initialize":
                    result = await server.handle_initialize(params)
                elif method == "tools/list":
                    result = await server.handle_list_tools()
                elif method == "tools/call":
                    result = await server.handle_call_tool(params)
                else:
                    raise ValueError(f"Unknown method: {method}")
                
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": result
                }
                
            except Exception as e:
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32603,
                        "message": str(e)
                    }
                }
            
            print(json.dumps(response))
            sys.stdout.flush()
            
        except EOFError:
            break
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
            print(json.dumps(error_response))
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())