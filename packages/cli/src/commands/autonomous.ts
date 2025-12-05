import { AutonomousAgent } from '@coreeeeaaaa/sdk';
import chalk from 'chalk';

export async function autonomousCommand(options: any) {
  console.log(chalk.blue('Starting autonomous agent...'));

  const agent = new AutonomousAgent({
    projectId: 'cli-session', // In real app, read from config
    rootDir: process.cwd()
  });

  try {
    await agent.startLoop({
      source: 'cli',
      time: new Date().toISOString()
    });
    console.log(chalk.green('Agent loop finished.'));
  } catch (err: any) {
    console.error(chalk.red('Agent failed:'), err.message);
    process.exit(1);
  }
}
