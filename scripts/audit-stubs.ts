import * as fs from 'fs/promises';
import * as path from 'path';

const STUB_PATTERNS = ['TODO', 'FIXME', 'placeholder', 'NotImplemented'];

async function getFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', 'dist'].includes(entry.name)) {
      files.push(...await getFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|js|tsx|jsx|md)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function auditStubs(): Promise<boolean> {
  const files = await getFiles('.');
  let hasStubs = false;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    for (const pattern of STUB_PATTERNS) {
      if (content.includes(pattern)) {
        console.error(`Stub found in ${file}: ${pattern}`);
        hasStubs = true;
      }
    }
  }

  return hasStubs;
}

if (require.main === module) {
  auditStubs().then(hasStubs => {
    if (hasStubs) {
      console.error('Audit failed: Stubs found in codebase.');
      process.exit(1);
    } else {
      console.log('Audit passed: No stubs found.');
    }
  });
}