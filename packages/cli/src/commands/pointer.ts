import { CoreSDK } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';

/**
 * Supports both signatures:
 *  - pointerCommand(options) where options.hash / options.ifMatch provided (CLI path)
 *  - pointerCommand(hash, { ifMatch }) for direct invocation (tests)
 */
export async function pointerCommand(
  hashOrOptions: string | { hash?: string; ifMatch?: string },
  maybeOptions?: { ifMatch?: string }
) {
  const sdk = new CoreSDK({ rootDir: process.cwd() });

  const hash = typeof hashOrOptions === 'string' ? hashOrOptions : hashOrOptions?.hash;
  const ifMatch =
    typeof hashOrOptions === 'string' ? maybeOptions?.ifMatch : hashOrOptions?.ifMatch;

  if (!hash) {
    console.error(chalk.red('Error: --hash is required'));
    process.exit(1);
  }

  console.log(chalk.blue(`Updating Pointer to ${hash}...`));
  if (ifMatch) {
    console.log(chalk.dim(`(CAS Mode: expecting ETag ${ifMatch})`));
  }

  try {
    await sdk.updatePointerCAS(hash, new Date().toISOString(), ifMatch);
    console.log(chalk.green(`✔ Pointer updated successfully.`));
  } catch (err: any) {
    console.error(chalk.red('Pointer update failed:'), err.message);
    process.exit(1);
  }
}
