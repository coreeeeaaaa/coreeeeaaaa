# Advanced Workflow System

The Advanced Workflow System provides a sophisticated multi-agent development environment with cross-validation, iterative improvement, and comprehensive logging.

## Features

- **Multi-Agent Architecture**: Developer, Reviewer, and Tester agents work together
- **Cross-Validation**: Each agent validates the work of others
- **Iterative Improvement**: Automatic improvement cycles until quality thresholds are met
- **Comprehensive Logging**: Full audit trail of all actions
- **Configurable Workflows**: Customize behavior through config files

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Developer     │    │    Reviewer     │    │     Tester      │
│     Agent       │    │     Agent       │    │     Agent       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Workflow Manager      │
                    │  (Coordinates agents)   │
                    └─────────────────────────┘
```

## Usage

### CLI Commands

```bash
# Execute advanced workflow
coreeeeaaaa workflow --task-file .coreeeeaaaa/sample-tasks.json

# With custom config
coreeeeaaaa workflow --config .coreeeeaaaa/workflow.config.json --task-file tasks.json

# Specify LLM provider and model
coreeeeaaaa workflow --provider ollama --model llama2
```

### Programmatic Usage

```typescript
import { WorkflowManager, Task } from '@coreeeeaaaa/sdk';

const workflowConfig = {
  projectId: 'my-project',
  provider: 'ollama',
  model: 'llama2',
  maxIterations: 3
};

const tasks: Task[] = [
  {
    id: 'task-1',
    type: 'development',
    description: 'Implement feature X',
    context: { requirements: ['req1', 'req2'] },
    status: 'pending',
    assignedAgent: 'developer',
    createdAt: new Date().toISOString()
  }
];

const workflowManager = new WorkflowManager(workflowConfig);
const results = await workflowManager.executeWorkflow(tasks);
```

## Agent Roles

### Developer Agent
- Implements requested features
- Follows best practices for code quality
- Considers security and performance

### Reviewer Agent  
- Performs code quality reviews
- Identifies security vulnerabilities
- Suggests improvements

### Tester Agent
- Creates comprehensive test suites
- Identifies edge cases
- Validates functionality

## Validation Process

1. Agent completes assigned task
2. Other agents cross-validate the result
3. If validation fails, improvement iteration is triggered
4. Process repeats until quality threshold is met or max iterations reached

## Configuration

The system can be configured via JSON files:

```json
{
  "projectId": "my-project",
  "provider": "ollama",
  "model": "llama2", 
  "maxIterations": 5,
  "validation": {
    "approvalThreshold": 0.6,
    "minScore": 0.5
  }
}
```

## Audit Trail

All actions are logged with:
- Complete audit trail
- Timestamps and agents involved
- Validation results
- Iteration history

The system ensures full traceability of all development activities.