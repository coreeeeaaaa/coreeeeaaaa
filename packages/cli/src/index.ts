#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { gateCommand } from './commands/gate.js';
import { evidenceCommand } from './commands/evidence.js';
import { pointerCommand } from './commands/pointer.js';
import { autonomousCommand } from './commands/autonomous.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

const program = new Command();

program
  .name('coreeeeaaaa')
  .description('Universal development automation CLI')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize the coreeeeaaaa environment in the current directory')
  .action(initCommand);

program
  .command('gate')
  .description('Run a gate validation')
  .argument('<gateId>', 'Gate ID (e.g., G0, G4)')
  .option('-i, --input <path>', 'Path to input JSON file')
  .option('-s, --schema <path>', 'Path to JSON schema for validation')
  .action(gateCommand);

program
  .command('evidence')
  .description('Collect evidence')
  .argument('<files...>', 'Files to collect as evidence')
  .action(evidenceCommand);

program
  .command('pointer')
  .description('Update the project pointer (CAS)')
  .argument('<hash>', 'New canon/blueprint hash')
  .option('--if-match <etag>', 'Optimistic locking ETag')
  .action(pointerCommand);

program
  .command('autonomous')
  .description('Start autonomous agent loop')
  .option('--llm <provider>', 'LLM provider (ollama, claude-cli, etc.)')
  .option('--model <model>', 'Model name (optional)')
  .action(autonomousCommand);

program.parse();