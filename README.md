# Polyglot

> One skill for the entire i18n journey — from zero to fully localized.

**Before:**
```tsx
// src/components/Settings.tsx — 47 hardcoded strings, 0 i18n
export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Configure your preferences</p>
      <label>Language</label>
      <button>Save changes</button>
    </div>
  );
}
```

**After `/polyglot`:**
```tsx
// src/components/Settings.tsx — 0 hardcoded strings, fully localized
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('settings');
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <p>{t('header.subtitle')}</p>
      <label>{t('form.languageLabel')}</label>
      <button>{t('form.saveButton')}</button>
    </div>
  );
}
```

**Diff: 4 lines changed. Zero architecture touched. Zero refactors.**

---

Polyglot is a Claude Code / opencode skill that handles the full i18n lifecycle:

- **No i18n yet?** → Creates it from scratch (library, config, provider, translation files)
- **i18n exists?** → Surgically migrates hardcoded strings with minimal diffs
- **Need to rename keys?** → Safely refactors with impact analysis and validation

It auto-detects your project's state and routes to the right workflow. No manual configuration needed.

## Install

```bash
git clone https://github.com/DevManuelSereno/Polyglot.git
cp -r Polyglot ~/.claude/skills/polyglot
```

> **Note:** The repository was originally named `i18n-migrator` but was renamed to `polyglot` to reflect the skill's broader scope (create, migrate, refactor).

Works with Claude Code, opencode, and any Agent Skills-compatible tool.

## Use

```bash
# Auto-detect (recommended)
/polyglot

# Force a mode
/polyglot create
/polyglot migrate src/Settings.tsx src/Profile.tsx
/polyglot refactor bloqueio block
```

Or just ask naturally: *"Add i18n to my app"*, *"Migrate strings in Settings.tsx"*, or *"Rename bloqueio namespace to block"*

## What it does

### Create mode (no i18n yet)
- Recommends library based on your framework
- Installs dependencies
- Creates config, translation files, provider
- Adds example component

### Migrate mode (i18n exists)
- Finds hardcoded strings (labels, placeholders, aria-labels, tooltips, buttons)
- Replaces with `t()` calls following existing patterns
- Updates translation files or outputs keys for remote storage
- Validates automatically

### Refactor mode (rename keys/namespaces)
- Analyzes impact across entire codebase
- Shows blast radius and cross-module dependencies
- Requires explicit confirmation before applying
- Renames keys/namespaces safely
- Validates for orphaned references

## What it does NOT do

- Translate your content (use Lokalise, Crowdin, DeepL)
- Change component architecture or business logic
- Modify files outside the requested scope
- Set up translation management workflows
- Refactor non-i18n code (only renames i18n keys/namespaces)

## Supported libraries

| Library | Framework |
|---------|-----------|
| next-intl | Next.js App Router |
| react-i18next | React |
| i18next | Universal |
| react-intl | React |
| vue-i18n | Vue |
| @angular/localize | Angular |
| svelte-i18n | Svelte |
| lingui | React/Universal |

## How it works

1. **Discover** — detects your i18n stack with confidence levels (High/Medium/Low)
2. **Route** — no i18n? → Create. Migrate strings? → Migrate. Rename keys? → Refactor.
3. **Execute** — follows the appropriate workflow (create/migrate/refactor)
4. **Validate** — auto-runs validation at end of turn (checks missing keys, orphaned references, variable consistency)
5. **Respond** — structured summary with files changed, keys added/renamed, validation status

## Before/after examples

See [examples.md](examples.md) for concrete patterns across all libraries.

## Project structure

```
polyglot/
├── SKILL.md              # Core routing + workflow (193 lines)
├── discovery.md          # Stack detection with confidence levels
├── create.md             # Opinionated scaffolding per library
├── refactor.md           # Safe refactoring with impact analysis
├── patterns.md           # Interpolation, pluralization, formatting + Bom/Ruim
├── examples.md           # Before/after for every library
├── agents/
│   └── i18n-analyzer.md  # Deep analysis subagent
├── scripts/
│   └── validate-keys.js  # Auto-validates translation files
├── README.md
└── LICENSE
```

## Error handling

| Scenario | Action |
|----------|--------|
| Detection fails | Auto-invokes `/i18n-analyzer` subagent |
| Pattern unclear | Asks before proceeding |
| Validation fails | Fixes errors, re-validates |
| Refactor impact too high | Warns user, suggests manual approach |
| No i18n + user wants migrate | Suggests create first |
| Translation files missing | Asks for storage method |

## Confidence levels

Every detection reports confidence:
- **High** — imports + config + multiple examples found
- **Medium** — one signal or inferred from code
- **Low** — pattern guessed, needs confirmation

Low confidence → asks before proceeding. No bluffing.

## Portability

Built on the [Agent Skills](https://agentskills.io) open standard. Works with:
- Claude Code
- opencode
- Codex CLI
- Cursor
- Gemini CLI
- Copilot

No tool-specific dependencies. The validation script is plain Node.js.

## Troubleshooting

**"No translation files found"** — Tell the skill where they are: *"Translation files are in src/i18n/locales/"*

**"Cannot detect i18n library"** — Run `/i18n-analyzer` or tell the skill: *"We use react-i18next with JSON files in locales/"*

**Validation fails** — The skill auto-fixes missing keys. If it can't, it reports exactly which keys are missing in which files.

**Large files (20+ strings)** — Proposes batching by section, asks for scope confirmation.

## Contributing

Fork → branch → change → PR. Areas that need help:
- More library examples (Solid, Qwik, Astro)
- Additional validation rules
- README translations
- Real-world usage feedback

## License

MIT
