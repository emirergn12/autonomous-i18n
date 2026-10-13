#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { translateCommand } from './commands/translate.js';
import { cleanCommand } from './commands/clean.js';
import { checkCommand } from './commands/check.js';
import { uiCommand } from './commands/ui.js';

const program = new Command();

program
  .name('i18n')
  .description('Autonomous i18n & Localization Manager for Developers')
  .version('0.1.0');

// i18n init
program
  .command('init')
  .description('Interactive setup wizard to initialize i18n.config.json')
  .action(async () => {
    await initCommand();
  });

// i18n scan
program
  .command('scan')
  .description('Scan codebase AST for missing, dead, and un-translated keys')
  .option('--json', 'Output report in raw JSON format')
  .action(async (options) => {
    await scanCommand(options);
  });

// i18n translate
program
  .command('translate')
  .description('Translate missing keys automatically using LLM AI Pipeline')
  .option('--auto-approve', 'Automatically accept all AI translations without prompting', true)
  .option('--interactive', 'Interactively review each AI translation before saving')
  .option('--provider <name>', 'Override default AI provider (gemini, openai, ollama, mock)')
  .action(async (options) => {
    const autoApprove = options.interactive ? false : options.autoApprove;
    await translateCommand({
      autoApprove,
      provider: options.provider,
    });
  });

// i18n clean
program
  .command('clean')
  .description('Find and remove dead (unused) keys from locale JSON files')
  .option('-f, --force', 'Remove dead keys automatically without confirmation prompt')
  .option('--dry-run', 'Preview dead keys that would be removed without modifying files')
  .action(async (options) => {
    await cleanCommand(options);
  });

// i18n check
program
  .command('check')
  .description('CI/CD health check mode. Fails with exit code 1 if missing keys exist')
  .option('--cwd <path>', 'Working directory path')
  .option('--format <type>', 'Output format (console, markdown, json)', 'console')
  .option('-o, --output <file>', 'Write check report to file (e.g. report.md)')
  .action(async (options) => {
    await checkCommand({
      cwd: options.cwd,
      format: options.format,
      outputFile: options.output,
    });
  });

// i18n ui
program
  .command('ui')
  .description('Launch modern Web Dashboard in browser')
  .option('-p, --port <number>', 'Port for dashboard server', '3000')
  .action(async (options) => {
    await uiCommand({ port: parseInt(options.port, 10) });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ Error: ${message}\n`);
  process.exit(1);
});
