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
const CORE_MEMORY_DIR = path.join(process.cwd(), '.coreeeeaaaa', 'memory');

interface MemoryDoc {
  name: string;
  path: string;
  content: string;
  source: 'serena' | 'core';
  tokens?: string[];
}

interface MemorySearchResult {
  name: string;
  path: string;
  source: 'serena' | 'core';
  score: number;
  snippet: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

async function readDirIfExists(dir: string): Promise<string[]> {
  try {
    await fs.mkdir(dir, { recursive: true });
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function loadAllMemories(): Promise<MemoryDoc[]> {
  const docs: MemoryDoc[] = [];

  const serenaFiles = await readDirIfExists(MEMORIES_DIR);
  for (const file of serenaFiles.filter((f) => f.endsWith('.md'))) {
    const filePath = path.join(MEMORIES_DIR, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      docs.push({
        name: path.basename(file, '.md'),
        path: filePath,
        content,
        source: 'serena',
      });
    } catch {
      // ignore read errors for individual files
    }
  }

  const coreFiles = await readDirIfExists(CORE_MEMORY_DIR);
  for (const file of coreFiles.filter((f) => f.endsWith('.md'))) {
    const filePath = path.join(CORE_MEMORY_DIR, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      docs.push({
        name: path.basename(file, '.md'),
        path: filePath,
        content,
        source: 'core',
      });
    } catch {
      // ignore read errors
    }
  }

  return docs;
}

function buildTfIdfScores(docs: MemoryDoc[], query: string): MemorySearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const docTokens: MemoryDoc[] = docs.map((doc) => ({
    ...doc,
    tokens: doc.tokens ?? tokenize(doc.content),
  }));

  const df = new Map<string, number>();
  for (const doc of docTokens) {
    const unique = new Set(doc.tokens);
    for (const tok of unique) {
      df.set(tok, (df.get(tok) || 0) + 1);
    }
  }

  const N = docTokens.length || 1;
  const qCounts = new Map<string, number>();
  queryTokens.forEach((t) => qCounts.set(t, (qCounts.get(t) || 0) + 1));

  const qVector = new Map<string, number>();
  for (const [tok, count] of qCounts.entries()) {
    const idf = Math.log(1 + N / (1 + (df.get(tok) || 0)));
    qVector.set(tok, (count / queryTokens.length) * idf);
  }

  const results: MemorySearchResult[] = [];

  for (const doc of docTokens) {
    if (!doc.tokens || doc.tokens.length === 0) continue;
    const tf = new Map<string, number>();
    for (const tok of doc.tokens) {
      tf.set(tok, (tf.get(tok) || 0) + 1);
    }

    const docVector = new Map<string, number>();
    for (const [tok, count] of tf.entries()) {
      const idf = Math.log(1 + N / (1 + (df.get(tok) || 0)));
      docVector.set(tok, (count / doc.tokens.length) * idf);
    }

    // cosine similarity over sparse maps
    let dot = 0;
    let docNorm = 0;
    let qNorm = 0;

    for (const val of docVector.values()) {
      docNorm += val * val;
    }
    for (const val of qVector.values()) {
      qNorm += val * val;
    }
    const normDen = Math.sqrt(docNorm) * Math.sqrt(qNorm || 1);
    for (const [tok, qVal] of qVector.entries()) {
      const dVal = docVector.get(tok) || 0;
      dot += qVal * dVal;
    }
    const score = normDen === 0 ? 0 : dot / normDen;

    const lower = doc.content.toLowerCase();
    let idx = -1;
    for (const tok of queryTokens) {
      idx = lower.indexOf(tok);
      if (idx >= 0) break;
    }
    const start = Math.max(0, idx >= 0 ? idx - 50 : 0);
    const end = Math.min(doc.content.length, idx >= 0 ? idx + 200 : 200);
    const snippet = doc.content.slice(start, end).replace(/\s+/g, ' ').trim();

    results.push({
      name: doc.name,
      path: doc.path,
      source: doc.source,
      score,
      snippet,
    });
  }

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export async function searchMemories(query: string): Promise<SerenaBridgeResult> {
  if (!query || typeof query !== 'string') {
    return { success: false, error: 'query is required for search' };
  }

  const docs = await loadAllMemories();
  if (docs.length === 0) {
    return { success: true, data: { results: [], note: 'no memory files found' } };
  }

  const results = buildTfIdfScores(docs, query);
  return {
    success: true,
    data: { results },
  };
}

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
  action: 'config' | 'list' | 'read' | 'write' | 'delete' | 'search',
  name?: string,
  content?: string,
  query?: string
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

    case 'search':
      return searchMemories(query || '');

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
