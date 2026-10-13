import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig, scanCodebase, DiffEngine, LocaleStore } from '@i18n-manager/core';

export interface CleanCommandOptions {
  cwd?: string;
  force?: boolean;
  dryRun?: boolean;
}

export async function cleanCommand(options: CleanCommandOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const config = loadConfig({ cwd });

  const scanResult = await scanCodebase(config, { cwd });
  const store = new LocaleStore(config, cwd);
  const diffEngine = new DiffEngine(config, store, cwd);
  const audit = await diffEngine.runAudit(scanResult);

  if (audit.deadKeys.length === 0) {
    console.log(`\n✨ ${pc.green(pc.bold('No dead/unused keys found in locale files! Everything clean.'))}\n`);
    return;
  }

  console.log(`\n🧹 ${pc.bold(pc.yellow(`Found ${audit.deadKeys.length} dead key(s) in translation files:`))}`);
  for (const item of audit.deadKeys) {
    console.log(`   - ${pc.bold(item.key)} ${pc.dim(`(present in: ${item.localesPresent.join(', ')})`)}`);
  }

  if (options.dryRun) {
    console.log(`\n🔍 ${pc.cyan('[Dry Run] No files were modified.')}\n`);
    return;
  }

  let shouldDelete = options.force ?? false;

  if (!options.force) {
    const confirm = await p.confirm({
      message: `Do you want to permanently remove these ${audit.deadKeys.length} unused key(s) from all locale files?`,
      initialValue: false,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cleanup cancelled.');
      return;
    }
    shouldDelete = true;
  }

  if (shouldDelete) {
    let removedCount = 0;
    for (const item of audit.deadKeys) {
      for (const locale of item.localesPresent) {
        if (store.deleteKey(locale, item.key)) {
          removedCount++;
        }
      }
    }

    console.log(`\n✔ ${pc.green(`Successfully removed ${removedCount} unused key instance(s) from locale files!`)}\n`);
  }
}
