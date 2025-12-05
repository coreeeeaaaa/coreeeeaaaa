/**
 * specBridge.ts
 * Manages SpecKit-compatible feature specifications in .coreeeeaaaa/specs/
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface SpecBridgeResult {
  success: boolean;
  data?: any;
  error?: string;
}

const SPECS_DIR = path.join(process.cwd(), '.coreeeeaaaa', 'specs');

/**
 * Ensures the specs directory exists
 */
async function ensureSpecsDir(): Promise<void> {
  try {
    await fs.mkdir(SPECS_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }
}

/**
 * Reads a feature specification
 * @param featureId - The ID/name of the feature spec
 */
export async function readSpec(featureId: string): Promise<SpecBridgeResult> {
  try {
    const specPath = path.join(SPECS_DIR, `${featureId}.md`);
    const content = await fs.readFile(specPath, 'utf-8');

    return {
      success: true,
      data: {
        featureId,
        content,
        path: specPath,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to read spec '${featureId}': ${error.message}`,
    };
  }
}

/**
 * Creates a new feature specification
 * @param featureId - The ID/name of the feature spec
 * @param content - The markdown content of the spec
 */
export async function createSpec(
  featureId: string,
  content: string
): Promise<SpecBridgeResult> {
  try {
    await ensureSpecsDir();
    const specPath = path.join(SPECS_DIR, `${featureId}.md`);

    // Check if spec already exists
    try {
      await fs.access(specPath);
      return {
        success: false,
        error: `Spec '${featureId}' already exists. Use 'update' action instead.`,
      };
    } catch {
      // File doesn't exist, proceed with creation
    }

    await fs.writeFile(specPath, content, 'utf-8');

    return {
      success: true,
      data: {
        featureId,
        path: specPath,
        message: `Spec '${featureId}' created successfully`,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to create spec '${featureId}': ${error.message}`,
    };
  }
}

/**
 * Updates an existing feature specification
 * @param featureId - The ID/name of the feature spec
 * @param content - The new markdown content
 */
export async function updateSpec(
  featureId: string,
  content: string
): Promise<SpecBridgeResult> {
  try {
    const specPath = path.join(SPECS_DIR, `${featureId}.md`);

    // Check if spec exists
    try {
      await fs.access(specPath);
    } catch {
      return {
        success: false,
        error: `Spec '${featureId}' does not exist. Use 'create' action instead.`,
      };
    }

    await fs.writeFile(specPath, content, 'utf-8');

    return {
      success: true,
      data: {
        featureId,
        path: specPath,
        message: `Spec '${featureId}' updated successfully`,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to update spec '${featureId}': ${error.message}`,
    };
  }
}

/**
 * Lists all available specs
 */
export async function listSpecs(): Promise<SpecBridgeResult> {
  try {
    await ensureSpecsDir();
    const files = await fs.readdir(SPECS_DIR);
    const specs = files
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''));

    return {
      success: true,
      data: {
        specs,
        count: specs.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to list specs: ${error.message}`,
    };
  }
}

/**
 * Main entry point for manage_spec tool
 * @param action - 'read' | 'create' | 'update' | 'list'
 * @param featureId - The feature ID (optional for 'list')
 * @param content - The spec content (required for 'create' and 'update')
 */
export async function manageSpec(
  action: 'read' | 'create' | 'update' | 'list',
  featureId?: string,
  content?: string
): Promise<SpecBridgeResult> {
  switch (action) {
    case 'read':
      if (!featureId) {
        return { success: false, error: 'featureId is required for read action' };
      }
      return readSpec(featureId);

    case 'create':
      if (!featureId || !content) {
        return {
          success: false,
          error: 'featureId and content are required for create action',
        };
      }
      return createSpec(featureId, content);

    case 'update':
      if (!featureId || !content) {
        return {
          success: false,
          error: 'featureId and content are required for update action',
        };
      }
      return updateSpec(featureId, content);

    case 'list':
      return listSpecs();

    default:
      return {
        success: false,
        error: `Unknown action: ${action}. Valid actions: read, create, update, list`,
      };
  }
}
