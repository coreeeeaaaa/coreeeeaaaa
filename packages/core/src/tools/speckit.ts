/**
 * speckit.ts
 * GitHub SpecKit workflow integration
 * Supports: constitution → specify → plan → tasks → implement
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface SpecKitResult {
  success: boolean;
  data?: any;
  error?: string;
}

const SPECIFY_DIR = path.join(process.cwd(), '.specify');
const SPECS_DIR = path.join(SPECIFY_DIR, 'specs');
const TEMPLATES_DIR = path.join(SPECIFY_DIR, 'templates');
const MEMORY_DIR = path.join(SPECIFY_DIR, 'memory');

/**
 * Ensures SpecKit directory structure exists
 */
async function ensureSpecKitDirs(): Promise<void> {
  await fs.mkdir(SPECS_DIR, { recursive: true });
  await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

/**
 * Phase 1: Read constitution
 */
export async function readConstitution(): Promise<SpecKitResult> {
  try {
    const constitutionPath = path.join(MEMORY_DIR, 'constitution.md');
    const content = await fs.readFile(constitutionPath, 'utf-8');

    return {
      success: true,
      data: { content, path: constitutionPath }
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Constitution not found. Create it first: ${error.message}`
    };
  }
}

/**
 * Phase 2: Create/Read specification
 */
export async function specify(
  action: 'create' | 'read',
  featureName: string,
  content?: string
): Promise<SpecKitResult> {
  try {
    await ensureSpecKitDirs();

    const featureDir = path.join(SPECS_DIR, featureName);
    const specPath = path.join(featureDir, 'spec.md');

    if (action === 'create') {
      if (!content) {
        // Load template
        const templatePath = path.join(TEMPLATES_DIR, 'spec-template.md');
        try {
          content = await fs.readFile(templatePath, 'utf-8');
        } catch {
          return {
            success: false,
            error: 'spec-template.md not found in .specify/templates/'
          };
        }
      }

      await fs.mkdir(featureDir, { recursive: true });
      await fs.writeFile(specPath, content, 'utf-8');

      return {
        success: true,
        data: {
          phase: 'specify',
          featureName,
          path: specPath,
          message: `Created spec for ${featureName}`
        }
      };
    }

    if (action === 'read') {
      const content = await fs.readFile(specPath, 'utf-8');
      return {
        success: true,
        data: { phase: 'specify', featureName, content, path: specPath }
      };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error: any) {
    return {
      success: false,
      error: `Specify failed: ${error.message}`
    };
  }
}

/**
 * Phase 3: Create/Read implementation plan
 */
export async function plan(
  action: 'create' | 'read',
  featureName: string,
  content?: string
): Promise<SpecKitResult> {
  try {
    await ensureSpecKitDirs();

    const featureDir = path.join(SPECS_DIR, featureName);
    const planPath = path.join(featureDir, 'plan.md');

    if (action === 'create') {
      if (!content) {
        const templatePath = path.join(TEMPLATES_DIR, 'plan-template.md');
        try {
          content = await fs.readFile(templatePath, 'utf-8');
        } catch {
          return {
            success: false,
            error: 'plan-template.md not found in .specify/templates/'
          };
        }
      }

      await fs.mkdir(featureDir, { recursive: true });
      await fs.writeFile(planPath, content, 'utf-8');

      return {
        success: true,
        data: {
          phase: 'plan',
          featureName,
          path: planPath,
          message: `Created plan for ${featureName}`
        }
      };
    }

    if (action === 'read') {
      const content = await fs.readFile(planPath, 'utf-8');
      return {
        success: true,
        data: { phase: 'plan', featureName, content, path: planPath }
      };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error: any) {
    return {
      success: false,
      error: `Plan failed: ${error.message}`
    };
  }
}

/**
 * Phase 4: Create/Read task breakdown
 */
export async function tasks(
  action: 'create' | 'read' | 'update',
  featureName: string,
  content?: string
): Promise<SpecKitResult> {
  try {
    await ensureSpecKitDirs();

    const featureDir = path.join(SPECS_DIR, featureName);
    const tasksPath = path.join(featureDir, 'tasks.md');

    if (action === 'create') {
      if (!content) {
        const templatePath = path.join(TEMPLATES_DIR, 'tasks-template.md');
        try {
          content = await fs.readFile(templatePath, 'utf-8');
        } catch {
          return {
            success: false,
            error: 'tasks-template.md not found in .specify/templates/'
          };
        }
      }

      await fs.mkdir(featureDir, { recursive: true });
      await fs.writeFile(tasksPath, content, 'utf-8');

      return {
        success: true,
        data: {
          phase: 'tasks',
          featureName,
          path: tasksPath,
          message: `Created tasks for ${featureName}`
        }
      };
    }

    if (action === 'update') {
      if (!content) {
        return { success: false, error: 'Content required for update' };
      }
      await fs.writeFile(tasksPath, content, 'utf-8');
      return {
        success: true,
        data: {
          phase: 'tasks',
          featureName,
          path: tasksPath,
          message: `Updated tasks for ${featureName}`
        }
      };
    }

    if (action === 'read') {
      const content = await fs.readFile(tasksPath, 'utf-8');
      return {
        success: true,
        data: { phase: 'tasks', featureName, content, path: tasksPath }
      };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error: any) {
    return {
      success: false,
      error: `Tasks failed: ${error.message}`
    };
  }
}

/**
 * List all features in .specify/specs/
 */
export async function listFeatures(): Promise<SpecKitResult> {
  try {
    await ensureSpecKitDirs();

    const entries = await fs.readdir(SPECS_DIR, { withFileTypes: true });
    const features = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);

    return {
      success: true,
      data: { features, count: features.length }
    };
  } catch (error: any) {
    return {
      success: false,
      error: `List features failed: ${error.message}`
    };
  }
}

/**
 * Get feature status (which phases are complete)
 */
export async function getFeatureStatus(featureName: string): Promise<SpecKitResult> {
  try {
    const featureDir = path.join(SPECS_DIR, featureName);

    const hasSpec = await fs.access(path.join(featureDir, 'spec.md'))
      .then(() => true)
      .catch(() => false);

    const hasPlan = await fs.access(path.join(featureDir, 'plan.md'))
      .then(() => true)
      .catch(() => false);

    const hasTasks = await fs.access(path.join(featureDir, 'tasks.md'))
      .then(() => true)
      .catch(() => false);

    return {
      success: true,
      data: {
        featureName,
        phases: {
          constitution: true, // Always present
          specify: hasSpec,
          plan: hasPlan,
          tasks: hasTasks
        }
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Status check failed: ${error.message}`
    };
  }
}

/**
 * Main entry point for speckit tool
 */
export async function speckit(
  phase: 'constitution' | 'specify' | 'plan' | 'tasks' | 'list' | 'status',
  action?: 'create' | 'read' | 'update',
  featureName?: string,
  content?: string
): Promise<SpecKitResult> {
  switch (phase) {
    case 'constitution':
      return readConstitution();

    case 'specify':
      if (!action || !featureName) {
        return { success: false, error: 'action and featureName required' };
      }
      return specify(action as 'create' | 'read', featureName, content);

    case 'plan':
      if (!action || !featureName) {
        return { success: false, error: 'action and featureName required' };
      }
      return plan(action as 'create' | 'read', featureName, content);

    case 'tasks':
      if (!action || !featureName) {
        return { success: false, error: 'action and featureName required' };
      }
      return tasks(action as 'create' | 'read' | 'update', featureName, content);

    case 'list':
      return listFeatures();

    case 'status':
      if (!featureName) {
        return { success: false, error: 'featureName required for status' };
      }
      return getFeatureStatus(featureName);

    default:
      return {
        success: false,
        error: `Unknown phase: ${phase}. Valid: constitution, specify, plan, tasks, list, status`
      };
  }
}
