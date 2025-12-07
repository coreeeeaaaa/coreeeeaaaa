import { Command } from 'commander';
import { CoreSDK } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export async function initCommand(options: any) {
  console.log(chalk.blue('Initializing coreeeeaaaa environment...'));
  
  const sdk = new CoreSDK({
    rootDir: process.cwd()
  });

  try {
    await sdk.init();
    console.log(chalk.green('✔ Artifact directories created.'));

    // Check for config
    const configPath = path.join(process.cwd(), '.coreeeeaaaa', 'config.json');
    try {
      await fs.stat(configPath);
      console.log(chalk.green('✔ Config file exists.'));
    } catch {
      console.log(chalk.yellow('⚠ Config file missing. creating default...'));
      const defaultConfig = {
        projectId: "my-project",
        budget: { limit: 1000, currency: "USD" }
      };
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green('✔ Created default config at .coreeeeaaaa/config.json'));
    }

    console.log(chalk.bold('\nSetup complete!'));
    console.log(`Run ${chalk.cyan('coreeeeaaaa gate run G0')} to start.`);
  } catch (err: any) {
    console.error(chalk.red('Init failed:'), err.message);
    process.exit(1);
  }
}
