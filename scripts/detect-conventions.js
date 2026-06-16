#!/usr/bin/env node

/**
 * detect-conventions.js — Auto-detect i18n conventions in a codebase
 * 
 * Detects:
 * 1. Namespace pattern (Module.Component.key)
 * 2. Hook usage pattern (direct vs prop drilling)
 * 3. Storage type (local vs remote)
 * 4. Sub-component pattern (how t is passed)
 * 5. Schema integration (Zod factory functions)
 * 6. Key naming casing (camelCase, snake_case, kebab-case)
 * 
 * Usage:
 *   node detect-conventions.js                    # JSON compact, 10 files
 *   node detect-conventions.js --files 20         # Analyze 20 files
 *   node detect-conventions.js --verbose          # Markdown output
 *   node detect-conventions.js --output file.json # Save to file
 *   node detect-conventions.js --help             # Show help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Detect skill directory for resource loading
// Priority: CLAUDE_SKILL_DIR env var → script's parent directory → current directory
const skillDir = process.env.CLAUDE_SKILL_DIR || 
                 path.join(__dirname, '..') || 
                 process.cwd();

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  files: 10,
  verbose: false,
  output: null,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--files' && args[i + 1]) {
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
  --files <count>   Number of files to analyze (default: 10)
  --verbose         Output human-readable markdown instead of JSON
  --output <file>   Save output to file
  --help            Show this help message

Examples:
  node detect-conventions.js                    # JSON compact, 10 files
  node detect-conventions.js --files 20         # Analyze 20 files
  node detect-conventions.js --verbose          # Markdown output
  node detect-conventions.js --output conv.json # Save JSON to file
`);
  process.exit(0);
}

// Helper: find files recursively
function findFilesRecursive(dir, pattern, ignoreDirs = ['node_modules', '.git', 'dist', 'build']) {
  const results = [];
  
  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!ignoreDirs.includes(item)) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].includes(ext)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (pattern.test(content)) {
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

// Helper: find translation files
function findTranslationFiles() {
  const dirs = ['locales', 'messages', 'i18n', 'lang', 'translations', 'public/locales'];
  const extensions = ['.json', '.yaml', '.yml'];
  const results = [];
  
  for (const dir of dirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const ext = path.extname(file);
          if (extensions.includes(ext)) {
            results.push(path.join(dir, file));
          }
        }
      }
    } catch {}
  }
  
  return results;
}

// Helper: find config files
function findConfigFiles() {
  const patterns = ['i18n.config.', 'next-intl.config.', 'i18next.config.', 'lingui.config.'];
  const extensions = ['.ts', '.js', '.json'];
  const results = [];
  
  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item)) {
          walk(fullPath);
        } else if (stat.isFile()) {
          const basename = path.basename(item);
          for (const pattern of patterns) {
            if (basename.startsWith(pattern)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
    } catch {}
  }
  
  walk('.');
  return results;
}

// Helper: read file safely
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// Helper: flatten nested object keys
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

// Helper: detect casing
function detectCasing(str) {
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) return 'camelCase';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return 'PascalCase';
  if (/^[a-z][a-z0-9_]*$/.test(str)) return 'snake_case';
  if (/^[a-z][a-z0-9-]*$/.test(str)) return 'kebab-case';
  if (/^[A-Z][A-Z0-9_]*$/.test(str)) return 'UPPER_SNAKE_CASE';
  return 'unknown';
}

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

function detectNamespace(filesToAnalyze) {
  const namespaces = [];
  const keyPatterns = [];

  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;

    // Extract useTranslations('namespace') or useTranslation('namespace')
    const nsMatches = content.match(/useTranslations?\(\s*['"]([^'"]+)['"]/g);
    if (nsMatches) {
      nsMatches.forEach(m => {
        const ns = m.match(/['"]([^'"]+)['"]/)[1];
        namespaces.push(ns);
      });
    }

    // Extract t('key.path') calls
    const keyMatches = content.match(/\bt\(\s*['"]([^'"]+)['"]/g);
    if (keyMatches) {
      keyMatches.forEach(m => {
        const key = m.match(/['"]([^'"]+)['"]/)[1];
        keyPatterns.push(key);
      });
    }
  }

  if (namespaces.length === 0 && keyPatterns.length === 0) {
    return {
      pattern: 'unknown',
      separator: 'unknown',
      depth: 0,
      casing: 'unknown',
      confidence: 'low',
      examples: [],
    };
  }

  // Analyze separator
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

  // Analyze depth
  const depths = allKeys.map(k => k.split(sepChar).length);
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  const depth = Math.round(avgDepth);

  // Analyze casing of leaf keys
  const leafKeys = allKeys.map(k => k.split(sepChar).pop());
  const casings = leafKeys.map(detectCasing);
  const casingCounts = casings.reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const primaryCasing = Object.entries(casingCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Build pattern string
  const pattern = depth === 1 ? 'flat' : depth === 2 ? 'namespace.key' : 'Module.Component.key';

  // Confidence
  const matchRate = (casingCounts[primaryCasing] || 0) / leafKeys.length;
  const confidence = matchRate >= 0.8 ? 'high' : matchRate >= 0.6 ? 'medium' : 'low';

  return {
    pattern,
    separator,
    depth,
    casing: primaryCasing,
    confidence,
    examples: allKeys.slice(0, 5),
  };
}

function detectHookUsage(filesToAnalyze) {
  let directUsage = 0;
  let propDrilling = 0;
  const examples = [];

  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;

    const hasHook = /useTranslations?\(/.test(content);
    const hasPropT = /t\s*:\s*(any|Function|i18n)/.test(content) || /,\s*t\s*,/.test(content);

    if (hasHook) directUsage++;
    if (hasPropT) propDrilling++;

    if (hasHook && examples.length < 3) {
      examples.push(path.basename(file));
    }
  }

  const total = directUsage + propDrilling;
  if (total === 0) {
    return {
      primary: 'unknown',
      subComponents: 'unknown',
      confidence: 'low',
      stats: { direct: 0, propDrilling: 0 },
    };
  }

  const primary = directUsage > propDrilling ? 'direct' : 'prop-drilling';
  const confidence = Math.max(directUsage, propDrilling) / total >= 0.7 ? 'high' : 'medium';

  return {
    primary,
    subComponents: propDrilling > 0 ? 'prop-drilling' : 'direct',
    confidence,
    stats: { direct: directUsage, propDrilling },
    examples,
  };
}

function detectStorage() {
  // Check for local translation files
  const localFiles = findTranslationFiles();

  // Check for remote config
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

  // Check package.json for sync scripts
  const packageJson = readFileSafe('package.json');
  let hasSyncScripts = false;
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const scripts = Object.values(pkg.scripts || {}).join(' ');
      hasSyncScripts = /upload|sync|push.*i18n|push.*locale/i.test(scripts);
    } catch {}
  }

  const type = remoteProvider ? 'remote' : localFiles.length > 0 ? 'local' : 'unknown';
  const confidence = type !== 'unknown' ? 'high' : 'low';

  return {
    type,
    provider: remoteProvider,
    localFiles: localFiles.length > 0,
    workflow: remoteProvider ? 'generate-json → user-uploads' : 'direct-file-edit',
    confidence,
  };
}

function detectSubComponents(filesToAnalyze) {
  let propDrilling = 0;
  let directHook = 0;
  const examples = [];

  for (const file of filesToAnalyze) {
    const content = readFileSafe(file);
    if (!content) continue;

    // Check if file is a sub-component (in components folder, not pages)
    const isSubComponent = /components\//.test(file) && !/pages\//.test(file);
    if (!isSubComponent) continue;

    const hasPropT = /t\s*:\s*(any|Function|i18n)/.test(content) || /,\s*t\s*,/.test(content);
    const hasDirectHook = /useTranslations?\(/.test(content) && !hasPropT;

    if (hasPropT) {
      propDrilling++;
      if (examples.length < 3) examples.push(path.basename(file));
    }
    if (hasDirectHook) directHook++;
  }

  const total = propDrilling + directHook;
  if (total === 0) {
    return {
      pattern: 'unknown',
      rule: 'unknown',
      confidence: 'low',
    };
  }

  const pattern = propDrilling > directHook ? 'prop-drilling' : 'direct';
  const rule = pattern === 'prop-drilling' 
    ? 'sub-components receive t as prop' 
    : 'sub-components call useTranslations directly';
  const confidence = Math.max(propDrilling, directHook) / total >= 0.7 ? 'high' : 'medium';

  return {
    pattern,
    rule,
    confidence,
    stats: { propDrilling, directHook },
    examples,
  };
}

function detectSchemas(filesToAnalyze) {
  let zodDetected = false;
  let factoryPattern = 0;
  let inlinePattern = 0;
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
          if (examples.length < 3) {
            const match = content.match(/export const (\w+Schema)/);
            examples.push(match ? match[1] : path.basename(file));
          }
        } else {
          inlinePattern++;
        }
      }
    }
  }

  if (!zodDetected) {
    return { detected: false, confidence: 'high' };
  }

  const pattern = factoryPattern > inlinePattern ? 'factory-function' : 'inline';
  const confidence = Math.max(factoryPattern, inlinePattern) > 0 ? 'high' : 'medium';

  return {
    detected: true,
    library: 'zod',
    pattern,
    confidence,
    examples,
  };
}

function detectKeyNaming(filesToAnalyze) {
  // Find translation files
  const translationFiles = findTranslationFiles();

  if (translationFiles.length === 0) {
    return { casing: 'unknown', confidence: 'low' };
  }

  const allKeys = [];
  for (const file of translationFiles.slice(0, 3)) {
    const content = readFileSafe(file);
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      const keys = flattenKeys(parsed);
      allKeys.push(...keys);
    } catch {}
  }

  if (allKeys.length === 0) {
    return { casing: 'unknown', confidence: 'low' };
  }

  // Analyze leaf keys
  const leafKeys = allKeys.map(k => {
    const parts = k.includes('.') ? k.split('.') : k.includes(':') ? k.split(':') : k.split('_');
    return parts[parts.length - 1];
  });

  const casings = leafKeys.map(detectCasing);
  const casingCounts = casings.reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  const primaryCasing = Object.entries(casingCounts).sort((a, b) => b[1] - a[1])[0][0];
  const matchRate = (casingCounts[primaryCasing] || 0) / leafKeys.length;
  const confidence = matchRate >= 0.8 ? 'high' : matchRate >= 0.6 ? 'medium' : 'low';

  return {
    casing: primaryCasing,
    confidence,
    stats: casingCounts,
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  // Find files with i18n usage using Node.js native methods
  const i18nPattern = /useTranslations?\(|useTranslation\(|\$t\(|formatMessage/;
  const i18nFiles = findFilesRecursive('.', i18nPattern);
  
  // Limit to specified count
  const filesToAnalyze = i18nFiles.slice(0, options.files);

  if (filesToAnalyze.length === 0) {
    console.error('No files with i18n usage found.');
    process.exit(1);
  }

  console.error(`Analyzing ${filesToAnalyze.length} files...`);

  // Run detections
  const conventions = {
    namespace: detectNamespace(filesToAnalyze),
    hookUsage: detectHookUsage(filesToAnalyze),
    storage: detectStorage(),
    subComponents: detectSubComponents(filesToAnalyze),
    schemas: detectSchemas(filesToAnalyze),
    keyNaming: detectKeyNaming(filesToAnalyze),
  };

  const result = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    filesAnalyzed: filesToAnalyze.length,
    conventions,
    warnings: [],
  };

  // Add warnings
  if (filesToAnalyze.length < 10) {
    result.warnings.push(`Only ${filesToAnalyze.length} files analyzed — increase sample for higher confidence`);
  }

  // Output
  let output;
  if (options.verbose) {
    output = formatMarkdown(result);
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

function formatMarkdown(result) {
  const lines = ['# Convention Detection Report', ''];

  // Namespace
  const ns = result.conventions.namespace;
  lines.push('## Namespace Pattern');
  lines.push(`- Pattern: ${ns.pattern}`);
  lines.push(`- Separator: ${ns.separator} (${ns.separator === 'dot' ? '.' : ns.separator === 'colon' ? ':' : ns.separator === 'slash' ? '/' : '_'})`);
  lines.push(`- Depth: ${ns.depth} levels`);
  lines.push(`- Casing: ${ns.casing}`);
  lines.push(`- Confidence: ${ns.confidence}`);
  if (ns.examples.length > 0) {
    lines.push(`- Examples: ${ns.examples.join(', ')}`);
  }
  lines.push('');

  // Hook Usage
  const hook = result.conventions.hookUsage;
  lines.push('## Hook Usage');
  lines.push(`- Primary: ${hook.primary === 'direct' ? 'Direct hook access' : 'Prop drilling'}`);
  lines.push(`- Sub-components: ${hook.subComponents}`);
  lines.push(`- Confidence: ${hook.confidence}`);
  if (hook.stats) {
    lines.push(`- Stats: ${hook.stats.direct} direct, ${hook.stats.propDrilling} prop drilling`);
  }
  lines.push('');

  // Storage
  const storage = result.conventions.storage;
  lines.push('## Storage');
  lines.push(`- Type: ${storage.type}${storage.provider ? ` (${storage.provider.toUpperCase()})` : ''}`);
  lines.push(`- Local files: ${storage.localFiles ? 'Yes' : 'No'}`);
  lines.push(`- Workflow: ${storage.workflow}`);
  lines.push(`- Confidence: ${storage.confidence}`);
  lines.push('');

  // Sub-Components
  const sub = result.conventions.subComponents;
  lines.push('## Sub-Component Pattern');
  lines.push(`- Pattern: ${sub.pattern}`);
  lines.push(`- Rule: ${sub.rule}`);
  lines.push(`- Confidence: ${sub.confidence}`);
  if (sub.examples && sub.examples.length > 0) {
    lines.push(`- Examples: ${sub.examples.join(', ')}`);
  }
  lines.push('');

  // Schemas
  const schema = result.conventions.schemas;
  lines.push('## Schema Integration');
  if (schema.detected) {
    lines.push(`- Library: ${schema.library}`);
    lines.push(`- Pattern: ${schema.pattern}`);
    lines.push(`- Confidence: ${schema.confidence}`);
    if (schema.examples && schema.examples.length > 0) {
      lines.push(`- Examples: ${schema.examples.join(', ')}`);
    }
  } else {
    lines.push('- Not detected');
  }
  lines.push('');

  // Key Naming
  const naming = result.conventions.keyNaming;
  lines.push('## Key Naming');
  lines.push(`- Casing: ${naming.casing}`);
  lines.push(`- Confidence: ${naming.confidence}`);
  if (naming.stats) {
    lines.push(`- Distribution: ${Object.entries(naming.stats).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  }
  lines.push('');

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('## Warnings');
    result.warnings.forEach(w => lines.push(`- ${w}`));
    lines.push('');
  }

  return lines.join('\n');
}

main();
