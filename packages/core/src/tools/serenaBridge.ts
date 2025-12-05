/**
 * serenaBridge.ts
 * Bridge to .serena/ project memory
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface SerenaBridgeResult {
  success: boolean;
  data?: any;
  error?: string;
}

const SERENA_DIR = path.join(process.cwd(), '.serena');
const MEMORIES_DIR = path.join(SERENA_DIR, 'memories');

/**
 * Read Serena project config
 */
export async function readProjectConfig(): Promise<SerenaBridgeResult> {
  try {
    const configPath = path.join(SERENA_DIR, 'project.yml');
    const content = await fs.readFile(configPath, 'utf-8');

    // Simple YAML parse (or use yaml library)
    return {
      success: true,
      data: { content, path: configPath },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to read project config: ${error.message}`,
    };
  }
}

/**
 * List all memories
 */
export async function listMemories(): Promise<SerenaBridgeResult> {
  try {
    await fs.mkdir(MEMORIES_DIR, { recursive: true });
    const files = await fs.readdir(MEMORIES_DIR);
    const memories = files.filter(f => f.endsWith('.md'));

    return {
      success: true,
      data: { memories, count: memories.length },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to list memories: ${error.message}`,
    };
  }
}

/**
 * Read a specific memory
 */
export async function readMemory(name: string): Promise<SerenaBridgeResult> {
  try {
    const memoryPath = path.join(MEMORIES_DIR, `${name}.md`);
    const content = await fs.readFile(memoryPath, 'utf-8');

    return {
      success: true,
      data: { name, content, path: memoryPath },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to read memory '${name}': ${error.message}`,
    };
  }
}

/**
 * Write a memory
 */
export async function writeMemory(
  name: string,
  content: string
): Promise<SerenaBridgeResult> {
  try {
    await fs.mkdir(MEMORIES_DIR, { recursive: true });
    const memoryPath = path.join(MEMORIES_DIR, `${name}.md`);
    await fs.writeFile(memoryPath, content, 'utf-8');

    return {
      success: true,
      data: { name, path: memoryPath, message: `Memory '${name}' saved` },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to write memory '${name}': ${error.message}`,
    };
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(name: string): Promise<SerenaBridgeResult> {
  try {
    const memoryPath = path.join(MEMORIES_DIR, `${name}.md`);
    await fs.unlink(memoryPath);

    return {
      success: true,
      data: { name, message: `Memory '${name}' deleted` },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to delete memory '${name}': ${error.message}`,
    };
  }
}

/**
 * Main entry point for serena tool
 */
export async function serena(
  action: 'config' | 'list' | 'read' | 'write' | 'delete',
  name?: string,
  content?: string
): Promise<SerenaBridgeResult> {
  switch (action) {
    case 'config':
      return readProjectConfig();

    case 'list':
      return listMemories();

    case 'read':
      if (!name) {
        return { success: false, error: 'name is required for read' };
      }
      return readMemory(name);

    case 'write':
      if (!name || !content) {
        return { success: false, error: 'name and content are required for write' };
      }
      return writeMemory(name, content);

    case 'delete':
      if (!name) {
        return { success: false, error: 'name is required for delete' };
      }
      return deleteMemory(name);

    default:
      return {
        success: false,
        error: `Unknown action: ${action}. Valid: config, list, read, write, delete`,
      };
  }
}
