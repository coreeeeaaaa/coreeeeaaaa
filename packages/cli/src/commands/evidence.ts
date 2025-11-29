import { CoreSDK } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';
import { glob } from 'glob';
import path from 'path';

export async function evidenceCommand(patterns: string[], options: any) {
  const sdk = new CoreSDK({ rootDir: process.cwd() });
  
  console.log(chalk.blue(`Collecting evidence matching: ${patterns.join(', ')}`));

  try {
    const files = patterns;

    for (const file of files) {
        await sdk.appendEvidence({
            type: 'artifact',
            path: file
        });
        console.log(chalk.dim(`  - Added ${file}`));
    }
    
    console.log(chalk.green(`✔ Evidence collected.`));

  } catch (err: any) {
    console.error(chalk.red('Evidence collection failed:'), err.message);
    process.exit(1);
  }
}
