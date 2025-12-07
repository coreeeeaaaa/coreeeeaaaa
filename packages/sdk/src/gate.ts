import { CoreSDK } from './index.js';
import { GateId, GateInput, GateResult } from './types.js';

export async function runGate(sdk: CoreSDK, gateId: GateId, input: GateInput, schemaPath?: string): Promise<GateResult> {
  return await sdk.runGate(gateId, input, schemaPath);
}

export async function listGates(): Promise<GateId[]> {
  // Return the list of available gate IDs
  return ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'];
}