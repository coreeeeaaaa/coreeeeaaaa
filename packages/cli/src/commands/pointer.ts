import { CoreSDK } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';

export async function pointerCommand(hash: string, options: any) {
  const sdk = new CoreSDK({ rootDir: process.cwd() });
  
  console.log(chalk.blue(`Updating Pointer to ${hash}...`));
  if (options.ifMatch) {
      console.log(chalk.dim(`(CAS Mode: expecting ETag ${options.ifMatch})`));
  }

  try {
    await sdk.updatePointerCAS(hash, new Date().toISOString(), options.ifMatch);
    console.log(chalk.green(`✔ Pointer updated successfully.`));
  } catch (err: any) {
    console.error(chalk.red('Pointer update failed:'), err.message);
    process.exit(1);
  }
}
