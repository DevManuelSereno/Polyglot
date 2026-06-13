# Polyglot

> Internationalize your app. Create i18n from scratch or migrate hardcoded strings.

A Claude Code / opencode skill that handles the full i18n lifecycle — from initial setup to surgical string migration.

## Why Use This?

When you need to internationalize your app, you face two scenarios:

1. **No i18n yet** — You need to set it up from scratch
2. **i18n exists** — You need to migrate hardcoded strings

Polyglot handles both. It detects your project's state and routes to the appropriate workflow.

## Features

- **Auto-detects** whether you need setup or migration
- **Setup mode** — creates i18n from scratch with best practices
- **Migrate mode** — surgical string migration with minimal diffs
- **8+ libraries** — next-intl, react-i18next, vue-i18n, react-intl, i18next, angular, svelte, lingui
- **Auto-validation** — hooks validate translation files automatically
- **Confidence-based detection** — reports certainty levels for every detection

## Installation

```bash
# Clone the repo
git clone https://github.com/DevManuelSereno/polyglot.git

# Claude Code (personal)
cp -r polyglot ~/.claude/skills/polyglot

# Claude Code (project)
cp -r polyglot /path/to/project/.claude/skills/polyglot

# opencode
cp -r polyglot /path/to/project/.opencode/skills/polyglot
```

## Usage

### Auto-Detect Mode

Let Polyglot decide whether to setup or migrate:

```bash
/polyglot
```

### Explicit Mode

Force a specific mode:

```bash
# Setup i18n from scratch
/polyglot setup

# Migrate strings in a specific file
/polyglot migrate src/components/Settings.tsx

# Migrate with reference file
/polyglot migrate src/components/Settings.tsx src/components/Profile.tsx
```

### Auto-Invoke

Claude will invoke Polyglot automatically when you ask:

```
Add i18n to my app
Setup internationalization
Migrate strings in src/components/Settings.tsx
```

## Workflow

### Phase 1: Discover

Detect your project's i18n state with confidence levels.

### Phase 2: Route

- **Has i18n?** → Migrate mode
- **No i18n?** → Setup mode

### Phase 3A: Setup (if no i18n)

1. Recommend library based on framework
2. Install dependencies
3. Create config files
4. Create translation file structure
5. Add provider to app root
6. Create example translations

### Phase 3B: Migrate (if i18n exists)

1. Read reference + target + translation files
2. Identify hardcoded strings
3. Apply patterns (interpolation, pluralization, etc.)
4. Update translation files
5. Validate

### Phase 4: Validate

Auto-run validation via hook. Fix any errors.

### Phase 5: Respond

Structured summary of changes.

## What It Handles

### Setup Mode

- Library recommendation based on framework
- Dependency installation
- Config file creation
- Translation file structure
- Provider/wrapper setup
- Example components

### Migrate Mode

- Simple strings (labels, buttons, titles)
- String interpolation (`"Hello, {name}"`)
- Pluralization (`"1 item"` / `"5 items"`)
- Date/number/currency formatting
- Rich text and inline components
- JSX contexts (children, attributes, aria-labels)
- Large modules (20+ strings — proposes batching)

## What It Does NOT Do

- Translate your content (use a translation service)
- Manage translation workflows (use Lokalise, Crowdin, etc.)
- Refactor existing i18n code (only migrates hardcoded strings)
- Change component architecture (minimal diffs only)

## Supported Libraries

| Library | Framework | Status |
|---------|-----------|--------|
| next-intl | Next.js (App Router) | ✓ |
| react-i18next | React | ✓ |
| i18next | Universal | ✓ |
| react-intl / FormatJS | React | ✓ |
| vue-i18n | Vue | ✓ |
| @angular/localize | Angular | ✓ |
| svelte-i18n | Svelte | ✓ |
| lingui | React/Universal | ✓ |

## Project Structure

```
polyglot/
├── SKILL.md              # Core instructions with routing logic
├── discovery.md          # Stack detection with confidence levels
├── setup.md              # Scaffolding guide for each library
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
| Reference missing | Detect from project files |
| No i18n + user wants migrate | Suggest setup first |

## Confidence Levels

Every detection reports confidence:

- **High** — found imports + config + multiple examples
- **Medium** — found one signal or inferred from code
- **Low** — guessed from patterns, needs confirmation

If any detection is Low confidence, the skill asks before proceeding.

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
