import { CoreSDK } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export interface WorkflowCommandOptions {
  config?: string;
  taskFile?: string;
  gateId?: string;
  action?: string;
}

export async function workflowCommand(options: WorkflowCommandOptions) {
  console.log(chalk.blue('Executing workflow command...'));
  
  const sdk = new CoreSDK({ rootDir: process.cwd() });
  
  // Based on the action provided, execute different workflow commands
  if (options.action === 'init') {
    console.log(chalk.cyan('Initializing workflow environment...'));
    await sdk.init();
    console.log(chalk.green('Workflow environment initialized!'));
  } 
  else if (options.action === 'run-gate' && options.gateId) {
    console.log(chalk.cyan(`Running gate: ${options.gateId}`));
    // Load input from file if provided
    let input = {};
    if (options.taskFile) {
      try {
        const inputContent = await fs.readFile(options.taskFile, 'utf8');
        input = JSON.parse(inputContent);
      } catch (err: any) {
        console.error(chalk.red(`Failed to read input file: ${err.message}`));
        process.exit(1);
      }
    }
    
    try {
      const result = await sdk.runGate(options.gateId as any, input);
      if (result.ok) {
        console.log(chalk.green(`Gate ${options.gateId} PASSED`));
      } else {
        console.log(chalk.red(`Gate ${options.gateId} FAILED`));
        console.log(chalk.yellow(`Errors: ${result.errors?.join(', ')}`));
        process.exit(1);
      }
    } catch (err: any) {
      console.error(chalk.red(`Gate execution failed: ${err.message}`));
      process.exit(1);
    }
  } 
  else {
    console.log(chalk.yellow('Available actions: init, run-gate'));
    console.log(chalk.yellow('Example: coreeeeaaaa workflow --action init'));
    console.log(chalk.yellow('Example: coreeeeaaaa workflow --action run-gate --gateId G1 --taskFile input.json'));
    process.exit(1);
  }
}