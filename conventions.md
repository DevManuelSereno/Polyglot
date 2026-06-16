# Project i18n Conventions

This file documents the i18n conventions detected in your project.

## Auto-Detection

Run the detection script to automatically analyze your codebase:

```bash
node ~/.claude/skills/polyglot/scripts/detect-conventions.js
```

Or from the skill directory:

```bash
node scripts/detect-conventions.js
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--files <count>` | Number of files to analyze | 10 |
| `--verbose` | Output human-readable markdown | JSON |
| `--output <file>` | Save output to file | stdout |
| `--help` | Show help message | - |

### Examples

```bash
# Default: JSON compact, 10 files
node scripts/detect-conventions.js

# Analyze 20 files with verbose output
node scripts/detect-conventions.js --files 20 --verbose

# Save to file for manual review
node scripts/detect-conventions.js --output .claude/.polyglot-conventions.json
```

---

## Manual Override

If the auto-detection is incorrect or you want to enforce specific conventions, edit this file.

The skill will read this file and prioritize these conventions over detected ones.

### Template

```markdown
# Project i18n Conventions (Manual Override)

## Namespace Pattern
- Pattern: Module.Component.key
- Separator: dot (.)
- Depth: 3 levels
- Casing: PascalCase.camelCase

## Hook Usage
- Primary: Direct hook access
- Sub-components: Prop drilling (t passed as prop)

## Storage
- Type: Remote (GCS)
- Local files: No
- Workflow: Generate JSON → user uploads to bucket

## Sub-Component Pattern
- Rule: Sub-components receive t as prop
- Do NOT call useTranslations() in sub-components

## Schema Integration
- Library: Zod
- Pattern: Factory functions (createSchema(t))
- Example: `export const createOrgSchema = (t) => z.object({...})`

## Key Naming
- Casing: camelCase for leaf keys
- Examples: `saveButton`, `emailPlaceholder`, `errorMessage`
```

---

## What Gets Detected

### 1. Namespace Pattern
Analyzes existing `useTranslations('namespace')` calls and `t('key.path')` usage to determine:
- Separator (dot, colon, slash, underscore)
- Depth (how many levels)
- Casing (camelCase, PascalCase, snake_case, etc.)

### 2. Hook Usage
Checks how components access translations:
- Direct: Component calls `useTranslations()` directly
- Prop drilling: Component receives `t` as a prop

### 3. Storage Type
Detects where translation files live:
- Local: JSON/YAML files in `locales/`, `messages/`, etc.
- Remote: GCS, S3, Crowdin, Lokalise, Phrase, etc.

### 4. Sub-Component Pattern
Analyzes how sub-components handle translations:
- Prop drilling: Parent passes `t` to children
- Direct: Each component calls the hook independently

### 5. Schema Integration
Detects if schemas (Zod, Yup) use i18n:
- Factory functions: `createSchema(t)`
- Inline: Schema calls `t()` directly

### 6. Key Naming Casing
Analyzes leaf keys in translation files to determine casing convention.

---

## Confidence Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **High** | 80%+ of files match pattern | Safe to use automatically |
| **Medium** | 60-79% match | Review before using |
| **Low** | <60% match or insufficient data | Ask user for clarification |

**Note**: The skill ALWAYS asks for user validation before applying detected conventions, regardless of confidence level.

---

## Troubleshooting

### "No files with i18n usage found"
- Ensure your project has components that use i18n hooks
- Check if the script is running from the project root

### "Only X files analyzed"
- Increase the sample size: `--files 20`
- The warning indicates low confidence in detection

### Detected conventions are wrong
- Edit this file with manual overrides
- The skill will prioritize manual conventions over detected ones

### Script takes too long
- Reduce file count: `--files 5`
- Exclude large directories from analysis

---

## Integration with Polyglot Skill

The Polyglot skill uses these conventions in:

1. **Create mode**: Applies namespace pattern and key naming to new translation files
2. **Migrate mode**: Follows existing conventions when creating new keys
3. **Refactor mode**: Respects sub-component patterns when renaming namespaces

### Workflow

```
1. User runs: /polyglot migrate src/components/Settings.tsx
2. Skill runs: detect-conventions.js
3. Skill presents: Detected conventions + asks for validation
4. User confirms: Y / n / edit
5. Skill applies: Validated conventions to migration
```

---

## Examples by Project Type

### Next.js + next-intl + GCS Remote

```json
{
  "namespace": { "pattern": "Module.Component.key", "separator": "dot", "depth": 3 },
  "hookUsage": { "primary": "direct", "subComponents": "prop-drilling" },
  "storage": { "type": "remote", "provider": "gcs", "localFiles": false },
  "schemas": { "detected": true, "library": "zod", "pattern": "factory-function" }
}
```

### React + react-i18next + Local JSON

```json
{
  "namespace": { "pattern": "flat", "separator": "dot", "depth": 2 },
  "hookUsage": { "primary": "direct", "subComponents": "direct" },
  "storage": { "type": "local", "localFiles": true },
  "schemas": { "detected": false }
}
```

### Vue + vue-i18n + Local YAML

```json
{
  "namespace": { "pattern": "nested", "separator": "dot", "depth": 3 },
  "hookUsage": { "primary": "template-global", "subComponents": "template-global" },
  "storage": { "type": "local", "localFiles": true },
  "schemas": { "detected": false }
}
```
