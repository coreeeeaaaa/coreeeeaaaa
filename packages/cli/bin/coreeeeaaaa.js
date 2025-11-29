#!/usr/bin/env node
import { Command } from 'commander'
import { readFile } from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

import {
  defaultDirs,
  evaluateGate,
  packEvidence,
  persistGateResult,
  setPointer,
  validateWithSchema,
  anonymizeContent,
  appendLog,
  tailLogs
} from '@coreeeeaaaa/sdk'

const execFileAsync = promisify(execFile)

const program = new Command()
program.name('coreeeeaaaa').description('coreeeeaaaa automation toolkit').version('0.1.0')

async function loadJson(inputPath) {
  const content = await readFile(inputPath, 'utf8')
  return JSON.parse(content)
}

program
  .command('gate')
  .description('run a gate evaluation and persist the result locally')
  .argument('<id>', 'gate id, e.g., G4')
  .option('--input <file>', 'json file with gate input')
  .option('--schema <file>', 'JSON schema to validate input')
  .option('--policy <file>', 'JSON policy file with allow=true/false')
  .option('--opa <rego>', 'OPA policy file; expects data.gate.allow == true')
  .option('--project <name>', 'project name to anonymize within input text')
  .option('--redact <pattern...>', 'regex patterns to redact from input')
  .option('--out <dir>', 'output directory', defaultDirs.gates)
  .action(async (id, options) => {
    try {
      let input = options.input ? await loadJson(options.input) : {}
      if (options.project || options.redact) {
        const text = JSON.stringify(input)
        const redacted = anonymizeContent(text, { projectName: options.project, redactPatterns: options.redact || [] })
        input = JSON.parse(redacted)
      }

      if (options.schema) {
        const { valid, errors } = await validateWithSchema(input, options.schema)
        if (!valid) {
          throw new Error(`schema validation failed: ${JSON.stringify(errors)}`)
        }
      }

      if (options.policy) {
        const policy = await loadJson(options.policy)
        const allow = policy.allow === true || (policy.rules && policy.rules.includes(id))
        if (!allow) throw new Error('policy deny')
      }

      if (options.opa) {
        try {
          const inputTmp = JSON.stringify(input)
          const { stdout } = await execFileAsync('opa', ['eval', '-i', '/dev/stdin', '-d', options.opa, 'data.gate.allow'], { input: inputTmp })
          const allowed = stdout.includes('true')
          if (!allowed) throw new Error('opa deny')
        } catch (err) {
          throw new Error(`opa eval failed/deny: ${err.message}`)
        }
      }

      const result = await evaluateGate(id, input)
      const filePath = await persistGateResult(id, result, options.out)
      console.log(`gate ${id} ok -> ${filePath}`)
    } catch (err) {
      console.error(`gate run failed: ${err.message}`)
      process.exitCode = 1
    }
  })

program
  .command('evidence')
  .description('pack evidence files into a manifest with hashes')
  .argument('[files...]', 'files to hash')
  .option('--out <file>', 'manifest output path', path.join(defaultDirs.evidence, 'manifest.json'))
  .action(async (files, options) => {
    try {
      const { outputFile, manifest } = await packEvidence(files, options.out)
      console.log(`evidence manifest -> ${outputFile} (${manifest.count} entries)`) 
    } catch (err) {
      console.error(`evidence pack failed: ${err.message}`)
      process.exitCode = 1
    }
  })

program
  .command('pointer')
  .description('update local pointer record (CAS friendly)')
  .requiredOption('--hash <value>', 'target canon hash')
  .option('--file <path>', 'pointer file path', path.join(defaultDirs.pointers, 'current.json'))
  .option('--supersedes <hash>', 'previous hash')
  .option('--if-match <etag>', 'ETag for CAS')
  .option('--snapshot <ts>', 'snapshot timestamp')
  .action(async (options) => {
    try {
      const filePath = await setPointer(options.hash, {
        pointerFile: options.file,
        supersedes: options.supersedes,
        ifMatch: options.ifMatch,
        snapshotTs: options.snapshot
      })
      console.log(`pointer updated -> ${filePath}`)
    } catch (err) {
      console.error(`pointer update failed: ${err.message}`)
      process.exitCode = 1
    }
  })

program
  .command('log')
  .description('append or view structured logs')
  .option('--add', 'append a log entry')
  .option('--type <type>', 'entry type, e.g., instruction|action|result')
  .option('--actor <actor>', 'who produced the entry')
  .option('--context <ctx>', 'context or gate id')
  .option('--text <text>', 'message')
  .option('--data <file>', 'json file to include as data')
  .option('--tail', 'print recent log entries')
  .option('--lines <n>', 'lines to show', '20')
  .action(async (options) => {
    try {
      if (options.add) {
        const data = options.data ? await loadJson(options.data) : undefined
        const entry = {
          type: options.type || 'info',
          actor: options.actor || 'system',
          context: options.context || 'general',
          text: options.text || '',
          data
        }
        const filePath = await appendLog(entry)
        console.log(`log appended -> ${filePath}`)
        return
      }

      if (options.tail) {
        const lines = parseInt(options.lines, 10) || 20
        const rows = await tailLogs({ lines })
        rows.forEach((r) => console.log(JSON.stringify(r)))
        return
      }

      console.error('Specify --add or --tail')
      process.exitCode = 1
    } catch (err) {
      console.error(`log command failed: ${err.message}`)
      process.exitCode = 1
    }
  })

program
  .command('autonomous')
  .description('run autonomous engine step')
  .command('step')
  .description('run one step')
  .action(async () => {
    try {
      const { runStep } = await import('@coreeeeaaaa/sdk/autonomous')
      const res = await runStep()
      console.log(JSON.stringify(res, null, 2))
    } catch (err) {
      console.error(`autonomous step failed: ${err.message}`)
      process.exitCode = 1
    }
  })

program.parse()
