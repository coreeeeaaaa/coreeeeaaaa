import { Command } from 'commander';
import { CoreSDK, GateId } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export async function gateCommand(gateId: string, options: any) {
  const sdk = new CoreSDK({ rootDir: process.cwd() });
  
  console.log(chalk.blue(`Running Gate ${gateId}...`));
  
  let input = {};
  if (options.input) {
    try {
      const raw = await fs.readFile(options.input, 'utf8');
      input = JSON.parse(raw);
    } catch (err: any) {
      console.error(chalk.red(`Failed to read input file: ${err.message}`));
      process.exit(1);
    }
  }

  try {
    const result = await sdk.runGate(gateId as GateId, input, options.schema);
    
    if (result.ok) {
      console.log(chalk.green(`✔ Gate ${gateId} PASSED`));
      console.log(chalk.dim(`Hash: ${result.inputHash}`));
    } else {
      console.error(chalk.red(`✘ Gate ${gateId} FAILED`));
      if (result.errors) {
        result.errors.forEach((e: string) => console.error(chalk.yellow(`  - ${e}`)));
      }
      process.exit(1);
    }
  } catch (err: any) {
    console.error(chalk.red('System Error:'), err.message);
    process.exit(1);
  }
}
