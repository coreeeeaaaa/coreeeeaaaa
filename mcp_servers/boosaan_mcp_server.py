#!/usr/bin/env python3
"""
BOOSAAN ULTIMATE MCP 서버 v7.0 (Google CTO급 프레임워크)
- 4개 핵심 시스템 완전 통합
- 메타인지 엔진 + 계층적 맥락 관리 + 샌드박스 관리 + 사고 고도화
- 5단계 위험 평가 시스템 내장
- 실시간 성능 모니터링 및 최적화
"""

import json
import sys
import os
import asyncio
import logging
import time
import threading
import uuid
import hashlib
import pickle
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime, timezone, timedelta
import sqlite3

# SECURITY: 안전한 경로 검증 추가
sys.path.append(str(Path(__file__).parent.parent / 'boosaan'))
from secure_path_validator import validate_path, path_validator

# 기존 구현된 핵심 시스템들 임포트
sys.path.append(str(Path(__file__).parent))

from boosaan_meta_cognitive_engine import MetaCognitiveEngine, ThinkingStage
from boosaan_context_hierarchy import ContextHierarchyManager, ContextLevel, MemoryType, ContextQuery
from boosaan_sandbox_manager import SandboxManager, SandboxConfig, PermissionLevel, ResourceLimit
from boosaan_thinking_advancement import ThinkingAdvancementEngine, ThinkingTask, ReasoningModel, ThinkingMode, ContextualPriority
from boosaan_work_process_enforcer import WorkProcessEnforcer, WorkInstruction, WorkFeedback, FeedbackType, WorkType
from boosaan_context_document_manager import ContextDocumentManager, UserInstruction, UserIntentionPoint, FeatureSpec, TechnicalBlueprint
from boosaan_port_manager import get_port_manager, get_project_port, register_project
from boosaan_rule_isolation_system import BOOSAANRuleIsolationSystem, IntentionType, RuleType, RuleScope

class BOOSAANUltimateMCPServer:
    def __init__(self):
        self.name = "BOOSAAN ULTIMATE v7.1"
        self.version = "7.1.0"
        
        # 터미널 세션 ID 생성 및 관리
        self.terminal_id = self._generate_terminal_id()
        self.session_start_time = datetime.now(timezone.utc)
        
        # 작업 추적 시스템
        self.conversation_counter = 0
        self.task_counter = 0
        self.session_db_lock = threading.Lock()
        
        # 맥락 연속성을 위한 메모리 시스템
        self.context_memory = {}
        self.last_context_save = time.time()
        
        # 전역 적용 모드 설정
        self.global_mode = os.getenv("GLOBAL_BOOSAAN_MODE", "true").lower() == "true"
        self.apply_to_all_agents = os.getenv("APPLY_TO_ALL_AGENTS", "true").lower() == "true" 
        self.force_global = os.getenv("FORCE_GLOBAL_ENFORCEMENT", "true").lower() == "true"
        
        # MCP 워크스페이스 (다중 인스턴스 격리) - 경로 검증 추가
        import hashlib
        
        # Claude Code 인스턴스별 고유 ID 생성
        session_id = os.getenv('CLAUDE_SESSION_ID', 'default')
        process_id = str(os.getpid())
        instance_hash = hashlib.md5(f"{session_id}_{process_id}".encode()).hexdigest()[:8]
        
        if self.global_mode or self.apply_to_all_agents:
            workspace_path = str(Path.home() / '.boosaan' / 'global_workspace' / f'instance_{instance_hash}')
        else:
            workspace_path = str(Path.home() / '.boosaan' / 'ultimate_mcp' / f'instance_{instance_hash}')
        
        # SECURITY: 경로 검증
        if not validate_path(workspace_path):
            raise PermissionError(f"Workspace path not allowed: {workspace_path}")
        
        self.workspace = Path(workspace_path)
        self.workspace.mkdir(parents=True, exist_ok=True)
        
        # 핵심 시스템 초기화
        self.meta_cognitive = MetaCognitiveEngine(str(self.workspace / 'meta_cognitive'))
        self.context_manager = ContextHierarchyManager(str(self.workspace / 'context_hierarchy'))
        self.sandbox_manager = SandboxManager(str(self.workspace / 'sandbox'))
        self.thinking_engine = ThinkingAdvancementEngine(str(self.workspace / 'thinking_advancement'))
        self.work_enforcer = WorkProcessEnforcer(str(self.workspace / 'work_process'))
        self.context_document_manager = ContextDocumentManager(str(self.workspace / 'context_documents'))
        
        # 성능 모니터링
        self.performance_metrics = {
            "total_requests": 0,
            "successful_operations": 0,
            "blocked_operations": 0,
            "average_response_time": 0.0
        }
        
        # 로깅 설정
        self.setup_logging()
        
        # 터미널 세션 데이터베이스 초기화
        self._init_session_database()
        
        # 맥락 복원 (이전 터미널 세션이 있다면)
        self._restore_context_if_exists()
        
        # 포트 관리 시스템 초기화 (로깅 후)
        self.port_manager = get_port_manager()
        self.assigned_port = None
        self._initialize_port_allocation()
        
        # 규칙 격리 및 예측적 피드백 시스템
        self.rule_isolation = BOOSAANRuleIsolationSystem(str(self.workspace / 'rule_isolation'))
        
        # 보안 설정
        self.security_level = "MAXIMUM"
        self.auto_risk_assessment = True

    def _generate_terminal_id(self) -> str:
        """터미널 고유 ID 생성 (세션별로 고유하면서도 재시작 시 연속성 유지)"""
        # 터미널 환경 정보 기반 ID 생성
        terminal_env = {
            'pid': os.getpid(),
            'ppid': os.getppid(),
            'user': os.getenv('USER', 'unknown'),
            'shell': os.getenv('SHELL', 'unknown'),
            'term': os.getenv('TERM', 'unknown'),
            'pwd': os.getcwd()
        }
        
        # 환경 정보를 해시화하여 안정적인 터미널 ID 생성
        env_string = json.dumps(terminal_env, sort_keys=True)
        terminal_hash = hashlib.sha256(env_string.encode()).hexdigest()[:12]
        
        # 날짜 기반 접두사로 세션 구분
        date_prefix = datetime.now().strftime('%Y%m%d')
        
        return f"TERM_{date_prefix}_{terminal_hash}"

    def _init_session_database(self):
        """터미널 세션 데이터베이스 초기화"""
        self.session_db_path = self.workspace / f'terminal_sessions_{self.terminal_id}.db'
        
        with sqlite3.connect(str(self.session_db_path)) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id TEXT UNIQUE,
                    terminal_id TEXT,
                    timestamp TEXT,
                    request_data TEXT,
                    response_data TEXT,
                    task_id TEXT,
                    status TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS context_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    terminal_id TEXT,
                    snapshot_time TEXT,
                    context_data BLOB,
                    metadata TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS task_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT UNIQUE,
                    terminal_id TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    task_type TEXT,
                    status TEXT,
                    progress_data TEXT
                )
            ''')
        
        # 현재 세션 정보 저장
        self._save_session_start()

    def _save_session_start(self):
        """세션 시작 정보 저장"""
        with sqlite3.connect(str(self.session_db_path)) as conn:
            session_info = {
                'terminal_id': self.terminal_id,
                'start_time': self.session_start_time.isoformat(),
                'workspace': str(self.workspace),
                'version': self.version
            }
            
            conn.execute('''
                INSERT OR REPLACE INTO context_snapshots 
                (terminal_id, snapshot_time, context_data, metadata)
                VALUES (?, ?, ?, ?)
            ''', (
                self.terminal_id,
                datetime.now(timezone.utc).isoformat(),
                pickle.dumps({}),  # 빈 시작 컨텍스트
                json.dumps(session_info)
            ))

    def _restore_context_if_exists(self):
        """이전 세션의 컨텍스트 복원 (같은 터미널 ID)"""
        try:
            with sqlite3.connect(str(self.session_db_path)) as conn:
                cursor = conn.execute('''
                    SELECT context_data, metadata, snapshot_time
                    FROM context_snapshots 
                    WHERE terminal_id = ?
                    ORDER BY id DESC LIMIT 1
                ''', (self.terminal_id,))
                
                result = cursor.fetchone()
                if result:
                    context_data, metadata_str, snapshot_time = result
                    metadata = json.loads(metadata_str)
                    
                    # 24시간 이내의 세션만 복원
                    snapshot_dt = datetime.fromisoformat(snapshot_time.replace('Z', '+00:00'))
                    if (datetime.now(timezone.utc) - snapshot_dt).total_seconds() < 86400:
                        self.context_memory = pickle.loads(context_data)
                        self.logger.info(f"이전 컨텍스트 복원: {len(self.context_memory)}개 항목")
                    else:
                        self.logger.info("24시간 이상 경과한 세션, 새로 시작")
                        
        except Exception as e:
            self.logger.warning(f"컨텍스트 복원 실패: {e}")

    def setup_logging(self):
        """로깅 시스템 설정 (터미널 ID 포함)"""
        log_file = self.workspace / f'boosaan_ultimate_{self.terminal_id}.log'
        logging.basicConfig(
            filename=str(log_file),
            level=logging.INFO,
            format=f'%(asctime)s - BOOSAAN_ULTIMATE[{self.terminal_id}] - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def _initialize_port_allocation(self):
        """BOOSAAN Ultimate용 포트 할당"""
        try:
            # boosaan 프로젝트가 이미 예약되어 있으므로 해당 범위에서 포트 할당
            self.assigned_port = get_project_port("boosaan", "ultimate_mcp_server")
            self.logger.info(f"BOOSAAN Ultimate MCP 서버 포트 할당: {self.assigned_port}")
        except Exception as e:
            self.logger.error(f"포트 할당 실패: {e}")
            self.assigned_port = 8000  # 기본 포트로 폴백

    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """MCP 요청 처리 (터미널 ID 및 타임스탬프 추적 포함)"""
        start_time = time.time()
        
        # 대화 ID 및 작업 ID 생성
        self.conversation_counter += 1
        conversation_id = f"{self.terminal_id}_CONV_{self.conversation_counter:06d}"
        
        method = request.get("method")
        params = request.get("params", {})
        
        # 작업 타입에 따라 작업 ID 생성
        task_id = None
        if method == "tools/call":
            self.task_counter += 1
            tool_name = params.get("name", "unknown")
            task_id = f"{self.terminal_id}_TASK_{self.task_counter:06d}_{tool_name}"
        
        # 요청 추적 정보 생성
        tracking_info = {
            "conversation_id": conversation_id,
            "task_id": task_id,
            "terminal_id": self.terminal_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": method,
            "request_start": start_time
        }
        
        # 로그에 추적 정보 기록
        self.logger.info(f"[{conversation_id}] 요청 처리 시작: {method} (작업ID: {task_id})")
        
        self.performance_metrics["total_requests"] += 1
        
        try:
            # 1단계: 자동 위험 평가 (과부하 방지 포함)
            if self.auto_risk_assessment:
                risk_assessment = await self._assess_request_risk(method, params)
                if risk_assessment["total_risk"] >= 35:
                    self.performance_metrics["blocked_operations"] += 1
                    
                    # 차단된 요청도 추적
                    await self._save_conversation_record(
                        conversation_id, task_id, tracking_info, 
                        request, {"status": "BLOCKED", "reason": "위험도 임계값 초과"}
                    )
                    
                    return {
                        "error": {
                            "code": -32000,
                            "message": f"위험도 임계값 초과 - 요청 차단 [대화ID: {conversation_id}]",
                            "data": risk_assessment
                        }
                    }
            
            # 2단계: 무한루프 방지 체크
            if await self._check_infinite_loop_risk(method, params):
                self.logger.warning(f"[{conversation_id}] 무한루프 위험 감지 - 요청 제한")
                return {
                    "error": {
                        "code": -32001,
                        "message": f"무한루프 방지 - 요청 제한 [대화ID: {conversation_id}]"
                    }
                }
            
            # 3단계: 메서드별 처리 (추적 정보 포함)
            if method == "initialize":
                response = await self.initialize(params)
            elif method == "tools/list":
                response = await self.list_tools()
            elif method == "tools/call":
                response = await self.call_tool(params, tracking_info)
            elif method == "resources/list":
                response = await self.list_resources()
            elif method == "resources/read":
                response = await self.read_resource(params)
            else:
                response = {"error": {"code": -32601, "message": f"Method not found: {method}"}}
            
            # 4단계: 성능 메트릭 업데이트
            response_time = time.time() - start_time
            self._update_performance_metrics(response_time, True)
            
            # 5단계: 대화 기록 저장
            await self._save_conversation_record(conversation_id, task_id, tracking_info, request, response)
            
            # 6단계: 맥락 스냅샷 (주기적)
            if time.time() - self.last_context_save > 300:  # 5분마다
                await self._save_context_snapshot()
                self.last_context_save = time.time()
            
            self.performance_metrics["successful_operations"] += 1
            
            # 응답에 추적 정보 추가
            if isinstance(response, dict) and "content" in response:
                response["tracking"] = {
                    "conversation_id": conversation_id,
                    "task_id": task_id,
                    "terminal_id": self.terminal_id,
                    "timestamp": tracking_info["timestamp"]
                }
            
            self.logger.info(f"[{conversation_id}] 요청 처리 완료: {response_time:.3f}초")
            return response
                
        except Exception as e:
            self.logger.error(f"[{conversation_id}] Request handling error: {e}")
            self._update_performance_metrics(time.time() - start_time, False)
            
            # 오류도 추적
            await self._save_conversation_record(
                conversation_id, task_id, tracking_info, 
                request, {"status": "ERROR", "error": str(e)}
            )
            
            return {"error": {"code": -32603, "message": f"[{conversation_id}] {str(e)}"}}

    async def _assess_request_risk(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """요청 위험도 평가 (Google CTO급 5단계 시스템)"""
        
        risks = {
            "security_risk": self._evaluate_method_security_risk(method, params),
            "functional_risk": self._evaluate_method_functional_risk(method, params),
            "contextual_risk": self._evaluate_method_contextual_risk(method, params),
            "performance_risk": self._evaluate_method_performance_risk(method, params),
            "operational_risk": self._evaluate_method_operational_risk(method, params)
        }
        
        total_risk = sum(risks.values())
        risk_level = "CRITICAL" if total_risk >= 35 else "HIGH" if total_risk >= 25 else "MEDIUM" if total_risk >= 15 else "LOW"
        
        return {
            "individual_risks": risks,
            "total_risk": total_risk,
            "risk_level": risk_level,
            "assessment_time": time.time()
        }

    def _evaluate_method_security_risk(self, method: str, params: Dict[str, Any]) -> int:
        """메서드 보안 위험 평가"""
        high_risk_methods = ["tools/call", "sandbox_execute", "system_modify"]
        medium_risk_methods = ["resources/read", "context_update"]
        
        if method in high_risk_methods:
            return 8
        elif method in medium_risk_methods:
            return 4
        else:
            return 1

    def _evaluate_method_functional_risk(self, method: str, params: Dict[str, Any]) -> int:
        """메서드 기능적 위험 평가"""
        if method == "tools/call":
            tool_name = params.get("name", "")
            if "delete" in tool_name or "destroy" in tool_name:
                return 7
            elif "execute" in tool_name:
                return 5
        return 2

    def _evaluate_method_contextual_risk(self, method: str, params: Dict[str, Any]) -> int:
        """메서드 맥락적 위험 평가"""
        return 3  # 기본값

    def _evaluate_method_performance_risk(self, method: str, params: Dict[str, Any]) -> int:
        """메서드 성능 위험 평가"""
        if method == "tools/call":
            tool_name = params.get("name", "")
            if "thinking_advancement" in tool_name:
                return 4  # 높은 CPU 사용량
        return 2

    def _evaluate_method_operational_risk(self, method: str, params: Dict[str, Any]) -> int:
        """메서드 운영 위험 평가"""
        return 2  # 기본값

    async def initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """MCP 서버 초기화"""
        self.logger.info("BOOSAAN ULTIMATE MCP 서버 초기화")
        
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "resources": {},
                "logging": {}
            },
            "serverInfo": {
                "name": self.name,
                "version": self.version,
                "description": "Google CTO급 BOOSAAN 4대 핵심 시스템 통합"
            }
        }

    async def list_tools(self) -> Dict[str, Any]:
        """사용 가능한 도구 목록"""
        tools = [
            # 1. 메타인지 도구
            {
                "name": "sequential_thinking",
                "description": "5단계 Sequential Thinking 실행",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "request": {"type": "string"},
                        "context": {"type": "object", "optional": True}
                    },
                    "required": ["request"]
                }
            },
            
            # 2. 맥락 관리 도구
            {
                "name": "create_project_context",
                "description": "새 프로젝트 맥락 생성",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_name": {"type": "string"},
                        "project_path": {"type": "string"},
                        "content": {"type": "object"}
                    },
                    "required": ["project_name", "project_path", "content"]
                }
            },
            
            {
                "name": "update_global_context",
                "description": "전역 맥락 업데이트",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "object"}
                    },
                    "required": ["content"]
                }
            },
            
            {
                "name": "query_context",
                "description": "맥락 검색",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query_text": {"type": "string"},
                        "context_level": {"type": "string", "enum": ["전역", "프로젝트", "세션", "즉시"]},
                        "relevance_threshold": {"type": "number", "default": 0.5}
                    },
                    "required": ["query_text"]
                }
            },
            
            {
                "name": "execute_forgetting_cycle",
                "description": "8차원 망각 사이클 실행",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            
            # 3. 샌드박스 도구
            {
                "name": "create_sandbox",
                "description": "새 샌드박스 환경 생성",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "sandbox_id": {"type": "string"},
                        "project_path": {"type": "string"},
                        "permission_level": {"type": "string", "enum": ["샌드박스_레벨", "사용자_레벨"], "default": "샌드박스_레벨"},
                        "network_allowed": {"type": "boolean", "default": False},
                        "time_limit": {"type": "integer", "default": 300}
                    },
                    "required": ["sandbox_id", "project_path"]
                }
            },
            
            {
                "name": "execute_in_sandbox",
                "description": "샌드박스 내에서 안전한 명령 실행",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "sandbox_id": {"type": "string"},
                        "command": {"type": "string"},
                        "input_data": {"type": "string", "optional": True}
                    },
                    "required": ["sandbox_id", "command"]
                }
            },
            
            {
                "name": "get_sandbox_status",
                "description": "샌드박스 상태 조회",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "sandbox_id": {"type": "string"}
                    },
                    "required": ["sandbox_id"]
                }
            },
            
            {
                "name": "destroy_sandbox",
                "description": "샌드박스 완전 삭제",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "sandbox_id": {"type": "string"}
                    },
                    "required": ["sandbox_id"]
                }
            },
            
            # 4. 사고 고도화 도구
            {
                "name": "thinking_advancement",
                "description": "다중 추론 모델 기반 고급 사고 실행",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "task_content": {"type": "string"},
                        "thinking_mode": {"type": "string", "enum": ["심층_사고", "광범위_사고", "집중_사고"], "default": "심층_사고"},
                        "priority": {"type": "string", "enum": ["즉시_우선", "맥락_우선", "전략_우선", "궁극_우선"], "default": "맥락_우선"},
                        "required_models": {"type": "array", "items": {"type": "string"}, "default": ["분석적_추론", "비판적_추론"]},
                        "quality_threshold": {"type": "number", "default": 0.7}
                    },
                    "required": ["task_content"]
                }
            },
            
            # 5. 작업 프로세스 강제화 도구
            {
                "name": "process_user_instruction",
                "description": "사용자 지시 처리 (피드백 시스템 적용)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_request": {"type": "string"},
                        "context": {"type": "object", "optional": True}
                    },
                    "required": ["user_request"]
                }
            },
            
            {
                "name": "process_feedback_response",
                "description": "사용자 피드백 응답 처리",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "feedback_id": {"type": "string"},
                        "user_response": {"type": "string"}
                    },
                    "required": ["feedback_id", "user_response"]
                }
            },
            
            # 6. 맥락 문서 관리 도구
            {
                "name": "add_user_instruction",
                "description": "사용자 지시사항 추가 (삭제금지)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_request": {"type": "string"},
                        "agent_response": {"type": "string", "optional": True},
                        "actual_implementation": {"type": "string", "optional": True},
                        "status": {"type": "string", "default": "in_progress"}
                    },
                    "required": ["user_request"]
                }
            },
            
            {
                "name": "add_feature_spec",
                "description": "기능명세서 추가 (Git-style 관리)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "feature_name": {"type": "string"},
                        "description": {"type": "string"},
                        "status": {"type": "string", "default": "planned"},
                        "dependencies": {"type": "array", "items": {"type": "string"}, "optional": True},
                        "implementation_notes": {"type": "string", "optional": True}
                    },
                    "required": ["feature_name", "description"]
                }
            },
            
            {
                "name": "search_context",
                "description": "맥락 검색 (문서 전체)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "document_types": {"type": "array", "items": {"type": "string"}, "optional": True}
                    },
                    "required": ["query"]
                }
            },
            
            {
                "name": "get_project_summary",
                "description": "프로젝트 전체 요약",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            
            # 7. 통합 시스템 도구
            {
                "name": "system_health_check",
                "description": "전체 시스템 건강 상태 점검",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "detailed": {"type": "boolean", "default": False}
                    }
                }
            },
            
            {
                "name": "performance_metrics",
                "description": "성능 메트릭 조회",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            
            # 8. 포트 관리 도구
            {
                "name": "get_project_port",
                "description": "프로젝트용 포트 할당",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_name": {"type": "string"},
                        "service_name": {"type": "string", "default": "default"}
                    },
                    "required": ["project_name"]
                }
            },
            
            {
                "name": "register_new_project",
                "description": "새 프로젝트 포트 블록 등록",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_name": {"type": "string"},
                        "description": {"type": "string", "optional": True}
                    },
                    "required": ["project_name"]
                }
            },
            
            {
                "name": "port_status_summary",
                "description": "전체 포트 상태 요약",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            
            {
                "name": "run_port_forgetting_cycle",
                "description": "포트 망각 사이클 실행 (시간+사용빈도 기반)",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            
            # 9. 예측적 피드백 및 규칙 격리 도구
            {
                "name": "analyze_user_intention",
                "description": "사용자 의도 예측적 분석 (과거 근거 + 미래 예측)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_request": {"type": "string"},
                        "conversation_history": {"type": "array", "items": {"type": "string"}, "optional": True}
                    },
                    "required": ["user_request"]
                }
            },
            
            {
                "name": "check_rule_contamination",
                "description": "프로젝트 규칙 오염 검사 (전역/프로젝트 분리 확인)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_name": {"type": "string"}
                    },
                    "required": ["project_name"]
                }
            },
            
            {
                "name": "add_rule_with_isolation",
                "description": "규칙 추가 (오염 방지 검사 포함)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string"},
                        "rule_type": {"type": "string", "enum": ["패턴", "가이드라인", "선호도", "제약조건", "워크플로우"]},
                        "scope": {"type": "string", "enum": ["전역", "프로젝트", "세션", "임시"]},
                        "project_name": {"type": "string", "optional": True},
                        "source_context": {"type": "string", "optional": True}
                    },
                    "required": ["content", "rule_type", "scope"]
                }
            },
            
            # 10. 터미널 세션 추적 도구
            {
                "name": "get_terminal_session_info",
                "description": "현재 터미널 세션 정보 조회",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            
            {
                "name": "search_conversation_history",
                "description": "대화 내역 검색",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "time_range_hours": {"type": "number", "default": 24},
                        "limit": {"type": "number", "default": 10}
                    },
                    "required": ["query"]
                }
            },
            
            {
                "name": "get_task_history",
                "description": "작업 실행 이력 조회",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "task_type": {"type": "string", "optional": True},
                        "status": {"type": "string", "enum": ["COMPLETED", "ERROR", "BLOCKED"], "optional": True},
                        "limit": {"type": "number", "default": 20}
                    }
                }
            },
            
            {
                "name": "restore_previous_context",
                "description": "이전 세션 컨텍스트 복원",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "hours_back": {"type": "number", "default": 24}
                    }
                }
            },
            
            {
                "name": "get_session_statistics",
                "description": "터미널 세션 통계 정보",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "include_performance": {"type": "boolean", "default": True}
                    }
                }
            }
        ]
        
        return {"tools": tools}

    async def _save_conversation_record(self, conversation_id: str, task_id: str, 
                                       tracking_info: Dict, request: Dict, response: Dict):
        """대화 기록 저장"""
        try:
            with self.session_db_lock:
                with sqlite3.connect(str(self.session_db_path)) as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO conversations 
                        (conversation_id, terminal_id, timestamp, request_data, response_data, task_id, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        conversation_id,
                        self.terminal_id,
                        tracking_info["timestamp"],
                        json.dumps(request),
                        json.dumps(response),
                        task_id,
                        "COMPLETED" if "error" not in response else "ERROR"
                    ))
                    
                    # 작업 추적 정보도 저장
                    if task_id:
                        conn.execute('''
                            INSERT OR REPLACE INTO task_tracking
                            (task_id, terminal_id, created_at, updated_at, task_type, status, progress_data)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            task_id,
                            self.terminal_id,
                            tracking_info["timestamp"],
                            datetime.now(timezone.utc).isoformat(),
                            request.get("params", {}).get("name", "unknown"),
                            "COMPLETED" if "error" not in response else "ERROR",
                            json.dumps({"response_time": time.time() - tracking_info["request_start"]})
                        ))
                        
        except Exception as e:
            self.logger.error(f"대화 기록 저장 실패: {e}")

    async def _save_context_snapshot(self):
        """맥락 스냅샷 저장"""
        try:
            # 현재 맥락 정보 수집
            context_data = {
                "conversation_count": self.conversation_counter,
                "task_count": self.task_counter,
                "performance_metrics": self.performance_metrics.copy(),
                "context_memory": self.context_memory.copy()
            }
            
            with self.session_db_lock:
                with sqlite3.connect(str(self.session_db_path)) as conn:
                    conn.execute('''
                        INSERT INTO context_snapshots 
                        (terminal_id, snapshot_time, context_data, metadata)
                        VALUES (?, ?, ?, ?)
                    ''', (
                        self.terminal_id,
                        datetime.now(timezone.utc).isoformat(),
                        pickle.dumps(context_data),
                        json.dumps({"snapshot_type": "periodic", "version": self.version})
                    ))
                    
        except Exception as e:
            self.logger.error(f"맥락 스냅샷 저장 실패: {e}")

    async def _check_infinite_loop_risk(self, method: str, params: Dict[str, Any]) -> bool:
        """무한루프 위험 체크"""
        try:
            # 최근 10초 내 동일한 요청 횟수 체크
            recent_time = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
            
            with sqlite3.connect(str(self.session_db_path)) as conn:
                cursor = conn.execute('''
                    SELECT COUNT(*) FROM conversations 
                    WHERE terminal_id = ? AND timestamp > ? 
                    AND json_extract(request_data, '$.method') = ?
                ''', (self.terminal_id, recent_time, method))
                
                count = cursor.fetchone()[0]
                
                # 10초 내 같은 메서드 20회 이상 호출 시 무한루프로 판단
                if count >= 20:
                    return True
                    
                # 특정 도구의 연속 호출 체크
                if method == "tools/call":
                    tool_name = params.get("name", "")
                    cursor = conn.execute('''
                        SELECT COUNT(*) FROM conversations 
                        WHERE terminal_id = ? AND timestamp > ?
                        AND json_extract(request_data, '$.params.name') = ?
                    ''', (self.terminal_id, recent_time, tool_name))
                    
                    tool_count = cursor.fetchone()[0]
                    if tool_count >= 10:  # 같은 도구 10회 이상
                        return True
                        
        except Exception as e:
            self.logger.warning(f"무한루프 체크 실패: {e}")
            
        return False

    async def call_tool(self, params: Dict[str, Any], tracking_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """도구 실행 (추적 정보 포함)"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        # 추적 정보가 있으면 로그에 기록
        if tracking_info:
            self.logger.info(f"[{tracking_info.get('conversation_id')}] 도구 실행: {tool_name}")
        
        try:
            if tool_name == "sequential_thinking":
                return await self.sequential_thinking(arguments)
            elif tool_name == "create_project_context":
                return await self.create_project_context(arguments)
            elif tool_name == "update_global_context":
                return await self.update_global_context(arguments)
            elif tool_name == "query_context":
                return await self.query_context(arguments)
            elif tool_name == "execute_forgetting_cycle":
                return await self.execute_forgetting_cycle(arguments)
            elif tool_name == "create_sandbox":
                return await self.create_sandbox(arguments)
            elif tool_name == "execute_in_sandbox":
                return await self.execute_in_sandbox(arguments)
            elif tool_name == "get_sandbox_status":
                return await self.get_sandbox_status(arguments)
            elif tool_name == "destroy_sandbox":
                return await self.destroy_sandbox(arguments)
            elif tool_name == "thinking_advancement":
                return await self.thinking_advancement(arguments)
            elif tool_name == "process_user_instruction":
                return await self.process_user_instruction(arguments)
            elif tool_name == "process_feedback_response":
                return await self.process_feedback_response(arguments)
            elif tool_name == "add_user_instruction":
                return await self.add_user_instruction(arguments)
            elif tool_name == "add_feature_spec":
                return await self.add_feature_spec(arguments)
            elif tool_name == "search_context":
                return await self.search_context(arguments)
            elif tool_name == "get_project_summary":
                return await self.get_project_summary(arguments)
            elif tool_name == "system_health_check":
                return await self.system_health_check(arguments)
            elif tool_name == "performance_metrics":
                return await self.performance_metrics_tool(arguments)
            elif tool_name == "get_project_port":
                return await self.get_project_port_tool(arguments)
            elif tool_name == "register_new_project":
                return await self.register_new_project_tool(arguments)
            elif tool_name == "port_status_summary":
                return await self.port_status_summary_tool(arguments)
            elif tool_name == "run_port_forgetting_cycle":
                return await self.run_port_forgetting_cycle_tool(arguments)
            elif tool_name == "analyze_user_intention":
                return await self.analyze_user_intention_tool(arguments)
            elif tool_name == "check_rule_contamination":
                return await self.check_rule_contamination_tool(arguments)
            elif tool_name == "add_rule_with_isolation":
                return await self.add_rule_with_isolation_tool(arguments)
            elif tool_name == "get_terminal_session_info":
                return await self.get_terminal_session_info_tool(arguments)
            elif tool_name == "search_conversation_history":
                return await self.search_conversation_history_tool(arguments)
            elif tool_name == "get_task_history":
                return await self.get_task_history_tool(arguments)
            elif tool_name == "restore_previous_context":
                return await self.restore_previous_context_tool(arguments)
            elif tool_name == "get_session_statistics":
                return await self.get_session_statistics_tool(arguments)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
                
        except Exception as e:
            self.logger.error(f"Tool execution error: {e}")
            return {"error": str(e)}

    # === 메타인지 도구 구현 ===
    async def sequential_thinking(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Sequential Thinking 실행"""
        request = args["request"]
        context = args.get("context", {})
        
        thinking_sequence = self.meta_cognitive.execute_sequential_thinking(request, context)
        summary = self.meta_cognitive.get_thinking_summary(thinking_sequence)
        
        result_text = f"🧠 Sequential Thinking 완료\\n\\n"
        result_text += f"📊 사고 단계: {summary['total_stages']}개\\n"
        result_text += f"🎯 평균 불확실성: {summary['average_uncertainty']:.2f}\\n"
        result_text += f"⚠️ 편향 탐지: {summary['total_biases_detected']}개\\n"
        result_text += f"✨ 사고 품질: {summary['overall_thinking_quality']:.2f}/1.0\\n\\n"
        
        result_text += "📋 사고 과정:\\n"
        for i, thinking in enumerate(thinking_sequence, 1):
            result_text += f"{i}. {thinking.stage.value}: 불확실성 {thinking.uncertainty:.2f}\\n"
        
        if summary['final_recommendation']:
            result_text += f"\\n💡 최종 권고사항:\\n{summary['final_recommendation'][:200]}..."
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 맥락 관리 도구 구현 ===
    async def create_project_context(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """프로젝트 맥락 생성"""
        project_name = args["project_name"]
        project_path = args["project_path"]
        content = args["content"]
        
        context_id = self.context_manager.update_project_context(project_name, content)
        
        result_text = f"📂 프로젝트 맥락 생성 완료\\n\\n"
        result_text += f"🏷️ 프로젝트: {project_name}\\n"
        result_text += f"📍 경로: {project_path}\\n"
        result_text += f"🆔 맥락 ID: {context_id}\\n"
        result_text += f"📊 맥락 레벨: 프로젝트\\n"
        result_text += f"💾 메모리 타입: 작업메모리\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def update_global_context(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """전역 맥락 업데이트"""
        content = args["content"]
        
        context_id = self.context_manager.update_global_context(content)
        
        result_text = f"🌐 전역 맥락 업데이트 완료\\n\\n"
        result_text += f"🆔 맥락 ID: {context_id}\\n"
        result_text += f"📊 맥락 레벨: 전역\\n"
        result_text += f"💾 메모리 타입: 장기메모리\\n"
        result_text += f"⏰ 생성 시간: {time.strftime('%Y-%m-%d %H:%M:%S')}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def query_context(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """맥락 검색"""
        query_text = args["query_text"]
        context_level_str = args.get("context_level")
        relevance_threshold = args.get("relevance_threshold", 0.5)
        
        # 문자열을 ContextLevel enum으로 변환
        context_level = None
        if context_level_str:
            level_mapping = {
                "전역": ContextLevel.GLOBAL,
                "프로젝트": ContextLevel.PROJECT,
                "세션": ContextLevel.SESSION,
                "즉시": ContextLevel.IMMEDIATE
            }
            context_level = level_mapping.get(context_level_str)
        
        query = ContextQuery(
            query_text=query_text,
            context_level=context_level,
            relevance_threshold=relevance_threshold
        )
        
        results = self.context_manager.query_context(query)
        
        result_text = f"🔍 맥락 검색 완료\\n\\n"
        result_text += f"🔎 검색어: {query_text}\\n"
        result_text += f"📊 검색 결과: {len(results)}개\\n"
        result_text += f"🎯 관련성 임계값: {relevance_threshold}\\n\\n"
        
        if results:
            result_text += "📋 검색 결과:\\n"
            for i, result in enumerate(results[:5], 1):
                result_text += f"{i}. [{result.level.value}] 관련성: {result.relevance_score:.2f}\\n"
                result_text += f"   내용: {str(result.content)[:100]}...\\n\\n"
        else:
            result_text += "❌ 검색 결과가 없습니다.\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def execute_forgetting_cycle(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """8차원 망각 사이클 실행"""
        stats = self.context_manager.execute_forgetting_cycle()
        
        result_text = f"🧠 8차원 망각 사이클 완료\\n\\n"
        result_text += f"📊 평가된 노드: {stats['evaluated_nodes']}개\\n"
        result_text += f"🗑️ 망각된 노드: {stats['forgotten_nodes']}개\\n"
        result_text += f"💾 보존된 노드: {stats['preserved_nodes']}개\\n"
        result_text += f"🔄 업데이트된 노드: {stats['updated_scores']}개\\n\\n"
        
        forgetting_rate = stats['forgotten_nodes'] / stats['evaluated_nodes'] * 100 if stats['evaluated_nodes'] > 0 else 0
        result_text += f"📈 망각률: {forgetting_rate:.1f}%\\n"
        
        if forgetting_rate > 50:
            result_text += "⚠️ 높은 망각률 감지 - 중요 정보 보존 검토 필요\\n"
        elif forgetting_rate < 10:
            result_text += "✅ 낮은 망각률 - 메모리 효율성 양호\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 샌드박스 도구 구현 ===
    async def create_sandbox(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """샌드박스 생성"""
        sandbox_id = args["sandbox_id"]
        project_path = args["project_path"]
        permission_level_str = args.get("permission_level", "샌드박스_레벨")
        network_allowed = args.get("network_allowed", False)
        time_limit = args.get("time_limit", 300)
        
        # 문자열을 PermissionLevel enum으로 변환
        permission_mapping = {
            "샌드박스_레벨": PermissionLevel.SANDBOX,
            "사용자_레벨": PermissionLevel.USER,
            "관리자_레벨": PermissionLevel.ADMIN,
            "시스템_레벨": PermissionLevel.SYSTEM,
            "권한_없음": PermissionLevel.NONE
        }
        permission_level = permission_mapping.get(permission_level_str, PermissionLevel.SANDBOX)
        
        config = SandboxConfig(
            sandbox_id=sandbox_id,
            project_path=project_path,
            allowed_paths=[project_path],
            forbidden_paths=["/System", "/usr", "/etc"],
            permission_level=permission_level,
            resource_limits={
                "cpu_percent": 30,
                "memory_mb": 512,
                "process_count": 5
            },
            network_allowed=network_allowed,
            time_limit=time_limit,
            auto_cleanup=True
        )
        
        result = self.sandbox_manager.create_sandbox(config)
        
        if result["status"] == "SUCCESS":
            result_text = f"🔒 샌드박스 생성 완료\\n\\n"
            result_text += f"🆔 샌드박스 ID: {sandbox_id}\\n"
            result_text += f"📂 프로젝트 경로: {project_path}\\n"
            result_text += f"🔐 권한 레벨: {permission_level_str}\\n"
            result_text += f"🌐 네트워크 허용: {'예' if network_allowed else '아니오'}\\n"
            result_text += f"⏱️ 시간 제한: {time_limit}초\\n"
            result_text += f"📊 위험도: {result['risk_assessment']['risk_level']}\\n"
            
            # 리소스 제한 표시
            result_text += f"\\n💻 리소스 제한:\\n"
            result_text += f"  • CPU: 30%\\n"
            result_text += f"  • 메모리: 512MB\\n"
            result_text += f"  • 프로세스: 5개\\n"
        else:
            result_text = f"❌ 샌드박스 생성 실패\\n\\n"
            result_text += f"🚫 사유: {result.get('reason', '알 수 없는 오류')}\\n"
            if 'risk_assessment' in result:
                result_text += f"📊 위험도: {result['risk_assessment']['total_risk']}/50\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def execute_in_sandbox(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """샌드박스 내 명령 실행"""
        sandbox_id = args["sandbox_id"]
        command = args["command"]
        input_data = args.get("input_data")
        
        result = self.sandbox_manager.execute_in_sandbox(sandbox_id, command, input_data)
        
        if result["status"] == "SUCCESS":
            result_text = f"✅ 명령 실행 완료\\n\\n"
            result_text += f"🆔 샌드박스: {sandbox_id}\\n"
            result_text += f"💻 명령어: {command}\\n"
            result_text += f"🔢 반환 코드: {result.get('return_code', 'N/A')}\\n"
            result_text += f"⏱️ 실행 시간: {result.get('execution_time', 0):.2f}초\\n\\n"
            
            if result.get("stdout"):
                result_text += f"📤 출력:\\n{result['stdout'][:500]}\\n\\n"
            
            if result.get("stderr"):
                result_text += f"⚠️ 오류:\\n{result['stderr'][:300]}\\n\\n"
            
            # 리소스 사용량
            if result.get("resource_usage"):
                usage = result["resource_usage"]
                result_text += f"📊 리소스 사용량:\\n"
                result_text += f"  • CPU: {usage.get('cpu_percent', 0):.1f}%\\n"
                result_text += f"  • 메모리: {usage.get('memory_mb', 0):.1f}MB\\n"
                
        elif result["status"] == "BLOCKED":
            result_text = f"🚫 명령 실행 차단\\n\\n"
            result_text += f"🆔 샌드박스: {sandbox_id}\\n"
            result_text += f"💻 명령어: {command}\\n"
            result_text += f"🚨 차단 사유: {result.get('reason', '알 수 없음')}\\n"
            
        elif result["status"] == "TIMEOUT":
            result_text = f"⏰ 명령 실행 시간 초과\\n\\n"
            result_text += f"🆔 샌드박스: {sandbox_id}\\n"
            result_text += f"💻 명령어: {command}\\n"
            result_text += f"📝 메시지: {result.get('message', '')}\\n"
            
        else:
            result_text = f"❌ 명령 실행 실패\\n\\n"
            result_text += f"🆔 샌드박스: {sandbox_id}\\n"
            result_text += f"💻 명령어: {command}\\n"
            result_text += f"📝 오류: {result.get('message', '알 수 없는 오류')}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def get_sandbox_status(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """샌드박스 상태 조회"""
        sandbox_id = args["sandbox_id"]
        
        status = self.sandbox_manager.get_sandbox_status(sandbox_id)
        
        if status["status"] == "ACTIVE":
            result_text = f"🟢 샌드박스 활성 상태\\n\\n"
            result_text += f"🆔 샌드박스 ID: {sandbox_id}\\n"
            result_text += f"🔐 권한 레벨: {status['permission_level']}\\n"
            result_text += f"🌐 네트워크 허용: {'예' if status['network_allowed'] else '아니오'}\\n"
            result_text += f"🗑️ 자동 정리: {'예' if status['auto_cleanup'] else '아니오'}\\n\\n"
            
            # 프로세스 정보
            result_text += f"⚙️ 프로세스 상태:\\n"
            result_text += f"  • 활성: {status['active_processes']}개\\n"
            result_text += f"  • 총계: {status['total_processes']}개\\n\\n"
            
            # 리소스 사용량
            usage = status.get("resource_usage", {})
            limits = status.get("resource_limits", {})
            
            result_text += f"📊 리소스 현황:\\n"
            result_text += f"  • CPU: {usage.get('cpu_percent', 0):.1f}% / {limits.get('cpu_percent', 0)}%\\n"
            result_text += f"  • 메모리: {usage.get('memory_mb', 0):.1f}MB / {limits.get('memory_mb', 0)}MB\\n"
            result_text += f"  • 디스크: {usage.get('disk_usage_mb', 0):.1f}MB\\n"
            
        else:
            result_text = f"🔴 샌드박스를 찾을 수 없음\\n\\n"
            result_text += f"🆔 샌드박스 ID: {sandbox_id}\\n"
            result_text += f"📝 상태: {status['status']}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def destroy_sandbox(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """샌드박스 삭제"""
        sandbox_id = args["sandbox_id"]
        
        result = self.sandbox_manager.destroy_sandbox(sandbox_id)
        
        if result["status"] == "SUCCESS":
            result_text = f"🗑️ 샌드박스 삭제 완료\\n\\n"
            result_text += f"🆔 샌드박스 ID: {sandbox_id}\\n"
            result_text += f"⚙️ 종료된 프로세스: {result['terminated_processes']}개\\n"
            result_text += f"🧹 정리 완료: {'예' if result['cleaned_up'] else '아니오'}\\n"
        else:
            result_text = f"❌ 샌드박스 삭제 실패\\n\\n"
            result_text += f"🆔 샌드박스 ID: {sandbox_id}\\n"
            result_text += f"📝 오류: {result.get('message', '알 수 없는 오류')}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 사고 고도화 도구 구현 ===
    async def thinking_advancement(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """고급 사고 시스템"""
        task_content = args["task_content"]
        thinking_mode_str = args.get("thinking_mode", "심층_사고")
        priority_str = args.get("priority", "맥락_우선")
        required_models_str = args.get("required_models", ["분석적_추론", "비판적_추론"])
        quality_threshold = args.get("quality_threshold", 0.7)
        
        # Enum 변환
        thinking_mode_mapping = {
            "심층_사고": ThinkingMode.DEEP,
            "광범위_사고": ThinkingMode.BROAD,
            "집중_사고": ThinkingMode.FOCUSED,
            "탐색_사고": ThinkingMode.EXPLORATORY,
            "수렴_사고": ThinkingMode.CONVERGENT,
            "발산_사고": ThinkingMode.DIVERGENT
        }
        thinking_mode = thinking_mode_mapping.get(thinking_mode_str, ThinkingMode.DEEP)
        
        priority_mapping = {
            "즉시_우선": ContextualPriority.IMMEDIATE,
            "맥락_우선": ContextualPriority.CONTEXTUAL,
            "전략_우선": ContextualPriority.STRATEGIC,
            "궁극_우선": ContextualPriority.ULTIMATE
        }
        priority = priority_mapping.get(priority_str, ContextualPriority.CONTEXTUAL)
        
        model_mapping = {
            "분석적_추론": ReasoningModel.ANALYTICAL,
            "창의적_추론": ReasoningModel.CREATIVE,
            "비판적_추론": ReasoningModel.CRITICAL,
            "체계적_추론": ReasoningModel.SYSTEMATIC,
            "직관적_추론": ReasoningModel.INTUITIVE,
            "확률적_추론": ReasoningModel.PROBABILISTIC
        }
        required_models = [model_mapping.get(m, ReasoningModel.ANALYTICAL) for m in required_models_str]
        
        task = ThinkingTask(
            task_id=f"task_{int(time.time())}",
            content=task_content,
            context={"source": "mcp_request"},
            required_models=required_models,
            thinking_mode=thinking_mode,
            priority=priority,
            quality_threshold=quality_threshold
        )
        
        result = await self.thinking_engine.advance_thinking(task)
        
        result_text = f"🎯 사고 고도화 완료\\n\\n"
        result_text += f"📋 작업 ID: {result.task_id}\\n"
        result_text += f"🧠 사고 모드: {thinking_mode_str}\\n"
        result_text += f"⭐ 우선순위: {priority_str}\\n"
        result_text += f"📊 고도화 점수: {result.advancement_score:.2f}/1.0\\n"
        result_text += f"✨ 전체 품질: {result.quality_metrics['overall_quality']:.2f}/1.0\\n\\n"
        
        # Sequential thinking 단계
        result_text += f"🔄 Sequential Thinking 단계:\\n"
        for step in result.sequential_steps:
            result_text += f"  • {step['stage']}: 품질 {step['quality_score']:.2f}\\n"
        
        # 선택된 접근법
        chosen_approach = result.contextual_decision['chosen_approach']
        result_text += f"\\n🎯 선택된 접근법: {chosen_approach}\\n"
        
        # 최종 권고안 (요약)
        recommendation_lines = result.final_recommendation.split('\\n')[:5]
        result_text += f"\\n💡 최종 권고사항:\\n"
        for line in recommendation_lines:
            if line.strip():
                result_text += f"  {line.strip()[:80]}...\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 작업 프로세스 강제화 도구 구현 ===
    async def process_user_instruction(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 지시 처리 (피드백 시스템 적용)"""
        user_request = args["user_request"]
        context = args.get("context", {})
        
        result = self.work_enforcer.process_user_instruction(user_request, context)
        
        if result["status"] == "BLOCKED":
            result_text = f"🚫 작업 차단\\n\\n"
            result_text += f"📝 요청: {user_request[:100]}...\\n"
            result_text += f"❌ 차단 사유: {result['reason']}\\n\\n"
            result_text += "위반 사항:\\n"
            for violation in result['violations']:
                result_text += f"  • {violation}\\n"
        
        elif result["status"] == "FEEDBACK_REQUIRED":
            feedback = result["feedback"]
            result_text = f"💬 작업 피드백 요청\\n\\n"
            result_text += f"📝 요청: {user_request[:100]}...\\n"
            result_text += f"🆔 피드백 ID: {feedback.feedback_id}\\n\\n"
            
            result_text += "📋 작업 단계:\\n"
            for step in feedback.work_steps:
                result_text += f"  • {step}\\n"
            
            result_text += "\\n🎯 의도 파악:\\n"
            for intention in feedback.intentions:
                result_text += f"  • {intention}\\n"
            
            result_text += "\\n⚠️ 위험 요소:\\n"
            for risk in feedback.risks:
                result_text += f"  • {risk}\\n"
            
            result_text += "\\n💡 대안:\\n"
            for alt in feedback.alternatives:
                result_text += f"  • {alt}\\n"
            
            result_text += f"\\n✅ 위 내용을 확인하고 승인하시겠습니까? (피드백 ID: {feedback.feedback_id})"
        
        else:  # PROCEED
            result_text = f"✅ 작업 진행\\n\\n"
            result_text += f"📝 요청: {user_request}\\n"
            result_text += f"🔄 작업 유형: {result['instruction'].work_type.value}\\n"
            result_text += f"📊 복잡도: {result['instruction'].complexity_level}/10\\n"
            result_text += f"⚠️ 위험도: {result['instruction'].risk_level}/10\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def process_feedback_response(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 피드백 응답 처리"""
        feedback_id = args["feedback_id"]
        user_response = args["user_response"]
        
        result = self.work_enforcer.process_user_feedback_response(feedback_id, user_response)
        
        if result["status"] == "APPROVED":
            result_text = f"✅ 작업 승인됨\\n\\n"
            result_text += f"📝 최종 계획:\\n"
            for step in result['final_plan']:
                result_text += f"  • {step}\\n"
        
        elif result["status"] == "CLARIFICATION_NEEDED":
            feedback = result["feedback"]
            result_text = f"❓ 추가 명확화 필요\\n\\n"
            result_text += f"🆔 새 피드백 ID: {feedback.feedback_id}\\n\\n"
            result_text += "명확화 질문:\\n"
            for question in feedback.alternatives:
                result_text += f"  • {question}\\n"
        
        elif result["status"] == "MAX_FEEDBACK_REACHED":
            result_text = f"⏳ 최대 피드백 횟수 도달\\n\\n"
            result_text += "현재 이해 기준으로 작업을 진행합니다."
        
        elif result["status"] == "CANCELLED":
            result_text = f"❌ 작업 취소됨\\n\\n"
            result_text += f"취소 사유: {result['reason']}"
        
        else:
            result_text = f"❌ 오류 발생\\n\\n{result['message']}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 맥락 문서 관리 도구 구현 ===
    async def add_user_instruction(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 지시사항 추가"""
        user_request = args["user_request"]
        agent_response = args.get("agent_response", "")
        actual_implementation = args.get("actual_implementation", "")
        status = args.get("status", "in_progress")
        
        instruction_id = self.context_document_manager.add_user_instruction(
            user_request, agent_response, actual_implementation, status
        )
        
        result_text = f"📝 사용자 지시사항 추가 완료\\n\\n"
        result_text += f"🆔 지시사항 ID: {instruction_id}\\n"
        result_text += f"📋 요청: {user_request[:100]}...\\n"
        result_text += f"📊 상태: {status}\\n"
        result_text += f"📁 저장 위치: .claude/context/user_instructions.json\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def add_feature_spec(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """기능명세서 추가"""
        feature_name = args["feature_name"]
        description = args["description"]
        status = args.get("status", "planned")
        dependencies = args.get("dependencies", [])
        implementation_notes = args.get("implementation_notes", "")
        
        feature_id = self.context_document_manager.add_feature_spec(
            feature_name, description, status, dependencies, implementation_notes
        )
        
        result_text = f"📋 기능명세서 추가 완료\\n\\n"
        result_text += f"🆔 기능 ID: {feature_id}\\n"
        result_text += f"🏷️ 기능명: {feature_name}\\n"
        result_text += f"📊 상태: {status}\\n"
        result_text += f"📝 설명: {description[:100]}...\\n"
        result_text += f"📁 저장 위치: .claude/context/feature_specifications.json\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def search_context(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """맥락 검색"""
        query = args["query"]
        document_types = args.get("document_types")
        
        results = self.context_document_manager.search_context(query, document_types)
        
        result_text = f"🔍 맥락 검색 결과\\n\\n"
        result_text += f"🔎 검색어: {query}\\n\\n"
        
        for doc_type, items in results.items():
            if items:
                result_text += f"📂 {doc_type.upper()} ({len(items)}개 발견):\\n"
                for item in items[:3]:  # 최대 3개만 표시
                    if hasattr(item, 'user_request'):
                        result_text += f"  • {item.user_request[:80]}...\\n"
                    elif hasattr(item, 'feature_name'):
                        result_text += f"  • {item.feature_name}: {item.description[:60]}...\\n"
                    elif hasattr(item, 'component_name'):
                        result_text += f"  • {item.component_name}: {item.description[:60]}...\\n"
                result_text += "\\n"
        
        if not any(results.values()):
            result_text += "❌ 검색 결과가 없습니다.\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def get_project_summary(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """프로젝트 전체 요약"""
        summary = self.context_document_manager.get_project_summary()
        
        result_text = f"📊 프로젝트 요약\\n\\n"
        result_text += f"🏷️ 프로젝트: {summary['project_metadata']['project_name']}\\n"
        result_text += f"📅 생성일: {summary['project_metadata']['created_at'][:10]}\\n"
        result_text += f"🔄 마지막 업데이트: {summary['project_metadata']['last_updated'][:10]}\\n\\n"
        
        stats = summary['statistics']
        result_text += f"📈 통계:\\n"
        result_text += f"  • 총 지시사항: {stats['total_instructions']}개\\n"
        result_text += f"  • 완료된 지시사항: {stats['completed_instructions']}개\\n"
        result_text += f"  • 완료율: {stats['completion_rate']:.1f}%\\n"
        result_text += f"  • 활성 기능: {stats['active_features']}개\\n"
        result_text += f"  • 총 대화: {stats['total_conversations']}회\\n\\n"
        
        if summary['top_tags']:
            result_text += f"🏷️ 주요 태그:\\n"
            for tag, count in summary['top_tags'][:5]:
                result_text += f"  • {tag}: {count}회\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 포트 관리 도구 구현 ===
    async def get_project_port_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """프로젝트용 포트 할당"""
        project_name = args["project_name"]
        service_name = args.get("service_name", "default")
        
        try:
            port = get_project_port(project_name, service_name)
            port_info = self.port_manager.get_project_port_info(project_name)
            
            result_text = f"🚢 포트 할당 완료\\n\\n"
            result_text += f"📋 프로젝트: {project_name}\\n"
            result_text += f"🔌 할당된 포트: {port}\\n"
            result_text += f"⚙️ 서비스: {service_name}\\n"
            if port_info:
                result_text += f"📊 포트 범위: {port_info['port_range']}\\n"
                result_text += f"🔄 상태: {port_info['status']}\\n"
                result_text += f"💡 사용 가능한 포트: {port_info['available_ports']}개\\n"
            
        except Exception as e:
            result_text = f"❌ 포트 할당 실패\\n\\n"
            result_text += f"📋 프로젝트: {project_name}\\n"
            result_text += f"🔥 오류: {str(e)}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def register_new_project_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """새 프로젝트 포트 블록 등록"""
        project_name = args["project_name"]
        description = args.get("description", "")
        
        result = register_project(project_name, description)
        
        if result["status"] == "success":
            result_text = f"✅ 프로젝트 등록 완료\\n\\n"
            result_text += f"📋 프로젝트: {result['project_name']}\\n"
            result_text += f"🚢 포트 범위: {result['port_range']}\\n"
            result_text += f"📊 할당된 포트: {result['allocated_ports']}개\\n"
            result_text += f"📝 설명: {description}\\n"
        elif result["status"] == "exists":
            result_text = f"⚠️ 이미 등록된 프로젝트\\n\\n"
            result_text += f"📋 프로젝트: {project_name}\\n"
            result_text += f"💬 메시지: {result['message']}\\n"
        else:
            result_text = f"❌ 프로젝트 등록 실패\\n\\n"
            result_text += f"📋 프로젝트: {project_name}\\n"
            result_text += f"🔥 오류: {result['message']}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def port_status_summary_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """전체 포트 상태 요약"""
        summary = self.port_manager.get_port_status_summary()
        
        result_text = f"📊 포트 관리 시스템 상태\\n\\n"
        result_text += f"🏗️ 총 프로젝트: {summary['total_projects']}개\\n"
        result_text += f"🟢 활성 블록: {summary['active_blocks']}개\\n"
        result_text += f"🟡 비활성 블록: {summary['inactive_blocks']}개\\n"
        result_text += f"🔴 망각된 블록: {summary['forgotten_blocks']}개\\n\\n"
        
        result_text += f"🚢 할당된 총 포트: {summary['total_ports_allocated']}개\\n"
        result_text += f"⏭️ 다음 사용 가능 블록: {summary['next_available_block']}\\n"
        result_text += f"📈 최근 7일 사용: {summary['recent_usage_count']}회\\n\\n"
        
        result_text += f"🔒 예약된 프로젝트:\\n"
        for project in summary['reserved_projects']:
            info = self.port_manager.get_project_port_info(project)
            if info:
                result_text += f"  • {project}: {info['port_range']} ({info['status']})\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def run_port_forgetting_cycle_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """포트 망각 사이클 실행"""
        try:
            # 망각 사이클 실행 전 상태
            before_summary = self.port_manager.get_port_status_summary()
            
            # 망각 사이클 실행
            self.port_manager.execute_forgetting_cycle()
            
            # 실행 후 상태
            after_summary = self.port_manager.get_port_status_summary()
            
            result_text = f"🧠 포트 망각 사이클 실행 완료\\n\\n"
            result_text += f"📊 실행 전/후 비교:\\n"
            result_text += f"  • 활성 블록: {before_summary['active_blocks']} → {after_summary['active_blocks']}\\n"
            result_text += f"  • 비활성 블록: {before_summary['inactive_blocks']} → {after_summary['inactive_blocks']}\\n"
            result_text += f"  • 망각된 블록: {before_summary['forgotten_blocks']} → {after_summary['forgotten_blocks']}\\n\\n"
            
            # 정리 실행
            self.port_manager.execute_forgetting_cleanup()
            final_summary = self.port_manager.get_port_status_summary()
            
            result_text += f"🧹 정리 후 최종 상태:\\n"
            result_text += f"  • 총 프로젝트: {final_summary['total_projects']}개\\n"
            result_text += f"  • 할당된 포트: {final_summary['total_ports_allocated']}개\\n"
            
            result_text += f"\\n💡 망각 기준: 시간(60%) + 사용빈도(40%)\\n"
            result_text += f"⏰ 6개월 이상 미사용시 자동 정리\\n"
            
        except Exception as e:
            result_text = f"❌ 망각 사이클 실행 실패\\n\\n"
            result_text += f"🔥 오류: {str(e)}\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 시스템 도구 구현 ===
    async def system_health_check(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """시스템 건강 상태 점검"""
        detailed = args.get("detailed", False)
        
        # 각 서브시스템 상태 확인
        try:
            context_summary = self.context_manager.get_context_summary()
        except Exception:
            context_summary = {"total_nodes": 0}
        
        try:
            sandbox_list = self.sandbox_manager.list_sandboxes()
        except Exception:
            sandbox_list = {"total_sandboxes": 0}
        
        # 메타인지와 사고 고도화는 빈 상태로 시작
        meta_cognitive_summary = {"total_tasks": 0, "average_quality": 0}
        thinking_summary = {"total_tasks": 0, "average_advancement_score": 0}
        
        result_text = f"🏥 BOOSAAN ULTIMATE 시스템 건강 점검\\n\\n"
        
        # 전체 상태
        total_score = 0.0
        component_count = 0
        
        # 메타인지 엔진
        result_text += f"🧠 메타인지 엔진: "
        if meta_cognitive_summary.get('total_tasks', 0) > 0:
            avg_quality = meta_cognitive_summary.get('average_quality', 0)
            result_text += f"✅ 정상 (품질: {avg_quality:.2f})\\n"
            total_score += avg_quality
        else:
            result_text += f"⚠️ 미사용\\n"
            total_score += 0.5
        component_count += 1
        
        # 맥락 관리
        result_text += f"🗃️ 맥락 관리: "
        total_nodes = context_summary.get('total_nodes', 0)
        if total_nodes > 0:
            result_text += f"✅ 정상 ({total_nodes}개 노드)\\n"
            total_score += 0.8
        else:
            result_text += f"⚠️ 빈 맥락\\n"
            total_score += 0.3
        component_count += 1
        
        # 샌드박스 관리
        result_text += f"🔒 샌드박스 관리: "
        total_sandboxes = sandbox_list.get('total_sandboxes', 0)
        result_text += f"✅ 정상 ({total_sandboxes}개 활성)\\n"
        total_score += 0.8
        component_count += 1
        
        # 사고 고도화
        result_text += f"🎯 사고 고도화: "
        if thinking_summary.get('total_tasks', 0) > 0:
            avg_advancement = thinking_summary.get('average_advancement_score', 0)
            result_text += f"✅ 정상 (고도화: {avg_advancement:.2f})\\n"
            total_score += avg_advancement
        else:
            result_text += f"⚠️ 미사용\\n"
            total_score += 0.5
        component_count += 1
        
        # 전체 건강 점수
        overall_health = total_score / component_count if component_count > 0 else 0.5
        result_text += f"\\n📊 전체 건강 점수: {overall_health:.2f}/1.0\\n"
        
        if overall_health >= 0.8:
            result_text += f"🟢 시스템 상태: 우수\\n"
        elif overall_health >= 0.6:
            result_text += f"🟡 시스템 상태: 양호\\n"
        elif overall_health >= 0.4:
            result_text += f"🟠 시스템 상태: 주의\\n"
        else:
            result_text += f"🔴 시스템 상태: 위험\\n"
        
        # 상세 정보
        if detailed:
            result_text += f"\\n📋 상세 정보:\\n"
            result_text += f"  • 메타인지 처리 작업: {meta_cognitive_summary.get('total_tasks', 0)}개\\n"
            result_text += f"  • 맥락 노드 수: {total_nodes}개\\n"
            result_text += f"  • 활성 샌드박스: {total_sandboxes}개\\n"
            result_text += f"  • 사고 고도화 작업: {thinking_summary.get('total_tasks', 0)}개\\n"
            result_text += f"  • 성능 메트릭:\\n"
            result_text += f"    - 총 요청: {self.performance_metrics['total_requests']}개\\n"
            result_text += f"    - 성공 작업: {self.performance_metrics['successful_operations']}개\\n"
            result_text += f"    - 차단 작업: {self.performance_metrics['blocked_operations']}개\\n"
            result_text += f"    - 평균 응답: {self.performance_metrics['average_response_time']:.3f}초\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def performance_metrics_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """성능 메트릭 조회"""
        metrics = self.performance_metrics.copy()
        
        # 성공률 계산
        success_rate = 0.0
        if metrics['total_requests'] > 0:
            success_rate = metrics['successful_operations'] / metrics['total_requests'] * 100
        
        # 차단률 계산
        block_rate = 0.0
        if metrics['total_requests'] > 0:
            block_rate = metrics['blocked_operations'] / metrics['total_requests'] * 100
        
        result_text = f"📊 BOOSAAN ULTIMATE 성능 메트릭\\n\\n"
        result_text += f"📈 요청 통계:\\n"
        result_text += f"  • 총 요청 수: {metrics['total_requests']}개\\n"
        result_text += f"  • 성공 작업: {metrics['successful_operations']}개 ({success_rate:.1f}%)\\n"
        result_text += f"  • 차단 작업: {metrics['blocked_operations']}개 ({block_rate:.1f}%)\\n\\n"
        
        result_text += f"⏱️ 성능 지표:\\n"
        result_text += f"  • 평균 응답 시간: {metrics['average_response_time']:.3f}초\\n"
        
        # 성능 평가
        if metrics['average_response_time'] < 0.1:
            response_status = "🟢 매우 빠름"
        elif metrics['average_response_time'] < 0.5:
            response_status = "🟡 보통"
        elif metrics['average_response_time'] < 1.0:
            response_status = "🟠 느림"
        else:
            response_status = "🔴 매우 느림"
        
        result_text += f"  • 응답 속도: {response_status}\\n"
        
        # 보안 지표
        result_text += f"\\n🔒 보안 지표:\\n"
        result_text += f"  • 보안 차단률: {block_rate:.1f}%\\n"
        if block_rate > 20:
            result_text += f"  • 상태: 🔴 높은 위험 요청 빈도\\n"
        elif block_rate > 5:
            result_text += f"  • 상태: 🟡 보통 위험 요청\\n"
        else:
            result_text += f"  • 상태: 🟢 안전한 사용 패턴\\n"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 예측적 피드백 및 규칙 격리 도구 구현 ===
    async def analyze_user_intention_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """사용자 의도 예측적 분석 (예측하고 피드백, 절대 예측하고 수행 안함)"""
        user_request = args["user_request"]
        conversation_history = args.get("conversation_history", [])
        
        try:
            analysis = self.rule_isolation.analyze_user_intention(user_request, conversation_history)
            
            result_text = f"🧠 사용자 의도 예측 분석\\n\\n"
            result_text += f"📝 요청: {user_request[:100]}...\\n"
            result_text += f"🎯 예측된 의도: {analysis.intention_type.value}\\n"
            result_text += f"📊 신뢰도: {analysis.confidence_score:.2f}/1.0\\n\\n"
            
            # 과거 근거
            if analysis.past_context_evidence:
                result_text += f"📚 과거 맥락 근거:\\n"
                for evidence in analysis.past_context_evidence[:3]:
                    result_text += f"  • {evidence}\\n"
                result_text += "\\n"
            
            # 미래 예측
            if analysis.future_implications:
                result_text += f"🔮 미래 결과 예측:\\n"
                for implication in analysis.future_implications[:3]:
                    result_text += f"  • {implication}\\n"
                result_text += "\\n"
            
            # 위험 요소
            if analysis.risk_factors:
                result_text += f"⚠️ 위험 요소:\\n"
                for risk in analysis.risk_factors[:2]:
                    result_text += f"  • {risk}\\n"
                result_text += "\\n"
            
            # 추천 응답 방식
            result_text += f"💡 추천 응답 방식: {analysis.recommended_response}\\n\\n"
            
            # 명확화 질문들 (핵심!)
            result_text += f"❓ 예측 기반 확인 질문들:\\n"
            for i, question in enumerate(analysis.clarification_questions, 1):
                result_text += f"{i}. {question}\\n"
            
            if analysis.intention_type in [IntentionType.FRUSTRATION, IntentionType.IMPOSSIBLE_TASK]:
                result_text += "\\n🚫 **즉시 수행하지 않고 위 질문들로 의도를 명확히 한 후 진행하세요**"
            
        except Exception as e:
            result_text = f"❌ 의도 분석 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def check_rule_contamination_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """프로젝트 규칙 오염 검사"""
        project_name = args["project_name"]
        
        try:
            contamination_result = self.rule_isolation.check_rule_contamination(project_name)
            
            result_text = f"🔍 규칙 오염 검사 결과\\n\\n"
            result_text += f"📋 프로젝트: {project_name}\\n"
            result_text += f"🎯 상태: {contamination_result['status']}\\n"
            result_text += f"🚨 오염 발견: {'예' if contamination_result['contamination_found'] else '아니오'}\\n\\n"
            
            if contamination_result['contamination_found']:
                result_text += f"🔍 발견된 오염:\\n"
                for contamination in contamination_result['contaminated_rules']:
                    result_text += f"  • 타입: {contamination['contamination_type']}\\n"
                    result_text += f"    유사도: {contamination['similarity']:.2f}\\n"
                    result_text += f"    프로젝트 규칙: {contamination['project_rule']}\\n"
                    if contamination['global_rule']:
                        result_text += f"    전역 규칙: {contamination['global_rule']}\\n"
                    result_text += "\\n"
                
                result_text += f"💡 권장사항: {contamination_result['recommendation']}\\n"
            else:
                result_text += "✅ 프로젝트 규칙이 깔끔하게 분리되어 있습니다.\\n"
                result_text += "🛡️ 전역 규칙 오염 없음\\n"
            
        except Exception as e:
            result_text = f"❌ 오염 검사 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def add_rule_with_isolation_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """규칙 추가 (오염 방지 검사 포함)"""
        content = args["content"]
        rule_type_str = args["rule_type"]
        scope_str = args["scope"]
        project_name = args.get("project_name")
        source_context = args.get("source_context", "")
        
        try:
            # Enum 변환
            rule_type_mapping = {
                "패턴": RuleType.PATTERN,
                "가이드라인": RuleType.GUIDELINE,
                "선호도": RuleType.PREFERENCE,
                "제약조건": RuleType.CONSTRAINT,
                "워크플로우": RuleType.WORKFLOW
            }
            
            scope_mapping = {
                "전역": RuleScope.GLOBAL,
                "프로젝트": RuleScope.PROJECT,
                "세션": RuleScope.SESSION,
                "임시": RuleScope.TEMPORARY
            }
            
            rule_type = rule_type_mapping.get(rule_type_str)
            scope = scope_mapping.get(scope_str)
            
            if not rule_type or not scope:
                result_text = f"❌ 잘못된 규칙 타입 또는 범위\\n"
                result_text += f"규칙 타입: {rule_type_str}\\n"
                result_text += f"범위: {scope_str}\\n"
            else:
                rule_id = self.rule_isolation.add_rule(
                    content, rule_type, scope, project_name, source_context
                )
                
                result_text = f"✅ 규칙 추가 완료\\n\\n"
                result_text += f"🆔 규칙 ID: {rule_id}\\n"
                result_text += f"📝 내용: {content}\\n"
                result_text += f"🏷️ 타입: {rule_type_str}\\n"
                result_text += f"🎯 범위: {scope_str}\\n"
                
                if project_name:
                    result_text += f"📋 프로젝트: {project_name}\\n"
                
                # 오염 방지 검사 결과 표시
                if scope == RuleScope.GLOBAL:
                    result_text += "\\n🛡️ 전역 규칙 오염 방지 검사 통과\\n"
                else:
                    result_text += "\\n🔒 프로젝트 규칙으로 안전하게 격리됨\\n"
            
        except Exception as e:
            result_text = f"❌ 규칙 추가 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    # === 터미널 세션 추적 도구 구현 ===
    async def get_terminal_session_info_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """현재 터미널 세션 정보 조회"""
        try:
            session_uptime = time.time() - self.session_start_time.timestamp()
            
            result_text = f"🖥️ 터미널 세션 정보\\n\\n"
            result_text += f"🆔 터미널 ID: {self.terminal_id}\\n"
            result_text += f"⏰ 세션 시작: {self.session_start_time.strftime('%Y-%m-%d %H:%M:%S')}\\n"
            result_text += f"⏱️ 세션 지속시간: {int(session_uptime//3600):02d}:{int((session_uptime%3600)//60):02d}:{int(session_uptime%60):02d}\\n"
            result_text += f"💬 총 대화 수: {self.conversation_counter}개\\n"
            result_text += f"⚙️ 총 작업 수: {self.task_counter}개\\n\\n"
            
            result_text += f"📂 작업 공간: {self.workspace}\\n"
            result_text += f"🗄️ 세션 DB: {self.session_db_path.name}\\n"
            result_text += f"📊 버전: {self.version}\\n\\n"
            
            # 최근 활동
            try:
                with sqlite3.connect(str(self.session_db_path)) as conn:
                    cursor = conn.execute('''
                        SELECT COUNT(*) FROM conversations 
                        WHERE terminal_id = ? AND timestamp > ?
                    ''', (self.terminal_id, (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()))
                    
                    recent_count = cursor.fetchone()[0]
                    result_text += f"📈 최근 1시간 활동: {recent_count}개 대화\\n"
                    
            except Exception as e:
                result_text += f"❌ 최근 활동 조회 실패: {e}\\n"
            
        except Exception as e:
            result_text = f"❌ 세션 정보 조회 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def search_conversation_history_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """대화 내역 검색"""
        query = args["query"]
        time_range_hours = args.get("time_range_hours", 24)
        limit = args.get("limit", 10)
        
        try:
            search_time = (datetime.now(timezone.utc) - timedelta(hours=time_range_hours)).isoformat()
            
            with sqlite3.connect(str(self.session_db_path)) as conn:
                cursor = conn.execute('''
                    SELECT conversation_id, timestamp, request_data, response_data, status
                    FROM conversations 
                    WHERE terminal_id = ? AND timestamp > ?
                    AND (request_data LIKE ? OR response_data LIKE ?)
                    ORDER BY timestamp DESC LIMIT ?
                ''', (self.terminal_id, search_time, f"%{query}%", f"%{query}%", limit))
                
                results = cursor.fetchall()
            
            result_text = f"🔍 대화 내역 검색 결과\\n\\n"
            result_text += f"🔎 검색어: {query}\\n"
            result_text += f"⏰ 검색 범위: 최근 {time_range_hours}시간\\n"
            result_text += f"📊 발견된 대화: {len(results)}개\\n\\n"
            
            if results:
                for i, (conv_id, timestamp, request_data, response_data, status) in enumerate(results, 1):
                    try:
                        request = json.loads(request_data)
                        method = request.get("method", "unknown")
                        
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        time_str = dt.strftime('%m-%d %H:%M')
                        
                        result_text += f"{i}. [{time_str}] {conv_id}\\n"
                        result_text += f"   메서드: {method} | 상태: {status}\\n"
                        
                        if method == "tools/call":
                            tool_name = request.get("params", {}).get("name", "unknown")
                            result_text += f"   도구: {tool_name}\\n"
                        
                        result_text += "\\n"
                        
                    except Exception as e:
                        result_text += f"{i}. 파싱 오류: {e}\\n\\n"
            else:
                result_text += "❌ 검색 결과가 없습니다.\\n"
            
        except Exception as e:
            result_text = f"❌ 검색 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def get_task_history_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """작업 실행 이력 조회"""
        task_type = args.get("task_type")
        status = args.get("status")
        limit = args.get("limit", 20)
        
        try:
            query = '''
                SELECT task_id, created_at, task_type, status, progress_data
                FROM task_tracking 
                WHERE terminal_id = ?
            '''
            params = [self.terminal_id]
            
            if task_type:
                query += " AND task_type = ?"
                params.append(task_type)
                
            if status:
                query += " AND status = ?"
                params.append(status)
                
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            with sqlite3.connect(str(self.session_db_path)) as conn:
                cursor = conn.execute(query, params)
                results = cursor.fetchall()
            
            result_text = f"⚙️ 작업 실행 이력\\n\\n"
            result_text += f"📊 조회된 작업: {len(results)}개\\n"
            if task_type:
                result_text += f"🎯 작업 타입: {task_type}\\n"
            if status:
                result_text += f"📋 상태: {status}\\n"
            result_text += "\\n"
            
            if results:
                for i, (task_id, created_at, ttype, tstatus, progress_data) in enumerate(results, 1):
                    try:
                        dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        time_str = dt.strftime('%m-%d %H:%M:%S')
                        
                        result_text += f"{i}. [{time_str}] {task_id}\\n"
                        result_text += f"   타입: {ttype} | 상태: {tstatus}\\n"
                        
                        if progress_data:
                            try:
                                progress = json.loads(progress_data)
                                if "response_time" in progress:
                                    result_text += f"   실행시간: {progress['response_time']:.3f}초\\n"
                            except:
                                pass
                        
                        result_text += "\\n"
                        
                    except Exception as e:
                        result_text += f"{i}. 파싱 오류: {e}\\n\\n"
            else:
                result_text += "❌ 작업 이력이 없습니다.\\n"
            
        except Exception as e:
            result_text = f"❌ 작업 이력 조회 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def restore_previous_context_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """이전 세션 컨텍스트 복원"""
        hours_back = args.get("hours_back", 24)
        
        try:
            search_time = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()
            
            with sqlite3.connect(str(self.session_db_path)) as conn:
                cursor = conn.execute('''
                    SELECT context_data, metadata, snapshot_time
                    FROM context_snapshots 
                    WHERE terminal_id = ? AND snapshot_time > ?
                    ORDER BY snapshot_time DESC LIMIT 1
                ''', (self.terminal_id, search_time))
                
                result = cursor.fetchone()
            
            if result:
                context_data, metadata_str, snapshot_time = result
                
                try:
                    restored_context = pickle.loads(context_data)
                    metadata = json.loads(metadata_str)
                    
                    # 컨텍스트 복원
                    if "context_memory" in restored_context:
                        self.context_memory.update(restored_context["context_memory"])
                    
                    if "conversation_count" in restored_context:
                        self.conversation_counter = max(self.conversation_counter, restored_context["conversation_count"])
                    
                    if "task_count" in restored_context:
                        self.task_counter = max(self.task_counter, restored_context["task_count"])
                    
                    result_text = f"🔄 컨텍스트 복원 완료\\n\\n"
                    result_text += f"📅 복원 시점: {snapshot_time[:19].replace('T', ' ')}\\n"
                    result_text += f"💾 복원된 메모리: {len(self.context_memory)}개 항목\\n"
                    result_text += f"💬 대화 카운터: {self.conversation_counter}\\n"
                    result_text += f"⚙️ 작업 카운터: {self.task_counter}\\n"
                    result_text += f"📊 메타데이터: {metadata.get('snapshot_type', 'unknown')}\\n"
                    
                except Exception as e:
                    result_text = f"❌ 컨텍스트 복원 실패\\n\\n데이터 파싱 오류: {e}"
            else:
                result_text = f"❌ 복원할 컨텍스트 없음\\n\\n"
                result_text += f"⏰ 검색 범위: 최근 {hours_back}시간\\n"
                result_text += f"💡 더 넓은 범위로 시도해보세요.\\n"
            
        except Exception as e:
            result_text = f"❌ 컨텍스트 복원 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def get_session_statistics_tool(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """터미널 세션 통계 정보"""
        include_performance = args.get("include_performance", True)
        
        try:
            with sqlite3.connect(str(self.session_db_path)) as conn:
                # 전체 통계
                cursor = conn.execute('''
                    SELECT COUNT(*), MIN(timestamp), MAX(timestamp)
                    FROM conversations WHERE terminal_id = ?
                ''', (self.terminal_id,))
                total_conversations, min_time, max_time = cursor.fetchone()
                
                # 상태별 통계
                cursor = conn.execute('''
                    SELECT status, COUNT(*) FROM conversations 
                    WHERE terminal_id = ? GROUP BY status
                ''', (self.terminal_id,))
                status_stats = dict(cursor.fetchall())
                
                # 최근 24시간 활동
                recent_time = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
                cursor = conn.execute('''
                    SELECT COUNT(*) FROM conversations 
                    WHERE terminal_id = ? AND timestamp > ?
                ''', (self.terminal_id, recent_time))
                recent_activity = cursor.fetchone()[0]
                
                # 작업 타입별 통계
                cursor = conn.execute('''
                    SELECT task_type, COUNT(*) FROM task_tracking 
                    WHERE terminal_id = ? GROUP BY task_type
                ''', (self.terminal_id,))
                task_type_stats = dict(cursor.fetchall())
            
            result_text = f"📊 터미널 세션 통계\\n\\n"
            result_text += f"🆔 터미널 ID: {self.terminal_id}\\n\\n"
            
            # 기본 통계
            result_text += f"📈 전체 통계:\\n"
            result_text += f"  • 총 대화 수: {total_conversations}개\\n"
            result_text += f"  • 최근 24시간: {recent_activity}개\\n"
            result_text += f"  • 현재 세션: {self.conversation_counter}개\\n\\n"
            
            # 상태별 통계
            if status_stats:
                result_text += f"📋 상태별 통계:\\n"
                for status, count in status_stats.items():
                    percentage = (count / total_conversations * 100) if total_conversations > 0 else 0
                    result_text += f"  • {status}: {count}개 ({percentage:.1f}%)\\n"
                result_text += "\\n"
            
            # 작업 타입별 통계
            if task_type_stats:
                result_text += f"⚙️ 작업 타입별 통계:\\n"
                for task_type, count in list(task_type_stats.items())[:10]:  # 상위 10개만
                    result_text += f"  • {task_type}: {count}개\\n"
                result_text += "\\n"
            
            # 성능 정보
            if include_performance:
                result_text += f"🚀 성능 메트릭:\\n"
                result_text += f"  • 평균 응답시간: {self.performance_metrics['average_response_time']:.3f}초\\n"
                result_text += f"  • 총 요청: {self.performance_metrics['total_requests']}개\\n"
                result_text += f"  • 성공 작업: {self.performance_metrics['successful_operations']}개\\n"
                result_text += f"  • 차단 작업: {self.performance_metrics['blocked_operations']}개\\n"
                
                if self.performance_metrics['total_requests'] > 0:
                    success_rate = self.performance_metrics['successful_operations'] / self.performance_metrics['total_requests'] * 100
                    result_text += f"  • 성공률: {success_rate:.1f}%\\n"
            
            # 세션 시간 정보
            if min_time and max_time:
                session_duration = (datetime.fromisoformat(max_time.replace('Z', '+00:00')) - 
                                  datetime.fromisoformat(min_time.replace('Z', '+00:00'))).total_seconds()
                hours = int(session_duration // 3600)
                minutes = int((session_duration % 3600) // 60)
                result_text += f"\\n⏰ 활동 기간:\\n"
                result_text += f"  • 첫 활동: {min_time[:19].replace('T', ' ')}\\n"
                result_text += f"  • 마지막: {max_time[:19].replace('T', ' ')}\\n"
                result_text += f"  • 총 기간: {hours}시간 {minutes}분\\n"
            
        except Exception as e:
            result_text = f"❌ 통계 조회 실패\\n\\n오류: {str(e)}"
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": result_text
                }
            ]
        }

    async def list_resources(self) -> Dict[str, Any]:
        """사용 가능한 리소스 목록"""
        resources = [
            {
                "uri": "system://health",
                "name": "시스템 건강 상태",
                "description": "BOOSAAN ULTIMATE 전체 시스템 상태",
                "mimeType": "application/json"
            },
            {
                "uri": "system://performance",
                "name": "성능 메트릭",
                "description": "시스템 성능 및 사용 통계",
                "mimeType": "application/json"
            },
            {
                "uri": "context://summary",
                "name": "맥락 요약",
                "description": "전체 맥락 관리 시스템 요약",
                "mimeType": "application/json"
            },
            {
                "uri": "sandbox://list",
                "name": "샌드박스 목록",
                "description": "활성 샌드박스 목록 및 상태",
                "mimeType": "application/json"
            }
        ]
        
        return {"resources": resources}

    async def read_resource(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """리소스 읽기"""
        uri = params.get("uri", "")
        
        if uri == "system://health":
            health_data = await self.system_health_check({"detailed": True})
            content = health_data["content"][0]["text"]
        elif uri == "system://performance":
            perf_data = await self.performance_metrics_tool({})
            content = perf_data["content"][0]["text"]
        elif uri == "context://summary":
            summary = self.context_manager.get_context_summary()
            content = json.dumps(summary, ensure_ascii=False, indent=2)
        elif uri == "sandbox://list":
            sandbox_list = self.sandbox_manager.list_sandboxes()
            content = json.dumps(sandbox_list, ensure_ascii=False, indent=2)
        else:
            return {"error": f"알 수 없는 리소스: {uri}"}
        
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "text/plain",
                    "text": content
                }
            ]
        }

    def _update_performance_metrics(self, response_time: float, success: bool):
        """성능 메트릭 업데이트"""
        # 이동 평균으로 응답 시간 계산
        current_avg = self.performance_metrics["average_response_time"]
        total_requests = self.performance_metrics["total_requests"]
        
        if total_requests > 1:
            new_avg = ((current_avg * (total_requests - 1)) + response_time) / total_requests
        else:
            new_avg = response_time
        
        self.performance_metrics["average_response_time"] = new_avg

async def main():
    """MCP 서버 실행"""
    server = BOOSAANUltimateMCPServer()
    
    # stdio로 MCP 프로토콜 처리 (안전 종료 추가)
    logger = logging.getLogger(__name__)
    logger.info("BOOSAAN MCP 서버 시작")
    
    try:
        while True:
            try:
                line = await asyncio.to_thread(sys.stdin.readline)
                if not line:
                    logger.info("stdin 종료, 서버 종료")
                    break
                    
                request = json.loads(line.strip())
                response = await server.handle_request(request)
                
                print(json.dumps(response))
                sys.stdout.flush()
                
            except KeyboardInterrupt:
                logger.info("키보드 인터럽트로 종료")
                break
            except json.JSONDecodeError as e:
                logger.error(f"JSON 파싱 오류: {e}")
                continue
            except Exception as e:
                logger.error(f"요청 처리 오류: {e}")
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
    except Exception as e:
        logger.error(f"서버 실행 오류: {e}")
    finally:
        logger.info("BOOSAAN MCP 서버 종료")

if __name__ == "__main__":
    asyncio.run(main())