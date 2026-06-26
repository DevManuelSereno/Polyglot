#!/usr/bin/env node

/**
 * detect-conventions.js — Auto-detect i18n conventions in a codebase
 *
 * Two modes:
 *   --quick  Fast stack detection (~200 tokens, ~100ms) — for dynamic context
 *   --deep   Full convention analysis (~2k tokens, ~1s) — for Phase 1, Step 2
 *
 * Quick mode detects:
 *   1. i18n library in use
 *   2. Translation files location
 *   3. Config files
 *   4. Available locales
 *
 * Deep mode additionally detects:
 *   5. Namespace pattern (Module.Component.key)
 *   6. Hook usage pattern (direct vs prop drilling)
 *   7. Sub-component pattern
 *   8. Schema integration (Zod factory functions)
 *   9. Key naming casing
 *
 * Usage:
 *   node detect-conventions.js                    # Deep mode, JSON, 10 files
 *   node detect-conventions.js --quick            # Quick mode, compact JSON
 *   node detect-conventions.js --files 20         # Deep mode, 20 files
 *   node detect-conventions.js --verbose          # Markdown output
 *   node detect-conventions.js --output file.json # Save to file
 *   node detect-conventions.js --help             # Show help
 */

const fs = require('fs');
const path = require('path');

// Detect skill directory for resource loading
const skillDir = process.env.CLAUDE_SKILL_DIR ||
                 path.join(__dirname, '..') ||
                 process.cwd();

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  quick: false,
  files: 10,
  verbose: false,
  output: null,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--quick') {
    options.quick = true;
  } else if (args[i] === '--files' && args[i + 1]) {
    options.files = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--verbose') {
    options.verbose = true;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === '--help') {
    options.help = true;
  }
}

if (options.help) {
  console.log(`
detect-conventions.js — Auto-detect i18n conventions

Usage:
  node detect-conventions.js [options]

Options:
  --quick           Fast stack detection (~200 tokens, ~100ms)
  --files <count>   Number of files to analyze in deep mode (default: 10)
  --verbose         Output human-readable markdown instead of JSON
  --output <file>   Save output to file
  --help            Show this help message

Examples:
  node detect-conventions.js --quick              # Fast detection (for dynamic context)
  node detect-conventions.js                      # Full convention analysis
  node detect-conventions.js --files 20           # Analyze 20 files
  node detect-conventions.js --verbose            # Markdown output
  node detect-conventions.js --output conv.json   # Save JSON to file
`);
  process.exit(0);
}

// ============================================================================
// HELPERS
// ============================================================================

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.claude'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
const TRANSLATION_DIRS = ['locales', 'messages', 'i18n', 'lang', 'translations', 'public/locales'];
const TRANSLATION_EXTENSIONS = ['.json', '.yaml', '.yml', '.po', '.properties'];
const CONFIG_PREFIXES = ['i18n.config.', 'next-intl.config.', 'i18next.config.', 'lingui.config.'];

const LIBRARY_PATTERNS = [
  { name: 'next-intl', patterns: [/useTranslations/, /next-intl\.config/] },
  { name: 'react-i18next', patterns: [/useTranslation/, /i18next\.config/] },
  { name: 'i18next', patterns: [/from ['"]i18next['"]/, /i18next\.config/] },
  { name: 'react-intl', patterns: [/useIntl/, /FormattedMessage/, /react-intl/] },
  { name: 'vue-i18n', patterns: [/useI18n/, /\$t\(/, /vue-i18n/] },
  { name: '@angular/localize', patterns: [/\$localize/, /ng extract-i18n/] },
  { name: 'svelte-i18n', patterns: [/svelte-i18n/, /\$_\(/] },
  { name: 'lingui', patterns: [/@lingui/, /lingui\.config/] },
];

function findFilesRecursive(dir, contentPattern, ignoreDirs = IGNORE_DIRS) {
  const results = [];
  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        let stat;
        try { stat = fs.statSync(fullPath); } catch { continue; }
        if (stat.isDirectory()) {
          if (!ignoreDirs.includes(item)) walk(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (SOURCE_EXTENSIONS.includes(ext)) {
            if (contentPattern) {
              const content = readFileSafe(fullPath);
              if (content && contentPattern.test(content)) results.push(fullPath);
            } else {
              results.push(fullPath);
            }
          }
        }
      }
    } catch {}
  }
  walk(dir);
  return results;
}

function findTranslationFiles() {
  const results = [];
  for (const dir of TRANSLATION_DIRS) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (TRANSLATION_EXTENSIONS.includes(path.extname(file))) {
            results.push(path.join(dir, file));
          }
        }
      }
    } catch {}
  }
  return results;
}

function findConfigFiles() {
  const results = [];
  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        let stat;
        try { stat = fs.statSync(fullPath); } catch { continue; }
        if (stat.isDirectory() && !IGNORE_DIRS.includes(item)) {
          walk(fullPath);
        } else if (stat.isFile()) {
          const basename = path.basename(item);
          for (const prefix of CONFIG_PREFIXES) {
            if (basename.startsWith(prefix)) { results.push(fullPath); break; }
          }
        }
      }
    } catch {}
  }
  walk('.');
  return results;
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function detectCasing(str) {
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) return 'camelCase';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return 'PascalCase';
  if (/^[a-z][a-z0-9_]*$/.test(str)) return 'snake_case';
  if (/^[a-z][a-z0-9-]*$/.test(str)) return 'kebab-case';
  if (/^[A-Z][A-Z0-9_]*$/.test(str)) return 'UPPER_SNAKE_CASE';
  return 'unknown';
}

function detectLocales(translationFiles) {
  const locales = new Set();
  for (const file of translationFiles) {
    const name = path.basename(file).replace(path.extname(file), '');
    if (/^[a-z]{2}(-[A-Z]{2})?$/.test(name)) locales.add(name);
  }
  return Array.from(locales).sort();
}

// ============================================================================
// QUICK MODE — Fast stack detection (~200 tokens)
// ============================================================================

function runQuickDetection() {
  // Find source files with i18n imports (scan filenames first, then read content only for matches)
  const allSourceFiles = findFilesRecursive('.', null);
  const i18nPattern = /useTranslations?|useTranslation|useIntl|\$t\(|formatMessage|svelte-i18n|@lingui/;
  const i18nFiles = allSourceFiles.filter(f => {
    const content = readFileSafe(f);
    return content && i18nPattern.test(content);
  });

  // Detect library
  const scores = {};
  for (const file of i18nFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    for (const lib of LIBRARY_PATTERNS) {
      if (!scores[lib.name]) scores[lib.name] = 0;
      for (const pattern of lib.patterns) {
        if (pattern.test(content)) { scores[lib.name]++; break; }
      }
    }
  }

  let bestLibrary = null;
  let bestScore = 0;
  for (const [name, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestLibrary = name; }
  }

  const translationFiles = findTranslationFiles();
  const configFiles = findConfigFiles();
  const locales = detectLocales(translationFiles);

  return {
    lib: bestLibrary || 'unknown',
    conf: bestScore >= 5 ? 'high' : bestScore >= 2 ? 'medium' : bestScore >= 1 ? 'low' : 'none',
    files: i18nFiles.slice(0, 3).map(f => path.relative('.', f)),
    locales: locales,
    storage: configFiles.length > 0 || translationFiles.length === 0 ? 'remote' : 'local',
    hasI18n: bestScore >= 1,
  };
}

// ============================================================================
// DEEP MODE — Full convention analysis (~2k tokens)
// ============================================================================

function detectNamespace(filesToAnalyze) {
  const namespaces = [];
  const keyPatterns = [];
  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;
    const nsMatches = content.match(/useTranslations?\(\s*['"]([^'"]+)['"]/g);
    if (nsMatches) nsMatches.forEach(m => namespaces.push(m.match(/['"]([^'"]+)['"]/)[1]));
    const keyMatches = content.match(/\bt\(\s*['"]([^'"]+)['"]/g);
    if (keyMatches) keyMatches.forEach(m => keyPatterns.push(m.match(/['"]([^'"]+)['"]/)[1]));
  }
  if (namespaces.length === 0 && keyPatterns.length === 0) {
    return { pattern: 'unknown', separator: 'unknown', depth: 0, casing: 'unknown', confidence: 'low', examples: [] };
  }
  const allKeys = [...namespaces, ...keyPatterns];
  const separators = { dot: 0, colon: 0, slash: 0, underscore: 0 };
  allKeys.forEach(k => {
    if (k.includes('.')) separators.dot++;
    if (k.includes(':')) separators.colon++;
    if (k.includes('/')) separators.slash++;
    if (k.includes('_')) separators.underscore++;
  });
  const primarySep = Object.entries(separators).sort((a, b) => b[1] - a[1])[0];
  const separator = primarySep[1] > 0 ? primarySep[0] : 'dot';
  const sepChar = separator === 'dot' ? '.' : separator === 'colon' ? ':' : separator === 'slash' ? '/' : '_';
  const depths = allKeys.map(k => k.split(sepChar).length);
  const depth = Math.round(depths.reduce((a, b) => a + b, 0) / depths.length);
  const leafKeys = allKeys.map(k => k.split(sepChar).pop());
  const casings = leafKeys.map(detectCasing);
  const casingCounts = casings.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
  const primaryCasing = Object.entries(casingCounts).sort((a, b) => b[1] - a[1])[0][0];
  const pattern = depth === 1 ? 'flat' : depth === 2 ? 'namespace.key' : 'Module.Component.key';
  const matchRate = (casingCounts[primaryCasing] || 0) / leafKeys.length;
  const confidence = matchRate >= 0.8 ? 'high' : matchRate >= 0.6 ? 'medium' : 'low';
  return { pattern, separator, depth, casing: primaryCasing, confidence, examples: allKeys.slice(0, 5) };
}

function detectHookUsage(filesToAnalyze) {
  let directUsage = 0, propDrilling = 0;
  const examples = [];
  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;
    const hasHook = /useTranslations?\(/.test(content);
    const hasPropT = /t\s*:\s*(any|Function|i18n)/.test(content) || /,\s*t\s*,/.test(content);
    if (hasHook) directUsage++;
    if (hasPropT) propDrilling++;
    if (hasHook && examples.length < 3) examples.push(path.basename(file));
  }
  const total = directUsage + propDrilling;
  if (total === 0) return { primary: 'unknown', subComponents: 'unknown', confidence: 'low', stats: { direct: 0, propDrilling: 0 } };
  const primary = directUsage > propDrilling ? 'direct' : 'prop-drilling';
  const confidence = Math.max(directUsage, propDrilling) / total >= 0.7 ? 'high' : 'medium';
  return { primary, subComponents: propDrilling > 0 ? 'prop-drilling' : 'direct', confidence, stats: { direct: directUsage, propDrilling }, examples };
}

function detectStorage() {
  const localFiles = findTranslationFiles();
  const configFiles = findConfigFiles();
  let remoteProvider = null;
  for (const configFile of configFiles) {
    const content = readFileSafe(configFile);
    if (content) {
      if (/gcs|google.*cloud/i.test(content)) remoteProvider = 'gcs';
      else if (/s3|aws/i.test(content)) remoteProvider = 's3';
      else if (/crowdin/i.test(content)) remoteProvider = 'crowdin';
      else if (/lokalise/i.test(content)) remoteProvider = 'lokalise';
      else if (/phrase/i.test(content)) remoteProvider = 'phrase';
    }
  }
  const packageJson = readFileSafe('package.json');
  let hasSyncScripts = false;
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      hasSyncScripts = /upload|sync|push.*i18n|push.*locale/i.test(Object.values(pkg.scripts || {}).join(' '));
    } catch {}
  }
  
  // Determine storage type:
  // - If remote provider detected in config → 'remote'
  // - Else if local translation files exist → 'local'
  // - Else if config files exist but no local files → 'remote' (likely TMS integration)
  // - Else → 'unknown'
  let type;
  if (remoteProvider) {
    type = 'remote';
  } else if (localFiles.length > 0) {
    type = 'local';
  } else if (configFiles.length > 0) {
    type = 'remote'; // Config without local files suggests TMS
  } else {
    type = 'unknown';
  }
  
  return { type, provider: remoteProvider, localFiles: localFiles.length > 0, workflow: remoteProvider ? 'generate-json → user-uploads' : 'direct-file-edit', confidence: type !== 'unknown' ? 'high' : 'low' };
}

function detectSubComponents(filesToAnalyze) {
  let propDrilling = 0, directHook = 0;
  const examples = [];
  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;
    if (!/components\//.test(file) || /pages\//.test(file)) continue;
    const hasPropT = /t\s*:\s*(any|Function|i18n)/.test(content) || /,\s*t\s*,/.test(content);
    const hasDirectHook = /useTranslations?\(/.test(content) && !hasPropT;
    if (hasPropT) { propDrilling++; if (examples.length < 3) examples.push(path.basename(file)); }
    if (hasDirectHook) directHook++;
  }
  const total = propDrilling + directHook;
  if (total === 0) return { pattern: 'unknown', rule: 'unknown', confidence: 'low' };
  const pattern = propDrilling > directHook ? 'prop-drilling' : 'direct';
  const rule = pattern === 'prop-drilling' ? 'sub-components receive t as prop' : 'sub-components call useTranslations directly';
  const confidence = Math.max(propDrilling, directHook) / total >= 0.7 ? 'high' : 'medium';
  return { pattern, rule, confidence, stats: { propDrilling, directHook }, examples };
}

function detectSchemas(filesToAnalyze) {
  let zodDetected = false, factoryPattern = 0, inlinePattern = 0;
  const examples = [];
  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;
    const hasZod = /z\.object\(|z\.string\(|z\.number\(/.test(content);
    const hasTUsage = /\bt\(\s*['"]/.test(content);
    const hasFactory = /export const \w+Schema\s*=\s*\(\s*t/.test(content);
    if (hasZod) {
      zodDetected = true;
      if (hasTUsage) {
        if (hasFactory) {
          factoryPattern++;
          if (examples.length < 3) { const match = content.match(/export const (\w+Schema)/); examples.push(match ? match[1] : path.basename(file)); }
        } else { inlinePattern++; }
      }
    }
  }
  if (!zodDetected) return { detected: false, confidence: 'high' };
  const pattern = factoryPattern > inlinePattern ? 'factory-function' : 'inline';
  return { detected: true, library: 'zod', pattern, confidence: Math.max(factoryPattern, inlinePattern) > 0 ? 'high' : 'medium', examples };
}

function detectKeyNaming() {
  const translationFiles = findTranslationFiles();
  if (translationFiles.length === 0) return { casing: 'unknown', confidence: 'low' };
  const allKeys = [];
  for (const file of translationFiles.slice(0, 3)) {
    const content = readFileSafe(file);
    if (!content) continue;
    try { allKeys.push(...flattenKeys(JSON.parse(content))); } catch {}
  }
  if (allKeys.length === 0) return { casing: 'unknown', confidence: 'low' };
  const leafKeys = allKeys.map(k => { const parts = k.includes('.') ? k.split('.') : k.includes(':') ? k.split(':') : k.split('_'); return parts[parts.length - 1]; });
  const casings = leafKeys.map(detectCasing);
  const casingCounts = casings.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
  const primaryCasing = Object.entries(casingCounts).sort((a, b) => b[1] - a[1])[0][0];
  const matchRate = (casingCounts[primaryCasing] || 0) / leafKeys.length;
  return { casing: primaryCasing, confidence: matchRate >= 0.8 ? 'high' : matchRate >= 0.6 ? 'medium' : 'low', stats: casingCounts };
}

function runDeepDetection() {
  const i18nPattern = /useTranslations?\(|useTranslation\(|\$t\(|formatMessage/;
  const i18nFiles = findFilesRecursive('.', i18nPattern);
  const filesToAnalyze = i18nFiles.slice(0, options.files);
  if (filesToAnalyze.length === 0) { console.error('No files with i18n usage found.'); process.exit(1); }
  console.error(`Analyzing ${filesToAnalyze.length} files...`);
  return {
    namespace: detectNamespace(filesToAnalyze),
    hookUsage: detectHookUsage(filesToAnalyze),
    storage: detectStorage(),
    subComponents: detectSubComponents(filesToAnalyze),
    schemas: detectSchemas(filesToAnalyze),
    keyNaming: detectKeyNaming(),
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function formatQuickMarkdown(result) {
  return [
    '# i18n Stack Detection', '',
    `## Library: ${result.lib}`,
    `- Confidence: ${result.conf}`,
    '',
    `## Storage: ${result.storage}`,
    `## Locales: ${result.locales.length > 0 ? result.locales.join(', ') : 'None detected'}`,
    '',
    `## i18n Files: ${result.files.length}`,
    ...result.files.map(f => `- ${f}`),
  ].join('\n');
}

function formatDeepMarkdown(result) {
  const lines = ['# Convention Detection Report', ''];
  const ns = result.conventions.namespace;
  lines.push('## Namespace Pattern');
  lines.push(`- Pattern: ${ns.pattern}`);
  lines.push(`- Separator: ${ns.separator} (${ns.separator === 'dot' ? '.' : ns.separator === 'colon' ? ':' : ns.separator === 'slash' ? '/' : '_'})`);
  lines.push(`- Depth: ${ns.depth} levels`);
  lines.push(`- Casing: ${ns.casing}`);
  lines.push(`- Confidence: ${ns.confidence}`);
  if (ns.examples.length > 0) lines.push(`- Examples: ${ns.examples.join(', ')}`);
  lines.push('');
  const hook = result.conventions.hookUsage;
  lines.push('## Hook Usage');
  lines.push(`- Primary: ${hook.primary === 'direct' ? 'Direct hook access' : 'Prop drilling'}`);
  lines.push(`- Sub-components: ${hook.subComponents}`);
  lines.push(`- Confidence: ${hook.confidence}`);
  if (hook.stats) lines.push(`- Stats: ${hook.stats.direct} direct, ${hook.stats.propDrilling} prop drilling`);
  lines.push('');
  const storage = result.conventions.storage;
  lines.push('## Storage');
  lines.push(`- Type: ${storage.type}${storage.provider ? ` (${storage.provider.toUpperCase()})` : ''}`);
  lines.push(`- Local files: ${storage.localFiles ? 'Yes' : 'No'}`);
  lines.push(`- Workflow: ${storage.workflow}`);
  lines.push(`- Confidence: ${storage.confidence}`);
  lines.push('');
  const sub = result.conventions.subComponents;
  lines.push('## Sub-Component Pattern');
  lines.push(`- Pattern: ${sub.pattern}`);
  lines.push(`- Rule: ${sub.rule}`);
  lines.push(`- Confidence: ${sub.confidence}`);
  if (sub.examples && sub.examples.length > 0) lines.push(`- Examples: ${sub.examples.join(', ')}`);
  lines.push('');
  const schema = result.conventions.schemas;
  lines.push('## Schema Integration');
  if (schema.detected) {
    lines.push(`- Library: ${schema.library}`);
    lines.push(`- Pattern: ${schema.pattern}`);
    lines.push(`- Confidence: ${schema.confidence}`);
    if (schema.examples && schema.examples.length > 0) lines.push(`- Examples: ${schema.examples.join(', ')}`);
  } else { lines.push('- Not detected'); }
  lines.push('');
  const naming = result.conventions.keyNaming;
  lines.push('## Key Naming');
  lines.push(`- Casing: ${naming.casing}`);
  lines.push(`- Confidence: ${naming.confidence}`);
  if (naming.stats) lines.push(`- Distribution: ${Object.entries(naming.stats).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  lines.push('');
  if (result.warnings.length > 0) { lines.push('## Warnings'); result.warnings.forEach(w => lines.push(`- ${w}`)); lines.push(''); }
  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  let result;

  if (options.quick) {
    result = runQuickDetection();
  } else {
    const conventions = runDeepDetection();
    result = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      filesAnalyzed: options.files,
      conventions,
      warnings: [],
    };
    if (options.files < 10) result.warnings.push(`Only ${options.files} files analyzed — increase sample for higher confidence`);
  }

  let output;
  if (options.verbose) {
    output = options.quick ? formatQuickMarkdown(result) : formatDeepMarkdown(result);
  } else {
    output = JSON.stringify(result, null, 2);
  }

  if (options.output) {
    fs.writeFileSync(options.output, output);
    console.log(`Output saved to ${options.output}`);
  } else {
    console.log(output);
  }
}

main();
