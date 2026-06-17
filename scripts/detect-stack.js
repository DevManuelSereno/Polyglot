#!/usr/bin/env node

/**
 * detect-stack.js — Fast i18n stack detection for Polyglot skill
 *
 * Detects:
 * 1. i18n library in use (next-intl, react-i18next, vue-i18n, etc.)
 * 2. Translation files location
 * 3. Config files
 *
 * Output: Compact JSON (~200 tokens)
 * Execution: ~1s, no shell dependencies
 *
 * Usage:
 *   node detect-stack.js                    # JSON output
 *   node detect-stack.js --verbose          # Human-readable output
 */

const fs = require('fs');
const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Library detection patterns
const LIBRARY_PATTERNS = [
  { name: 'next-intl', patterns: [/useTranslations/, /next-intl\.config/] },
  { name: 'react-i18next', patterns: [/useTranslation/, /i18next\.config/] },
  { name: 'i18next', patterns: [/import i18n from ['"]i18next['"]/, /i18next\.config/] },
  { name: 'react-intl', patterns: [/useIntl/, /FormattedMessage/, /react-intl/] },
  { name: 'vue-i18n', patterns: [/useI18n/, /\$t\(/, /vue-i18n/] },
  { name: '@angular/localize', patterns: [/\$localize/, /ng extract-i18n/] },
  { name: 'svelte-i18n', patterns: [/svelte-i18n/, /\$_\(/] },
  { name: 'lingui', patterns: [/@lingui/, /lingui\.config/] },
];

// Directories to search for translation files
const TRANSLATION_DIRS = ['locales', 'messages', 'i18n', 'lang', 'translations'];

// Directories to ignore during file traversal
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.claude'];

// File extensions to scan
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];

// Translation file extensions
const TRANSLATION_EXTENSIONS = ['.json', '.yaml', '.yml', '.po', '.properties'];

// Config file prefixes
const CONFIG_PREFIXES = ['i18n.config.', 'next-intl.config.', 'i18next.config.', 'lingui.config.'];

/**
 * Recursively find files matching a pattern
 */
function findFiles(dir, filePattern, ignoreDirs = IGNORE_DIRS) {
  const results = [];

  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          if (!ignoreDirs.includes(item)) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (filePattern.test(item) || filePattern.test(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Permission denied or other error — skip directory
    }
  }

  walk(dir);
  return results;
}

/**
 * Read file content safely
 */
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Detect which i18n library is in use
 */
function detectLibrary(sourceFiles) {
  const scores = {};

  for (const file of sourceFiles) {
    const content = readFileSafe(file);
    if (!content) continue;

    for (const lib of LIBRARY_PATTERNS) {
      if (!scores[lib.name]) scores[lib.name] = 0;

      for (const pattern of lib.patterns) {
        if (pattern.test(content)) {
          scores[lib.name]++;
          break; // Count each file only once per library
        }
      }
    }
  }

  // Find library with highest score
  let bestLibrary = null;
  let bestScore = 0;

  for (const [name, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLibrary = name;
    }
  }

  return {
    library: bestLibrary,
    confidence: bestScore >= 5 ? 'high' : bestScore >= 2 ? 'medium' : bestScore >= 1 ? 'low' : 'none',
    matches: bestScore,
  };
}

/**
 * Find translation files
 */
function findTranslationFiles() {
  const results = [];

  for (const dir of TRANSLATION_DIRS) {
    const dirPath = path.join('.', dir);
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const ext = path.extname(file);
          if (TRANSLATION_EXTENSIONS.includes(ext)) {
            results.push(path.join(dir, file));
          }
        }
      }
    } catch {
      // Directory doesn't exist or permission denied
    }
  }

  return results;
}

/**
 * Find config files
 */
function findConfigFiles() {
  const results = [];

  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory() && !IGNORE_DIRS.includes(item)) {
          walk(fullPath);
        } else if (stat.isFile()) {
          const basename = path.basename(item);
          for (const prefix of CONFIG_PREFIXES) {
            if (basename.startsWith(prefix)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
    } catch {
      // Permission denied
    }
  }

  walk('.');
  return results;
}

/**
 * Detect locales from translation file names
 */
function detectLocales(translationFiles) {
  const locales = new Set();

  for (const file of translationFiles) {
    const basename = path.basename(file);
    const ext = path.extname(basename);
    const name = basename.replace(ext, '');

    // Common locale patterns: en.json, en-US.json, pt-BR.json
    if (/^[a-z]{2}(-[A-Z]{2})?$/.test(name)) {
      locales.add(name);
    }
  }

  return Array.from(locales).sort();
}

/**
 * Main detection function
 */
function detect() {
  // Find source files with i18n imports
  const sourceFiles = findFiles('.', /\.(ts|tsx|js|jsx|vue|svelte)$/);

  // Filter to files that likely contain i18n code
  const i18nSourceFiles = sourceFiles.filter(file => {
    const content = readFileSafe(file);
    if (!content) return false;
    return /useTranslations?|useTranslation|useIntl|\$t\(|formatMessage|svelte-i18n|@lingui/.test(content);
  });

  // Detect library
  const libraryResult = detectLibrary(i18nSourceFiles);

  // Find translation files
  const translationFiles = findTranslationFiles();

  // Find config files
  const configFiles = findConfigFiles();

  // Detect locales
  const locales = detectLocales(translationFiles);

  // Build result
  const result = {
    library: libraryResult.library || 'unknown',
    confidence: libraryResult.confidence,
    i18nFiles: i18nSourceFiles.slice(0, 5).map(f => path.relative('.', f)),
    translationFiles: translationFiles.slice(0, 5),
    configFiles: configFiles.slice(0, 3).map(f => path.relative('.', f)),
    locales: locales,
    hasI18n: libraryResult.confidence !== 'none',
  };

  return result;
}

/**
 * Format output
 */
function formatOutput(result) {
  if (verbose) {
    const lines = [
      '# i18n Stack Detection',
      '',
      `## Library: ${result.library}`,
      `- Confidence: ${result.confidence}`,
      `- Matches: ${result.confidence === 'high' ? '5+' : result.confidence === 'medium' ? '2-4' : result.confidence === 'low' ? '1' : '0'}`,
      '',
      `## Translation Files: ${result.translationFiles.length}`,
      ...result.translationFiles.map(f => `- ${f}`),
      '',
      `## Config Files: ${result.configFiles.length}`,
      ...result.configFiles.map(f => `- ${f}`),
      '',
      `## Locales: ${result.locales.length > 0 ? result.locales.join(', ') : 'None detected'}`,
      '',
      `## i18n Files (sample): ${result.i18nFiles.length}`,
      ...result.i18nFiles.map(f => `- ${f}`),
    ];
    return lines.join('\n');
  }

  return JSON.stringify(result, null, 2);
}

// Run detection
const result = detect();
console.log(formatOutput(result));
