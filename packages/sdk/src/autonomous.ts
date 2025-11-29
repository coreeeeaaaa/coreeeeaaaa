import { CoreSDK } from './index.js';
import { LLMAdapter, LLMProvider } from './llm-adapter.js';

export class AutonomousAgent {
  private sdk: CoreSDK;
  private llm: LLMAdapter;

  constructor(config: { 
    projectId: string; 
    provider: LLMProvider; 
    model?: string; 
    rootDir?: string 
  }) {
    this.sdk = new CoreSDK({
      projectId: config.projectId,
      rootDir: config.rootDir
    });
    
    this.llm = new LLMAdapter({
      provider: config.provider,
      model: config.model
    });
  }

  async startLoop(context: any = {}): Promise<void> {
    await this.sdk.init();
    
    await this.sdk.logLineage('agent_start', { 
      provider: (this.llm as any).provider, 
      timestamp: new Date().toISOString() 
    });

    // Construct prompt from context
    const prompt = `
      You are an autonomous agent for project: ${context.projectId || 'unknown'}.
      Current Context: ${JSON.stringify(context)}
      
      Please analyze the current state and suggest the next action.
    `;

    try {
      const response = await this.llm.prompt(prompt);
      
      // Log the interaction
      await this.sdk.appendEvidence({
        type: 'log',
        path: 'agent_interaction.log',
        content: `PROMPT:\n${prompt}\n\nRESPONSE:\n${response}`,
        meta: { provider: (this.llm as any).provider }
      });

      console.log('LLM Response:', response);
    } catch (error: any) {
      console.error('Agent Error:', error.message);
      throw error;
    }
  }
}
