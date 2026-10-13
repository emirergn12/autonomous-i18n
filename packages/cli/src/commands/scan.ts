import Table from 'cli-table3';
import pc from 'picocolors';
import { loadConfig, scanCodebase, DiffEngine } from '@i18n-manager/core';

export async function scanCommand(options: { cwd?: string; json?: boolean } = {}) {
  const cwd = options.cwd ?? process.cwd();
  const config = loadConfig({ cwd });

  const scanResult = await scanCodebase(config, { cwd });
  const diffEngine = new DiffEngine(config, undefined, cwd);
  const audit = await diffEngine.runAudit(scanResult);

  if (options.json) {
    console.log(JSON.stringify(audit, null, 2));
    return audit;
  }

  console.log(`\n🔍 ${pc.bold(pc.cyan('[i18n-manager] Codebase Localization Audit'))}`);
  console.log(`   Source: ${pc.green(config.sourceLocale)} | Targets: ${pc.yellow(config.targetLocales.join(', '))}`);
  console.log(`   Scanned: ${pc.dim(`${scanResult.scannedFiles.length} file(s)`)} | Keys Found: ${pc.bold(scanResult.keysMap.size)}\n`);

  // Render Health Table
  const table = new Table({
    head: [pc.bold('Locale'), pc.bold('Coverage'), pc.bold('Missing Keys'), pc.bold('Status')],
    colWidths: [12, 18, 16, 15],
  });

  for (const [locale, health] of Object.entries(audit.localeHealth)) {
    const isFull = health.coveragePercentage === 100;
    const isGood = health.coveragePercentage >= 80;
    const colorFn = isFull ? pc.green : isGood ? pc.yellow : pc.red;
    const statusText = isFull ? '🟩 Synced' : isGood ? '🟨 Incomplete' : '🟥 Action Required';

    table.push([
      pc.bold(locale.toUpperCase()),
      colorFn(`${health.coveragePercentage}%`),
      health.missingCount > 0 ? pc.red(String(health.missingCount)) : pc.green('0'),
      statusText,
    ]);
  }

  console.log(table.toString());

  console.log(
    `\n📊 ${pc.bold('Overall Health Score:')} ${
      audit.overallHealthScore === 100
        ? pc.green(pc.bold(`${audit.overallHealthScore}%`))
        : audit.overallHealthScore >= 80
        ? pc.yellow(pc.bold(`${audit.overallHealthScore}%`))
        : pc.red(pc.bold(`${audit.overallHealthScore}%`))
    }\n`
  );

  if (audit.missingKeys.length > 0) {
    console.log(`⚠️  ${pc.bold(pc.yellow(`Missing Keys (${audit.missingKeys.length}):`))}`);
    for (const item of audit.missingKeys.slice(0, 10)) {
      const firstCtx = item.contexts[0];
      const locStr = firstCtx ? pc.dim(` [${firstCtx.filePath}:${firstCtx.line}]`) : '';
      console.log(`   - [${pc.magenta(item.targetLocale)}] ${pc.bold(item.key)}${locStr}`);
    }
    if (audit.missingKeys.length > 10) {
      console.log(`   ${pc.dim(`...and ${audit.missingKeys.length - 10} more missing keys.`)}`);
    }
    console.log('');
  }

  if (audit.deadKeys.length > 0) {
    console.log(`🧹 ${pc.bold(pc.gray(`Dead/Unused Keys (${audit.deadKeys.length}):`))}`);
    for (const item of audit.deadKeys.slice(0, 5)) {
      console.log(`   - ${pc.gray(item.key)} ${pc.dim(`(in: ${item.localesPresent.join(', ')})`)}`);
    }
    console.log('');
  }

  return audit;
}
