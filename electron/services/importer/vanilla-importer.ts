/**
 * Vanilla F-Chat Importer
 *
 * Provides import functionality for vanilla F-Chat clients (official desktop client).
 * NOTE: Frolic too, should work. But I cannot 100% verify this fact.
 *       Testing shows it works, but... I unno' what edge cases there might be.

 */

import * as fs from 'fs';
import * as path from 'path';
import { GeneralSettings } from '../../common';

/**
 * Type of data being imported from vanilla F-Chat clients.
 */
export type ImportType = 'logs' | 'settings';

/**
 * Context information for locating vanilla F-Chat client data.
 *
 * @property baseDir - Base installation directory of the vanilla F-Chat client
 * @property dataDir - Data directory containing character folders and settings (typically baseDir/data)
 */
export interface VanillaContext {
  readonly baseDir: string;
  readonly dataDir: string;
}

/**
 * Options for importing character data from vanilla F-Chat clients.
 *
 * @property includeLogs - Whether to import chat log history. Defaults to true
 * @property includeSettings - Whether to import character settings files. Defaults to true
 * @property includePinnedEicons - Whether to import pinned/favorite eicons. Defaults based on includeSettings
 * @property overwrite - Whether to overwrite existing files. Defaults to false
 * @property onProgress - Optional callback invoked periodically during import to report progress
 */
export interface CharacterImportOptions {
  readonly includeLogs?: boolean;
  readonly includeSettings?: boolean;
  readonly includePinnedEicons?: boolean;
  readonly overwrite?: boolean;
  readonly onProgress?: (info: {
    readonly character: string;
    readonly stage: ImportType;
    readonly processed: number;
    readonly total: number;
  }) => void;
}

/**
 * Summary of files processed during a character import operation.
 *
 * @property logsCopied - Number of log files successfully copied
 * @property logsSkipped - Number of log files skipped (already existed)
 * @property settingsCopied - Number of settings files successfully copied
 * @property settingsSkipped - Number of settings files skipped (already existed)
 */
export interface ImportSummary {
  readonly logsCopied: number;
  readonly logsSkipped: number;
  readonly settingsCopied: number;
  readonly settingsSkipped: number;
}

function getDefaultBaseDir(): string | undefined {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, 'fchat') : undefined;
  }
  const home = process.env.HOME;
  if (!home) return undefined;
  if (process.platform === 'darwin')
    return path.join(home, 'Library', 'Application Support', 'fchat');
  return path.join(home, '.config', 'fchat');
}

/**
 * Resolves the context for accessing vanilla F-Chat client data.
 * Checks custom or platform-specific default locations for vanilla data directories.
 *
 * @param customBaseDir - Optional custom base directory to search for vanilla data
 * @returns A VanillaContext if valid vanilla data is found, undefined otherwise
 */
export function resolveContext(
  customBaseDir?: string
): VanillaContext | undefined {
  const candidates: Array<{ baseDir: string; dataDir: string }> = [];

  if (customBaseDir) {
    const normalized = path.resolve(customBaseDir);
    candidates.push({
      baseDir: path.dirname(normalized),
      dataDir: normalized
    });
    candidates.push({
      baseDir: normalized,
      dataDir: path.join(normalized, 'data')
    });
  } else {
    const defaultBaseDir = getDefaultBaseDir();
    if (!defaultBaseDir) return undefined;
    const normalized = path.resolve(defaultBaseDir);
    candidates.push({
      baseDir: normalized,
      dataDir: path.join(normalized, 'data')
    });
  }

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate.dataDir);
      if (!stat.isDirectory()) continue;
      return candidate;
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Checks if vanilla F-Chat data is available for import.
 *
 * @param context - Optional VanillaContext. If not provided, will attempt to resolve automatically
 * @returns True if importable vanilla data exists
 */
export function canImport(context?: VanillaContext): boolean {
  const ctx = context ?? resolveContext();
  if (!ctx) return false;
  return fs.existsSync(path.join(ctx.dataDir, 'settings'));
}

/**
 * Lists all character names found in the vanilla F-Chat data directory.
 *
 * @param context - Optional VanillaContext. If not provided, will attempt to resolve automatically
 * @returns Array of character names sorted alphabetically, or empty array if no context found
 */
export function listCharacters(
  context?: VanillaContext
): ReadonlyArray<string> {
  const ctx = context ?? resolveContext();
  if (!ctx) return [];
  return fs
    .readdirSync(ctx.dataDir)
    .filter(entry => {
      if (
        entry === 'settings' ||
        entry === 'window.json' ||
        entry === 'eicons.json'
      )
        return false;
      const full = path.join(ctx.dataDir, entry);
      try {
        return fs.statSync(full).isDirectory();
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.localeCompare(b));
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileIfNeeded(
  source: string,
  destination: string,
  overwrite: boolean
): boolean {
  if (!fs.existsSync(source)) return false;
  if (!overwrite && fs.existsSync(destination)) return false;
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
  return true;
}

function copyDirectory(
  source: string,
  destination: string,
  overwrite: boolean,
  onProgress?: (processed: number, total: number) => void
): { copied: number; skipped: number } {
  if (!fs.existsSync(source)) return { copied: 0, skipped: 0 };
  const entries = fs.readdirSync(source, { withFileTypes: true });
  let processed = 0;
  let copied = 0;
  let skipped = 0;
  const total = entries.length;
  ensureDir(destination);
  for (const entry of entries) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      const result = copyDirectory(src, dest, overwrite, onProgress);
      copied += result.copied;
      skipped += result.skipped;
    } else if (entry.isFile()) {
      if (copyFileIfNeeded(src, dest, overwrite)) copied++;
      else skipped++;
    }
    processed++;
    onProgress?.(processed, total);
  }
  return { copied, skipped };
}

/**
 * Imports general application settings from a vanilla F-Chat client.
 *
 * @param context - VanillaContext pointing to the vanilla data location
 * @param destinationDataDir - Absolute path to Horizon's data directory where settings will be imported
 * @returns Parsed GeneralSettings object, or undefined if import fails
 */
export function importGeneralSettings(
  context: VanillaContext,
  destinationDataDir: string
): GeneralSettings | undefined {
  const settingsFile = path.join(context.dataDir, 'settings');
  if (!fs.existsSync(settingsFile)) return undefined;
  try {
    const raw = fs.readFileSync(settingsFile, 'utf8');
    const imported = JSON.parse(raw);
    const result = new GeneralSettings();
    Object.assign(result, imported);
    result.logDirectory = destinationDataDir;
    return result;
  } catch (error) {
    console.error('importGeneralSettings.error', error);
    return undefined;
  }
}

function copyCharacterLogs(
  context: VanillaContext,
  destinationDataDir: string,
  character: string,
  overwrite: boolean,
  onProgress?: (processed: number, total: number) => void
): { copied: number; skipped: number } {
  const source = path.join(context.dataDir, character, 'logs');
  const destination = path.join(destinationDataDir, character, 'logs');
  return copyDirectory(source, destination, overwrite, onProgress);
}

function copyCharacterSettings(
  context: VanillaContext,
  destinationDataDir: string,
  character: string,
  overwrite: boolean,
  onProgress?: (processed: number, total: number) => void
): { copied: number; skipped: number } {
  const source = path.join(context.dataDir, character, 'settings');
  const destination = path.join(destinationDataDir, character, 'settings');
  return copyDirectory(source, destination, overwrite, onProgress);
}

/**
 * Imports data for a single character from a vanilla F-Chat client to Horizon.
 * Copies logs, settings, and pinned eicons based on options provided.
 *
 * @param context - VanillaContext pointing to the vanilla data location
 * @param destinationDataDir - Absolute path to Horizon's data directory
 * @param character - Name of the character to import
 * @param options - Options controlling what data to import and how to handle conflicts
 * @returns ImportSummary with counts of files copied and skipped
 */
export function importCharacter(
  context: VanillaContext,
  destinationDataDir: string,
  character: string,
  options: CharacterImportOptions = {}
): ImportSummary {
  const includeLogs = options.includeLogs !== false;
  const includeSettings = options.includeSettings !== false;
  const includePinnedEicons =
    options.includePinnedEicons === true ||
    (!includeSettings && options.includePinnedEicons !== false);
  const overwrite = options.overwrite === true;

  let logsCopied = 0;
  let logsSkipped = 0;
  let settingsCopied = 0;
  let settingsSkipped = 0;

  if (includeLogs) {
    const result = copyCharacterLogs(
      context,
      destinationDataDir,
      character,
      overwrite,
      (processed, total) =>
        options.onProgress?.({
          character,
          stage: 'logs',
          processed,
          total
        })
    );
    logsCopied = result.copied;
    logsSkipped = result.skipped;
  }

  if (includeSettings) {
    const result = copyCharacterSettings(
      context,
      destinationDataDir,
      character,
      overwrite,
      (processed, total) =>
        options.onProgress?.({
          character,
          stage: 'settings',
          processed,
          total
        })
    );
    settingsCopied = result.copied;
    settingsSkipped = result.skipped;
  }

  if (
    includePinnedEicons &&
    (!includeSettings || options.includePinnedEicons === true)
  ) {
    const source = path.join(
      context.dataDir,
      character,
      'settings',
      'favoriteEIcons'
    );
    const destination = path.join(
      destinationDataDir,
      character,
      'settings',
      'favoriteEIcons'
    );
    if (fs.existsSync(source)) {
      const copied = copyFileIfNeeded(source, destination, overwrite);
      if (copied) settingsCopied++;
      else if (!overwrite) settingsSkipped++;
    }
  }

  return { logsCopied, logsSkipped, settingsCopied, settingsSkipped };
}

/**
 * Imports data for multiple characters from a vanilla F-Chat client to Horizon.
 *
 * @param context - VanillaContext pointing to the vanilla data location
 * @param destinationDataDir - Absolute path to Horizon's data directory
 * @param options - Options controlling what data to import and which characters to include
 * @returns Map of character names to their import summaries
 */
export function importAll(
  context: VanillaContext,
  destinationDataDir: string,
  options: CharacterImportOptions & { characters?: ReadonlyArray<string> } = {}
): Map<string, ImportSummary> {
  const characters = (options.characters ?? listCharacters(context)).slice();
  const summaries = new Map<string, ImportSummary>();
  for (const character of characters) {
    summaries.set(
      character,
      importCharacter(context, destinationDataDir, character, options)
    );
  }
  return summaries;
}
