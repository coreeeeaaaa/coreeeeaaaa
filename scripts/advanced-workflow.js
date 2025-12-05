#!/usr/bin/env node
/**
 * Advanced Workflow Script for CoreEEEAAAA
 * 
 * This script executes a complete development workflow with multiple agents,
 * cross-validation, iterative improvement, and comprehensive logging.
 * 
 * Usage:
 *   node advanced-workflow.js [options]
 * 
 * Options:
 *   --provider [ollama|claude-cli|gemini-cli|aider]  LLM provider to use
 *   --model <model-name>                            Specific model to use
 *   --config <config-file>                          Path to config file
 *   --tasks <tasks-file>                            Path to tasks definition file
 *   --max-iterations <n>                            Maximum improvement iterations
 */

import { WorkflowManager, Task } from '@coreeeeaaaa/sdk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Parse command line arguments
const args = process.argv.slice(2);
const config = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider' && args[i + 1]) {
    config.provider = args[i + 1];
    i++;
  } else if (args[i] === '--model' && args[i + 1]) {
    config.model = args[i + 1];
    i++;
  } else if (args[i] === '--config' && args[i + 1]) {
    config.configFile = args[i + 1];
    i++;
  } else if (args[i] === '--tasks' && args[i + 1]) {
    config.tasksFile = args[i + 1];
    i++;
  } else if (args[i] === '--max-iterations' && args[i + 1]) {
    config.maxIterations = parseInt(args[i + 1]);
    i++;
  }
}

// Default configuration
const workflowConfig = {
  projectId: process.env.COREEEEAAAA_PROJECT_ID || 'advanced-workflow-demo',
  provider: config.provider || process.env.COREEEEAAAA_LLM || 'ollama',
  model: config.model || 'default',
  rootDir: process.cwd(),
  maxIterations: config.maxIterations || 3
};

console.log('🚀 Initializing Advanced Workflow System...');
console.log('Configuration:', JSON.stringify(workflowConfig, null, 2));

// Default tasks if no file is provided
let tasks: Task[] = [
  {
    id: 'WF001-dev',
    type: 'development',
    description: 'Implement user authentication module with login, logout, and session management',
    context: {
      requirements: [
        'User login with username/password',
        'Password hashing and verification',
        'Session management',
        'JWT token generation',
        'Input validation and sanitization'
      ],
      tech_stack: ['TypeScript', 'Node.js', 'Express', 'JWT'],
      security_considerations: ['SQL injection prevention', 'XSS protection', 'rate limiting']
    },
    status: 'pending',
    assignedAgent: 'developer',
    createdAt: new Date().toISOString()
  },
  {
    id: 'WF002-review',
    type: 'review',
    description: 'Perform security and code quality review on authentication module',
    context: {
      target_module: 'user authentication',
      review_criteria: [
        'Security vulnerabilities',
        'Code quality',
        'Performance implications',
        'Maintainability',
        'Best practices adherence'
      ]
    },
    status: 'pending',
    assignedAgent: 'reviewer',
    createdAt: new Date().toISOString()
  },
  {
    id: 'WF003-test',
    type: 'testing',
    description: 'Create comprehensive tests for authentication module',
    context: {
      target_module: 'user authentication',
      test_types: [
        'Unit tests for individual functions',
        'Integration tests for API endpoints',
        'Security tests for vulnerabilities',
        'Performance tests for scalability',
        'Edge case testing'
      ]
    },
    status: 'pending',
    assignedAgent: 'tester',
    createdAt: new Date().toISOString()
  }
];

// Load tasks from file if provided
if (config.tasksFile) {
  try {
    const tasksFileContent = readFileSync(config.tasksFile, 'utf8');
    tasks = JSON.parse(tasksFileContent);
    console.log(`📋 Loaded ${tasks.length} tasks from ${config.tasksFile}`);
  } catch (error) {
    console.error(`❌ Error loading tasks from ${config.tasksFile}:`, error.message);
    process.exit(1);
  }
} else {
  console.log(`📋 Using ${tasks.length} default tasks for demonstration`);
}

// Create and execute workflow
const workflowManager = new WorkflowManager(workflowConfig);

console.log('\n🤖 Starting multi-agent workflow execution...');
console.log(`   Provider: ${workflowConfig.provider}`);
console.log(`   Model: ${workflowConfig.model}`);
console.log(`   Max Iterations: ${workflowConfig.maxIterations}`);
console.log(`   Tasks to process: ${tasks.length}`);

try {
  const startTime = Date.now();
  const results = await workflowManager.executeWorkflow(tasks);
  const duration = Date.now() - startTime;
  
  console.log(`\n✅ Workflow completed in ${duration}ms`);
  console.log(`📊 Results summary:`);
  console.log(`   - Total tasks: ${tasks.length}`);
  console.log(`   - Successful: ${results.filter(r => r.validation?.isValid).length}`);
  console.log(`   - Failed: ${results.filter(r => !r.validation?.isValid).length}`);
  
  // Check for any failures
  const failedResults = results.filter(r => !r.validation?.isValid);
  if (failedResults.length > 0) {
    console.log(`\n⚠️  Some tasks did not pass validation:`);
    failedResults.forEach(r => {
      console.log(`   - Task ${r.task.id}: ${r.validation?.feedback}`);
    });
    process.exit(1); // Exit with error if any tasks failed
  } else {
    console.log(`\n🎉 All tasks completed successfully with validation!`);
    process.exit(0);
  }
} catch (error) {
  console.error('💥 Workflow execution failed:', error);
  process.exit(1);
}