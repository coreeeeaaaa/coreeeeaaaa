import { AutonomousAgent } from '@coreeeeaaaa/sdk/autonomous';
import chalk from 'chalk';

export async function autonomousCommand(options: any) {
  const provider = options.llm || process.env.COREEEEAAAA_LLM || 'ollama';
  console.log(chalk.blue(`Starting autonomous agent with provider: ${provider}`));

  const agent = new AutonomousAgent({
    projectId: 'cli-session', // In real app, read from config
    provider: provider,
    model: options.model,
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
