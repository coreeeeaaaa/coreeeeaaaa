#!/usr/bin/env node

/**
 * coreeeeaaaa MCP Server
 *
 * Standards-compliant MCP server using @modelcontextprotocol/sdk
 * Provides 4 core tools for development automation:
 * 1. run_task - Execute Taskfile.yml tasks
 * 2. manage_spec - Manage SpecKit-compatible feature specs
 * 3. consult_constitution - Query project principles
 * 4. audit_security - Run security scans
 *
 * Architecture: Passive (server never calls AI, only responds to requests)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
import { runTask } from './tools/taskRunner.js';
import { manageSpec } from './tools/specBridge.js';
import { consultConstitution } from './tools/constitution.js';
import { auditSecurity } from './tools/securityAudit.js';
import { speckit } from './tools/speckit.js';
import { loadContext } from './tools/contextBridge.js';
import { serena } from './tools/serenaBridge.js';

// Conditional Serena tool registration - disabled by default to avoid port conflicts
// Enable with SERENA_ENABLED=true environment variable
const serenaTool = process.env.SERENA_ENABLED !== 'false' ? {
  name: 'serena',
  description:
    'Serena MCP integration: manage and search project memory (.serena/memories/ + .coreeeeaaaa/memory/). Actions: config, list, read, write, delete, search. NOTE: Requires SERENA_ENABLED=true',
  inputSchema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['config', 'list', 'read', 'write', 'delete', 'search'],
        description: 'Action to perform',
      },
      name: {
        type: 'string',
        description: 'Memory name (required for read/write/delete)',
      },
      content: {
        type: 'string',
        description: 'Memory content (required for write)',
      },
      query: {
        type: 'string',
        description: 'Search query (required for search)',
      },
    },
    required: ['action'],
  },
} : null;

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'run_task',
    description:
      'Execute a task defined in Taskfile.yml (e.g., "build", "test", "quality", "security"). Returns execution output and status.',
    inputSchema: {
      type: 'object',
      properties: {
        task_name: {
          type: 'string',
          description: 'The name of the task to execute',
        },
      },
      required: ['task_name'],
    },
  },
  {
    name: 'manage_spec',
    description:
      'Manage SpecKit-compatible feature specifications in .coreeeeaaaa/specs/. Supports CRUD operations.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'create', 'update', 'list'],
          description: 'The action to perform',
        },
        feature_id: {
          type: 'string',
          description: 'The feature ID (required for read/create/update)',
        },
        content: {
          type: 'string',
          description: 'The spec content in markdown (required for create/update)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'consult_constitution',
    description:
      'Query the project constitution (.coreeeeaaaa/memory/constitution.md) for principles, constraints, and guidelines. Returns relevant sections.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'A question or keyword to search for',
        },
        return_full_content: {
          type: 'boolean',
          description: 'If true, returns the entire constitution',
          default: false,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'audit_security',
    description:
      'Run security audit tools (trivy for vulnerabilities, gitleaks for secrets). Returns JSON report with findings.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'speckit',
    description:
      'GitHub SpecKit workflow: constitution → specify → plan → tasks. Manages feature specs in .specify/ directory.',
    inputSchema: {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: ['constitution', 'specify', 'plan', 'tasks', 'list', 'status'],
          description: 'SpecKit workflow phase',
        },
        action: {
          type: 'string',
          enum: ['create', 'read', 'update'],
          description: 'Action to perform (not required for constitution/list/status)',
        },
        feature_name: {
          type: 'string',
          description: 'Feature name (required for specify/plan/tasks/status)',
        },
        content: {
          type: 'string',
          description: 'Markdown content (optional, uses template if not provided)',
        },
      },
      required: ['phase'],
    },
  },
  {
    name: 'context7',
    description:
      'Load context using core/sdk/context7.js. Returns project context based on task.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'object',
          description: 'Task object for context loading',
        },
      },
    },
  },
];

// Add Serena tool conditionally
if (serenaTool) {
  TOOLS.push(serenaTool);
}

// Create MCP server instance
const server = new Server(
  {
    name: 'coreeeeaaaa',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler: List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handler: Execute tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'run_task': {
        const { task_name } = args as { task_name: string };
        const result = await runTask(task_name);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'manage_spec': {
        const { action, feature_id, content } = args as {
          action: 'read' | 'create' | 'update' | 'list';
          feature_id?: string;
          content?: string;
        };

        const result = await manageSpec(action, feature_id, content);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'consult_constitution': {
        const { query, return_full_content } = args as {
          query: string;
          return_full_content?: boolean;
        };

        const result = await consultConstitution(query, return_full_content);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'audit_security': {
        const result = await auditSecurity();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'speckit': {
        const { phase, action, feature_name, content } = args as {
          phase: 'constitution' | 'specify' | 'plan' | 'tasks' | 'list' | 'status';
          action?: 'create' | 'read' | 'update';
          feature_name?: string;
          content?: string;
        };

        const result = await speckit(phase, action, feature_name, content);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'context7': {
        const { task } = args as { task?: any };
        const result = await loadContext(task);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'serena': {
        if (!serenaTool) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Serena tool is disabled. Set SERENA_ENABLED=true to enable.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const { action, name, content } = args as {
          action: 'config' | 'list' | 'read' | 'write' | 'delete' | 'search';
          name?: string;
          content?: string;
          query?: string;
        };

        const result = await serena(action, name, content, (args as any).query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Unknown tool: ${name}`,
                },
                null,
                2
              ),
            },
          ],
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error.message || 'Unknown error occurred',
            },
            null,
            2
          ),
        },
      ],
    };
  }
});

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('coreeeeaaaa MCP Server started');
  console.error('Available tools:', TOOLS.map((t) => t.name).join(', '));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
