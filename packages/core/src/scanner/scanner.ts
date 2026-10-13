import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type { I18nConfig, ExtractedKeyContext } from '../types/index.js';
import { extractKeysFromSource } from '../extractor/ast-extractor.js';

export interface ScanResult {
  /** Map of key name -> list of all usage contexts across codebase */
  keysMap: Map<string, ExtractedKeyContext[]>;
  /** Total number of translation call sites found in code */
  totalOccurrences: number;
  /** List of files successfully scanned */
  scannedFiles: string[];
}

export interface ScannerOptions {
  cwd?: string;
}

/**
 * Scans the project directory based on config patterns and extracts all translation keys.
 */
export async function scanCodebase(
  config: I18nConfig,
  options: ScannerOptions = {}
): Promise<ScanResult> {
  const cwd = options.cwd ?? process.cwd();

  // Fast-glob expects POSIX forward slashes
  const includePatterns = config.include.map((p) => p.replace(/\\/g, '/'));
  const ignorePatterns = config.exclude.map((p) => p.replace(/\\/g, '/'));

  const files = await fg(includePatterns, {
    cwd,
    ignore: ignorePatterns,
    absolute: true,
    onlyFiles: true,
  });

  const keysMap = new Map<string, ExtractedKeyContext[]>();
  let totalOccurrences = 0;
  const scannedFiles: string[] = [];

  for (const filePath of files) {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(cwd, filePath).replace(/\\/g, '/');

      const extracted = extractKeysFromSource(code, {
        filePath: relativePath,
        translationFunctions: config.translationFunctions,
      });

      for (const item of extracted) {
        totalOccurrences++;
        const existing = keysMap.get(item.key) ?? [];
        existing.push(item);
        keysMap.set(item.key, existing);
      }

      scannedFiles.push(relativePath);
    } catch (err: unknown) {
      // In case of non-critical syntax error in one file, continue scanning other files
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[i18n scanner] Skipping file ${filePath}: ${message}`);
    }
  }

  return {
    keysMap,
    totalOccurrences,
    scannedFiles,
  };
}
