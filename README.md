# i18n-migrator

> Surgical i18n migration with minimal diffs for production codebases.

A Claude Code / opencode skill that turns hardcoded strings into i18n translation calls — and nothing else.

## Why Use This?

When you need to migrate hardcoded strings to i18n in an existing codebase, you want:

- **Minimal diffs** — only the strings change, nothing else
- **Consistency** — follow existing patterns, don't invent new ones
- **Safety** — validate translation files automatically
- **Speed** — auto-detect your stack, no manual configuration

This skill does exactly that. It's not a tutorial, not a setup guide, not a refactoring tool. It's a surgical instrument for i18n migration.

## Installation

### Claude Code

```bash
# Clone the repo
git clone https://github.com/DevManuelSereno/i18n-migrator.git

# Install as personal skill (available in all projects)
cp -r i18n-migrator ~/.claude/skills/i18n-migrator

# Or install in a specific project
cp -r i18n-migrator /path/to/project/.claude/skills/i18n-migrator
```

### opencode

```bash
cp -r i18n-migrator /path/to/project/.opencode/skills/i18n-migrator
```

### Requirements

- Node.js 18+ (for validation script)
- Claude Code 2.1.145+ or opencode with skill support

## Usage

### Basic Migration

```bash
# In your Claude Code session
/i18n-migrator src/components/Settings.tsx src/components/Profile.tsx
```

The first argument is the **target** (file to migrate), the second is the **reference** (already-migrated file to follow as pattern).

### Auto-Detect

If you don't provide a reference file, the skill will detect patterns from your project:

```bash
Add i18n to src/components/Settings.tsx
```

### Deep Analysis

If the skill can't detect your i18n setup automatically, invoke the analyzer:

```bash
/i18n-analyzer
```

This runs in an isolated agent and reports your full i18n configuration with confidence levels.

## What It Does

### Supported Libraries

| Library | Status |
|---------|--------|
| next-intl | ✓ |
| react-i18next | ✓ |
| i18next | ✓ |
| react-intl / FormatJS | ✓ |
| vue-i18n | ✓ |
| @angular/localize | ✓ |
| svelte-i18n | ✓ |
| lingui | ✓ |

### Supported Patterns

- **Simple strings** — labels, buttons, titles, placeholders
- **Interpolation** — `"Hello, {name}"` → `t('greeting', { name })`
- **Pluralization** — `count === 1 ? '1 item' : 'N items'` → `t('items', { count })`
- **Formatting** — dates, numbers, currencies via library utilities
- **Rich text** — `<Trans>Click <b>here</b></Trans>`
- **JSX contexts** — children, attributes, aria-labels, conditionals

### What It Does NOT Do

- Set up i18n from scratch
- Refactor existing i18n code
- Improve translations or wording
- Change component architecture
- Modify files outside scope

## Workflow

The skill follows a 7-phase workflow:

1. **Discover** — detect stack with confidence levels (High/Medium/Low)
2. **Analyze** — read reference + target + translation files
3. **Identify** — find hardcoded strings
4. **Migrate** — apply patterns (interpolation, pluralization, etc.)
5. **Update** — modify translation files or output keys
6. **Validate** — auto-run validation via hook
7. **Respond** — structured summary

### Confidence Levels

Every detection reports confidence:

- **High** — found imports + config + multiple examples
- **Medium** — found one signal or inferred from code
- **Low** — guessed from patterns, needs confirmation

If any detection is Low confidence, the skill asks before proceeding.

## Example

### Before

```tsx
// src/components/Settings.tsx
export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Configure your preferences</p>
      <button>Save</button>
    </div>
  );
}
```

### Command

```bash
/i18n-migrator src/components/Settings.tsx src/components/Profile.tsx
```

### After

```tsx
// src/components/Settings.tsx
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('settings');
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <p>{t('header.subtitle')}</p>
      <button>{t('actions.save')}</button>
    </div>
  );
}
```

### Output

```
Files changed:
- src/components/Settings.tsx

Changes:
- migrated 3 strings to t() calls
- added: [settings.header.title, settings.header.subtitle, settings.actions.save]
- namespace: settings

New keys to add:
  settings.header.title: "Settings" (en)
  settings.header.subtitle: "Configure your preferences" (en)
  settings.actions.save: "Save" (en)

Validation: ✓ passed
```

## Project Structure

```
i18n-migrator/
├── SKILL.md              # Core instructions (134 lines)
├── discovery.md          # Stack detection with confidence levels
├── patterns.md           # Interpolation, pluralization, formatting
├── examples.md           # Quick reference patterns
├── agents/
│   └── i18n-analyzer.md  # Auto-invoked when detection fails
├── scripts/
│   └── validate-keys.js  # Validates translation files (auto-run via hook)
├── README.md
└── LICENSE
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Detection fails | Auto-invoke `/i18n-analyzer` |
| Pattern unclear | Ask before proceeding |
| Validation fails | Fix errors, re-validate |
| Reference not provided | Detect from project files |
| Translation files missing | Ask user for storage method |

## Troubleshooting

### "No translation files found"

The skill looked in `locales/`, `messages/`, `i18n/`, `lang/`, `translations/`, `public/`. If your files are elsewhere, tell the skill:

```
Translation files are in src/i18n/locales/
```

### "Cannot detect i18n library"

Run the analyzer manually:

```bash
/i18n-analyzer
```

Or tell the skill directly:

```
We use react-i18next with JSON files in locales/
```

### Validation fails with "Missing keys"

The skill will automatically fix missing keys in translation files. If it can't, it will report which keys are missing and in which files.

### Large files (20+ strings)

The skill will propose batching by logical section (header, form, footer) and ask for scope confirmation before proceeding.

## Contributing

Contributions welcome! Areas where help is needed:

- Additional library examples (Solid, Qwik, etc.)
- More validation rules
- Translations of this README
- Feedback from real-world usage

### How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
