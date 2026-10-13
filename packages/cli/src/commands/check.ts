import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadConfig, scanCodebase, DiffEngine } from '@i18n-manager/core';

export interface CheckCommandOptions {
  cwd?: string;
  format?: 'console' | 'markdown' | 'json';
  outputFile?: string;
}

export async function checkCommand(options: CheckCommandOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const config = loadConfig({ cwd });
  const format = options.format ?? 'console';

  const scanResult = await scanCodebase(config, { cwd });
  const diffEngine = new DiffEngine(config, undefined, cwd);
  const audit = await diffEngine.runAudit(scanResult);

  if (format === 'json') {
    const jsonOutput = JSON.stringify(audit, null, 2);
    if (options.outputFile) {
      fs.writeFileSync(path.resolve(cwd, options.outputFile), jsonOutput, 'utf-8');
    } else {
      console.log(jsonOutput);
    }
  } else if (format === 'markdown') {
    const mdLines: string[] = [
      `## 🌐 i18n Localization Check Report`,
      ``,
      `**Health Score:** ${audit.overallHealthScore}% ${audit.isHealthy ? '✅' : '❌'}`,
      `**Source Locale:** \`${audit.sourceLocale}\` | **Target Locales:** \`${audit.targetLocales.join(', ')}\``,
      `**Scanned Files:** ${scanResult.scannedFiles.length} | **Unique Keys Found:** ${scanResult.keysMap.size}`,
      ``,
      `### Locale Coverage`,
      `| Locale | Total Keys | Missing Count | Coverage | Status |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
    ];

    for (const [locale, health] of Object.entries(audit.localeHealth)) {
      const statusEmoji = health.coveragePercentage === 100 ? '✅ Synced' : '⚠️ Missing Keys';
      mdLines.push(
        `| **${locale.toUpperCase()}** | ${health.totalKeys} | ${health.missingCount} | ${health.coveragePercentage}% | ${statusEmoji} |`
      );
    }

    if (audit.missingKeys.length > 0) {
      mdLines.push(``, `### ⚠️ Missing Keys (${audit.missingKeys.length})`);
      mdLines.push(`| Target Locale | Key | Code Location |`);
      mdLines.push(`| :--- | :--- | :--- |`);
      for (const item of audit.missingKeys) {
        const firstCtx = item.contexts[0];
        const locStr = firstCtx ? `\`${firstCtx.filePath}:${firstCtx.line}\`` : 'N/A';
        mdLines.push(`| \`${item.targetLocale}\` | \`${item.key}\` | ${locStr} |`);
      }
    }

    if (audit.deadKeys.length > 0) {
      mdLines.push(``, `### 🧹 Dead / Unused Keys (${audit.deadKeys.length})`);
      for (const item of audit.deadKeys) {
        mdLines.push(`- \`${item.key}\` (present in: ${item.localesPresent.join(', ')})`);
      }
    }

    const mdOutput = mdLines.join('\n') + '\n';

    if (options.outputFile) {
      fs.writeFileSync(path.resolve(cwd, options.outputFile), mdOutput, 'utf-8');
      console.log(`[i18n check] Report written to ${options.outputFile}`);
    } else {
      console.log(mdOutput);
    }
  } else {
    // Console output
    console.log(`\n🚦 ${pc.bold(pc.cyan('[i18n-manager] CI/CD Health Check'))}`);
    console.log(`   Health Score: ${audit.isHealthy ? pc.green(`${audit.overallHealthScore}% ✅`) : pc.red(`${audit.overallHealthScore}% ❌`)}`);

    for (const [locale, health] of Object.entries(audit.localeHealth)) {
      console.log(`   - ${locale.toUpperCase()}: ${health.coveragePercentage}% (${health.missingCount} missing)`);
    }

    if (audit.missingKeys.length > 0) {
      console.log(`\n❌ ${pc.red(pc.bold(`Check Failed: ${audit.missingKeys.length} missing translation key(s) detected.`))}\n`);
    } else {
      console.log(`\n✅ ${pc.green(pc.bold('Check Passed: All translations are fully synced!'))}\n`);
    }
  }

  if (!audit.isHealthy && config.rules.failOnMissingInCI) {
    process.exit(1);
  }
}
