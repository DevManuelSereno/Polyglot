# Discovery Protocol

Detect the project's i18n stack and determine the appropriate mode.

## Detection Levels

### Level 1: Fast Scan (~1s)

Quick detection of basic stack information:

1. **Detect i18n Library** — search for imports and config files
2. **Detect Translation Storage** — local files vs remote config
3. **Detect Locales** — from config or file names

**Output**: Library, storage type, available locales

### Level 2: Convention Detection (~3s)

Deep analysis of existing patterns using `detect-conventions.js`:

1. **Namespace Pattern** — separator, depth, casing
2. **Hook Usage** — direct vs prop drilling
3. **Sub-Component Pattern** — how children access translations
4. **Schema Integration** — Zod/Yup factory functions
5. **Key Naming** — camelCase, snake_case, etc.

**Output**: JSON compact or markdown verbose

### Level 3: User Overrides

Load manual conventions from `.claude/polyglot-conventions.md` if exists.

**Priority**: User overrides > Detected conventions > Defaults

---

## Level 1: Fast Scan

### 1. Detect i18n Library

Search for imports and config files:

| Library | Signals | Confidence |
|---------|---------|------------|
| next-intl | `import { useTranslations } from 'next-intl'`, `next-intl.config.*` | High |
| react-i18next | `import { useTranslation } from 'react-i18next'`, `i18next.config.*` | High |
| i18next | `import i18n from 'i18next'`, `i18next.config.*` | High |
| react-intl / FormatJS | `import { useIntl, FormattedMessage } from 'react-intl'` | High |
| vue-i18n | `import { useI18n } from 'vue-i18n'`, `$t()` in templates | High |
| @angular/localize | `$localize`, `ng extract-i18n`, `angular.json` i18n config | High |
| svelte-i18n | `import { _ } from 'svelte-i18n'`, `$_()` in templates | High |
| lingui | `import { t } from '@lingui/macro'`, `lingui.config.*` | High |

**Fallback**: If no library detected, ask user which i18n system to use (for Create mode).

### 2. Detect Translation Storage

Search for translation files:

- **Local files**: glob for `**/*.json`, `**/*.yaml`, `**/*.yml`, `**/*.po`, `**/*.properties` inside `locales`, `messages`, `i18n`, `lang`, `translations`, `public`
- **Config files**: `i18n.config.*`, `i18next.config.*`, `next-intl.config.*`, `lingui.config.*`
- **CMS/remote**: if no local files found, ask user

**Confidence**: High if files found, Low if only config found, None if nothing found

### 3. Detect Locales

From config files or translation file names: `en`, `en-US`, `pt-BR`, etc.

**Confidence**: High if config found, Medium if file names only

---

## Level 2: Convention Detection

Run `detect-conventions.js` to analyze 10 files (default) with existing i18n usage.

```bash
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js
```

### What Gets Detected

1. **Namespace Pattern**
   - Separator: dot (`.`), colon (`:`), slash (`/`), underscore (`_`)
   - Depth: 1 (flat), 2 (namespace.key), 3+ (Module.Component.key)
   - Casing: camelCase, PascalCase, snake_case, kebab-case

2. **Hook Usage**
   - Direct: Components call `useTranslations()` directly
   - Prop drilling: Components receive `t` as prop

3. **Sub-Component Pattern**
   - How child components access translations
   - Critical for avoiding runtime errors

4. **Schema Integration**
   - Zod/Yup factory functions: `createSchema(t)`
   - Inline usage: schema calls `t()` directly

5. **Key Naming**
   - Casing convention for leaf keys
   - Ensures consistency across new keys

### Output Format

**JSON (default):**
```json
{
  "namespace": { "pattern": "Module.Component.key", "confidence": "high" },
  "hookUsage": { "primary": "direct", "subComponents": "prop-drilling" },
  "storage": { "type": "remote", "provider": "gcs" },
  "schemas": { "detected": true, "pattern": "factory-function" }
}
```

**Markdown (with --verbose):**
```markdown
## Namespace Pattern
- Pattern: Module.Component.key
- Confidence: High
- Examples: OrganizationFlow.NewOrgChoice, OrganizationFlow.ReviewStep
```

### Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| **High** | 80%+ files match | Safe to use |
| **Medium** | 60-79% match | Review with user |
| **Low** | <60% or <5 samples | Ask user for clarification |

**Important**: ALWAYS present detected conventions to user for validation, regardless of confidence level.

---

## Level 3: User Overrides

Check for `.claude/polyglot-conventions.md` in project root.

If exists:
- Read manual conventions
- Merge with detected conventions
- User overrides take priority

If not exists:
- Use detected conventions
- Offer to create override file for future use

---

## Routing Decision

After detection, determine the mode:

| Condition | Mode | Action |
|-----------|------|--------|
| No i18n detected | **Create** | Follow create workflow |
| i18n detected + user wants migrate strings | **Migrate** | Follow migrate workflow |
| i18n detected + user wants rename/refactor keys | **Refactor** | Follow refactor workflow |
| i18n detected + mode unclear | **Ask** | Clarify user intent |

---

## Error Handling

If any detection step fails:
1. Report what was detected with confidence levels
2. Ask user for missing information
3. Do not proceed with Low confidence detections without user approval

---

## Output Format

```
## Detection Results

**Mode**: [create|migrate|refactor]
**Library**: [name] (confidence: High/Medium/Low)
**Storage**: [local/remote/hybrid] (confidence: High/Medium/Low)

**Detected Conventions**:
- Namespace: [pattern] (confidence: High/Medium/Low)
- Hook Usage: [pattern] (confidence: High/Medium/Low)
- Sub-Components: [pattern] (confidence: High/Medium/Low)
- Schemas: [detected/not detected] (confidence: High/Medium/Low)
- Key Naming: [casing] (confidence: High/Medium/Low)

**User Overrides**: [loaded from file / none]

**Validation Required**: Do these conventions match your project? [Y/n/edit]
```
