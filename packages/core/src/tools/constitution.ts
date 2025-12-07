/**
 * constitution.ts
 * Consults the project constitution (.coreeeeaaaa/memory/constitution.md)
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface ConstitutionResult {
  success: boolean;
  data?: {
    relevantSections: string[];
    fullContent?: string;
  };
  error?: string;
}

const CONSTITUTION_PATH = path.join(
  process.cwd(),
  '.coreeeeaaaa',
  'memory',
  'constitution.md'
);

/**
 * Reads the constitution file
 */
async function readConstitution(): Promise<string> {
  try {
    return await fs.readFile(CONSTITUTION_PATH, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to read constitution: ${error.message}`);
  }
}

/**
 * Extracts relevant sections from the constitution based on a query
 * @param content - The full constitution content
 * @param query - The search query
 */
function extractRelevantSections(content: string, query: string): string[] {
  const sections: string[] = [];
  const lines = content.split('\n');
  const queryLower = query.toLowerCase();

  let currentSection = '';
  let isRelevant = false;

  for (const line of lines) {
    // Check if it's a section header
    if (line.startsWith('#')) {
      // Save previous section if it was relevant
      if (isRelevant && currentSection) {
        sections.push(currentSection.trim());
      }

      // Start new section
      currentSection = line + '\n';
      isRelevant = line.toLowerCase().includes(queryLower);
    } else {
      // Add line to current section
      currentSection += line + '\n';

      // Check if this line makes the section relevant
      if (!isRelevant && line.toLowerCase().includes(queryLower)) {
        isRelevant = true;
      }
    }
  }

  // Add last section if relevant
  if (isRelevant && currentSection) {
    sections.push(currentSection.trim());
  }

  return sections;
}

/**
 * Consults the project constitution for guidance
 * @param query - A question or keyword to search for in the constitution
 * @param returnFullContent - If true, returns the entire constitution
 */
export async function consultConstitution(
  query: string,
  returnFullContent = false
): Promise<ConstitutionResult> {
  try {
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'Query is required and must be a string',
      };
    }

    const content = await readConstitution();

    if (returnFullContent) {
      return {
        success: true,
        data: {
          relevantSections: [],
          fullContent: content,
        },
      };
    }

    const relevantSections = extractRelevantSections(content, query);

    if (relevantSections.length === 0) {
      return {
        success: true,
        data: {
          relevantSections: [
            `No specific sections found for query: "${query}"\n\nConsider reviewing the full constitution or rephrasing your query.`,
          ],
        },
      };
    }

    return {
      success: true,
      data: {
        relevantSections,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
