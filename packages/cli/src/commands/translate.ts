import * as p from '@clack/prompts';
import pc from 'picocolors';
import { loadConfig, scanCodebase, DiffEngine, LocaleStore, type AIProvider } from '@i18n-manager/core';
import { TranslationPipeline, createProvider, type TranslationTaskItem } from '@i18n-manager/ai';

export interface TranslateCommandOptions {
  cwd?: string;
  autoApprove?: boolean;
  provider?: string;
}

function inferFallbackSourceText(key: string): string {
  const lastPart = key.split('.').pop() ?? key;
  return lastPart
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function translateCommand(options: TranslateCommandOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const config = loadConfig({ cwd });

  if (options.provider) {
    config.ai = {
      provider: options.provider as AIProvider,
      temperature: config.ai?.temperature ?? 0.2,
      model: config.ai?.model,
      apiKey: config.ai?.apiKey,
      baseUrl: config.ai?.baseUrl,
      systemPromptAddition: config.ai?.systemPromptAddition,
    };
  }

  const scanResult = await scanCodebase(config, { cwd });
  const store = new LocaleStore(config, cwd);
  const diffEngine = new DiffEngine(config, store, cwd);
  const audit = await diffEngine.runAudit(scanResult);

  if (audit.missingKeys.length === 0) {
    console.log(`\n🎉 ${pc.green(pc.bold('All translations are up to date!'))} Health score: 100%\n`);
    return;
  }

  console.log(`\n🤖 ${pc.bold(pc.cyan('[i18n-manager] Autonomous AI Translation Pipeline'))}`);
  console.log(`   Found ${pc.yellow(String(audit.missingKeys.length))} missing key(s) across target locales.`);

  const tasks: TranslationTaskItem[] = audit.missingKeys.map((item) => {
    const sourceVal = item.sourceValue || inferFallbackSourceText(item.key);
    return {
      key: item.key,
      sourceText: sourceVal,
      sourceLocale: config.sourceLocale,
      targetLocale: item.targetLocale,
      context: item.contexts[0],
    };
  });

  const spinner = p.spinner();
  spinner.start(`Translating via ${pc.cyan(config.ai?.provider ?? 'gemini')}...`);

  const providerInstance = createProvider(config.ai);
  const pipeline = new TranslationPipeline(config, { provider: providerInstance });

  let result;
  try {
    result = await pipeline.processBatch(tasks);
    spinner.stop(`Translated ${result.successful}/${result.totalTasks} keys.`);
  } catch (err: unknown) {
    spinner.stop('Translation failed.');
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ ${pc.red(`AI Translation Error: ${message}`)}\n`);
    return;
  }

  console.log(`\n📋 ${pc.bold('Generated Translations Preview:')}`);

  let approvedCount = 0;
  for (const item of result.results) {
    if (item.error) {
      console.log(`   ❌ [${pc.red(item.targetLocale)}] ${pc.bold(item.key)}: ${item.error}`);
      continue;
    }

    const repairTag = item.repaired ? pc.yellow(' [Auto-Repaired 🛡️]') : '';
    console.log(
      `   ✓ [${pc.cyan(item.targetLocale)}] ${pc.bold(item.key)}: "${pc.dim(item.sourceText)}" ➔ "${pc.green(item.translatedText)}"${repairTag}`
    );

    let shouldSave = options.autoApprove ?? true;

    if (!options.autoApprove) {
      const confirm = await p.confirm({
        message: `Accept translation for key "${item.key}" (${item.targetLocale})?`,
        initialValue: true,
      });
      if (p.isCancel(confirm)) break;
      shouldSave = Boolean(confirm);
    }

    if (shouldSave) {
      store.updateKey(item.targetLocale, item.key, item.translatedText);
      approvedCount++;
    }
  }

  console.log(`\n💾 ${pc.green(`Saved ${approvedCount} translation(s) to locale JSON files.`)}`);

  const updatedAudit = await diffEngine.runAudit(scanResult);
  console.log(
    `📈 ${pc.bold('Updated Health Score:')} ${
      updatedAudit.overallHealthScore === 100
        ? pc.green(pc.bold(`${updatedAudit.overallHealthScore}%`))
        : pc.yellow(pc.bold(`${updatedAudit.overallHealthScore}%`))
    }\n`
  );
}
