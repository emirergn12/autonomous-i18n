import path from 'node:path';
import fs from 'node:fs';
import pc from 'picocolors';
import { createDevServer } from '@i18n-manager/core';

export interface UICommandOptions {
  port?: number;
  cwd?: string;
}

export async function uiCommand(options: UICommandOptions = {}) {
  const port = options.port ?? 3000;
  const cwd = options.cwd ?? process.cwd();

  // Path to dashboard dist folder
  const dashboardDist = path.resolve(
    import.meta.url.replace('file:///', '').replace('file://', ''),
    '../../../../dashboard/dist'
  );

  const staticDir = fs.existsSync(dashboardDist) ? dashboardDist : undefined;

  const serverInstance = createDevServer({
    port: 3001,
    cwd,
    staticDir,
  });

  const activePort = await serverInstance.listen(3001);

  console.log(`\n🚀 ${pc.bold(pc.cyan('[i18n-manager] Local DevServer Bridge Active'))}`);
  console.log(`   API Endpoint: ${pc.green(`http://localhost:${activePort}/api/audit`)}`);
  if (staticDir) {
    console.log(`   Web Dashboard: ${pc.bold(pc.green(`http://localhost:${activePort}`))}`);
  } else {
    console.log(`   Web Dashboard (Vite Dev): ${pc.bold(pc.green(`http://localhost:3000`))}`);
  }
  console.log(`   Press ${pc.yellow('Ctrl+C')} to stop server.\n`);
}
