#!/usr/bin/env node
import { Command } from 'commander';
import { CoreSDK } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';
import { workflowCommand } from './commands/workflow.js';
import { autonomousCommand } from './commands/autonomous.js';
import { authCommand } from './commands/auth.js';

const program = new Command();
const sdk = new CoreSDK();

program
  .name('coreeeeaaaa')
  .description('Core-Hypervisor CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize the core environment')
  .action(async () => {
    console.log(chalk.blue('Initializing coreeeeaaaa environment...'));
    await sdk.init();
    console.log(chalk.green('Setup complete!'));
  });

// 여기가 아까 없어서 에러 난 부분입니다. 이제 추가합니다!
program
  .command('log')
  .description('Log a message to the UEM Ledger')
  .option('-t, --text <text>', 'Text content to log')
  .action(async (options) => {
    if (!options.text) {
      console.error(chalk.red('Error: --text is required'));
      process.exit(1);
    }
    console.log(chalk.yellow('Logging to Ledger...'));
    // SDK를 통해 Rust 엔진으로 데이터를 보냅니다.
    await sdk.logLineage('CLI_Manual_Log', { text: options.text });
    console.log(chalk.green('Log committed via Rust Engine!'));
  });

// Add the new workflow command
program
  .command('workflow')
  .description('Execute advanced workflow with multiple agents')
  .option('-c, --config <path>', 'Path to workflow config file')
  .option('-t, --task-file <path>', 'Path to task definition file')
  .option('--provider <provider>', 'LLM provider (ollama, claude-cli, etc.)')
  .option('--model <model>', 'Specific model to use')
  .option('--max-iterations <n>', 'Maximum iterations for improvement loops', parseInt)
  .action(workflowCommand);

// Add gate command
program
  .command('gate <gateId>')
  .description('Run a gate validation')
  .option('-i, --input <path>', 'Input file path (JSON)')
  .option('-s, --schema <path>', 'JSON Schema file path')
  .option('-o, --out <path>', 'Output directory for results')
  .action((gateId, options) => {
    import('./commands/gate.js').then(({ gateCommand }) => {
      gateCommand(gateId, options).catch(err => {
        console.error(err.message);
        process.exit(1);
      });
    });
  });

// Add evidence command
program
  .command('evidence <file>')
  .description('Append evidence to the ledger')
  .option('-t, --type <type>', 'Evidence type')
  .option('-k, --kind <kind>', 'Evidence kind')
  .action((file, options) => {
    import('./commands/evidence.js').then(({ evidenceCommand }) => {
      evidenceCommand(file, options).catch(err => {
        console.error(err.message);
        process.exit(1);
      });
    });
  });

// Add pointer command
program
  .command('pointer')
  .description('Update the global pointer')
  .option('-h, --hash <hash>', 'Content hash')
  .option('-t, --snapshot <timestamp>', 'Snapshot timestamp')
  .option('--if-match <etag>', 'CAS ETag check')
  .action((options) => {
    import('./commands/pointer.js').then(({ pointerCommand }) => {
      pointerCommand(options).catch(err => {
        console.error(err.message);
        process.exit(1);
      });
    });
  });

// Add the autonomous command
program
  .command('autonomous')
  .description('Run autonomous agent loop')
  .option('--llm <provider>', 'LLM provider to use')
  .option('--model <model>', 'Specific model to use')
  .action(autonomousCommand);

// Add the auth command
program
  .command('auth')
  .description('Manage cloud storage authentication (secure local encryption)')
  .action(() => {
    authCommand.parse(process.argv);
  });

program.parse();
