---
name: polyglot
version: 1.5.0
description: >
  One skill for the entire i18n journey. Creates i18n from scratch, migrates
  hardcoded strings to translation calls, refactors existing i18n keys
  with impact analysis, AND translates content to multiple locales.
  Use when creating i18n, migrating strings, renaming keys/namespaces, or
  translating locale files across next-intl, react-i18next, vue-i18n,
  react-intl, i18next, angular, svelte, or lingui. Does NOT change
  component architecture or refactor non-i18n code.
when_to_use: >
  "add i18n", "create i18n", "setup i18n", "internationalize", "localize",
  "migrate strings", "hardcoded text", "translate", "i18n this component",
  "add translation keys", "configure i18n", "rename i18n keys", "refactor i18n",
  "change namespace", "rename namespace"
argument-hint: "[mode] [target]"
arguments:
  - mode
  - target
allowed-tools:
  - Read
  - Grep
  - Glob
  - Edit
  - Write
  - Bash(node *)
  - Bash(python *)
paths:
  - "**/*.{tsx,jsx,vue,svelte,ts,js}"
  - "**/locales/**"
  - "**/messages/**"
  - "**/i18n/**"
hooks:
  Stop:
    - hooks:
        - type: command
          command: "node ${CLAUDE_SKILL_DIR:-.claude/skills/polyglot}/scripts/validate-keys.js"
---

# Polyglot

One skill for the entire i18n journey. Four modes:

- **Create** — create i18n from scratch when your project has none
- **Migrate** — surgically migrate hardcoded strings when i18n exists
- **Refactor** — rename keys/namespaces safely with impact analysis
- **Translate** — generate translations for all locales from a source file

## Project Context

```!
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js --quick
```

## Arguments

- **$mode**: `create`, `migrate`, `refactor`, or `translate`. Auto-detected if omitted.
- **$target**: File(s) to process (migrate/refactor mode)

## Routing

1. Run discovery → [discovery.md](discovery.md)
2. No i18n → **Create**
3. i18n exists + user wants migrate → **Migrate**
4. i18n exists + user wants rename/refactor → **Refactor**
5. i18n exists + user wants translations → **Translate**
6. User passed explicit mode → follow it

## Scope Rules

### Create
- Create i18n architecture (providers, config, translation files)
- Follow framework conventions
- Minimal scaffolding — no over-engineering

### Migrate
- Do not modify files outside scope
- Do not create new architecture
- Do not refactor or modernize
- Do not alter business logic
- Do not touch unrelated lines

### Refactor
- **Impact analysis is mandatory** before any change
- **Explicit confirmation** required at each phase (analyze → preview → apply → validate)
- Only rename keys/namespaces — do not change component logic
- Report all cross-module dependencies

### Translate
- Always preserve `{interpolation}` variables from source
- Mark machine translations as draft unless user confirms otherwise
- Use `--validate` to check consistency after translation
- Prefer free backends (Google) unless user requests higher quality

## Workflow

### Phase 1: Discover

**Step 1: Check for conventions file**
- Look for `.claude/polyglot-conventions.md` in project root
- If exists AND contains `skip-discovery: true`:
  - Load all conventions from file
  - **Skip Steps 2-5 entirely**
  - Go directly to Phase 2 (Route)
- If not exists OR `skip-discovery: false`:
  - Proceed to Step 2

**Step 2: Fast Scan** (only if no skip)
- Run `node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js --quick`
- Output: library, storage, locales (~200 tokens)

**Step 3: Convention Detection** (only if no skip)
- Run `node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js` (deep mode)
- Analyze 10 files for patterns (~2k tokens)

**Step 4: Load User Overrides** (only if no skip)
- Read `.claude/polyglot-conventions.md` if exists
- Merge with detected conventions (user overrides take priority)

**Step 5: Present to User** (only if no skip)
- Show detected conventions
- Ask: "Do these conventions match your project? [Y/n/edit]"
- If user confirms: proceed to Phase 2
- If user edits: update conventions, proceed to Phase 2
- Offer to save `.claude/polyglot-conventions.md` for future sessions

Low confidence → invoke `/i18n-analyzer`.

### Phase 2: Route

- **No i18n?** → Create
- **Migrate strings?** → Migrate
- **Rename keys/namespaces?** → Refactor
- **Generate translations?** → Translate

### Phase 3A: Create

Follow [create.md](create.md):
1. Recommend library based on framework
2. Install dependencies
3. Create config + translation files
4. Add provider to app root
5. Create example component

### Phase 3B: Migrate

Read reference + target + translation files. Extract: hook pattern, key convention, reusable keys.

### Phase 3C: Refactor

Follow [refactor.md](refactor.md):
1. **Impact Analysis** — find all usages, cross-module dependencies, blast radius
2. **Preview** — show exact diff, list all files to change
3. **Apply** — rename in all components + translation files
4. **Validate** — check for orphaned references, run validation

### Phase 3D: Translate

1. Detect source locale and translation file structure
2. Ask user for target locales (if not specified)
3. Ask user for backend preference (google/deepl/chatgpt)
4. Run `python ${CLAUDE_SKILL_DIR}/scripts/translate.py --source <locale> --targets <locales> --dir <dir> --validate`
5. Review output, fix any issues

### Phase 4: Identify (Migrate only)

Find: labels, placeholders, errors, aria-labels, tooltips, buttons.
Exclude: constants, logs, identifiers, CSS, data attributes.

### Phase 5: Apply Patterns (Migrate only)

Follow [patterns.md](patterns.md): interpolation, pluralization, formatting, rich text.
Smallest change only: replace strings, add hook/import if absent.

### Phase 6: Update Translations (All modes except Create)

- **Local**: Run `python ${CLAUDE_SKILL_DIR}/scripts/translate.py --source <locale> --targets <locales> --dir <dir> --validate`
  - Supports backends: `google` (free, default), `deepl` (API key), `chatgpt` (API key)
  - Preserves `{variables}` in translations automatically
  - Use `--draft` to mark output for review
  - Use `--dry-run` to preview without writing files
- **Remote**: Output keys for user to upload to TMS

### Phase 7: Validate

Auto-runs via Stop hook. Fix errors → re-validate.

### Phase 8: Respond

```
Mode: [create|migrate|refactor|translate]

Files changed:
- path/to/file.tsx

Changes:
- [create] created i18n config with [library]
- [migrate] migrated N strings
- [refactor] renamed X keys across Y files
- [translate] translated N keys to M locales using [backend]

Validation: ✓ passed / ✗ failed (see errors above)

Notes:
- <decisions only>
```

## Key Strategy (Migrate)

1. Check reference for equivalent keys
2. Check target (may be partially migrated)
3. Reuse when semantically equivalent

**Good**: `profile.header.title`, `profile:header.title`
**Bad**: `title`, `headerText`, `page.content.section.label.text`

## Large Files (20+ strings, Migrate mode only)

Batch by section. Ask scope. One batch at a time.

## Error Handling

| Scenario | Action |
|----------|--------|
| Detection fails | Auto-invoke `/i18n-analyzer` |
| Pattern unclear | Ask before proceeding |
| Validation fails | Fix, re-validate |
| Refactor impact too high | Abort, suggest manual approach |
| Create: user disagrees with library choice | Respect user's choice |
| Refactor: 0 usages found | Abort — target doesn't exist |
| Translate: Python not installed | Guide user to install Python + `pip install deep-translator` |
| Translate: API key missing | Ask user for API key or suggest free backend |
| Translate: variables lost | Auto-restore `{variables}` from source |

## Translation Tool

Polyglot includes a Python translation tool (`scripts/translate.py`) that generates translations for all locales from a source file.

See [scripts/translate.py](scripts/translate.py) for full documentation, or run:
```bash
uv run ${CLAUDE_SKILL_DIR}/scripts/translate.py --help
```

### Quick Start

```bash
# Install uv if you don't have it (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Run with uv (auto-installs Python + dependencies)
uv run ${CLAUDE_SKILL_DIR}/scripts/translate.py --source pt --targets en,es

# Or with pip
pip install -r ${CLAUDE_SKILL_DIR}/scripts/requirements.txt
python ${CLAUDE_SKILL_DIR}/scripts/translate.py --source pt --targets en,es
```

### Backends

| Backend | Quality | Cost | API Key |
|---------|---------|------|---------|
| `google` | Good | Free | Not required |
| `deepl` | Excellent | Free tier (500k chars/mo) | `DEEPL_API_KEY` |
| `chatgpt` | Best (context-aware) | Paid | `OPENAI_API_KEY` |

### Features

- Preserves `{interpolation}` variables across translations
- Batch translation for performance
- Draft marking for review workflows (`--draft`)
- Auto-validates with `validate-keys.js` (`--validate`)
- Nested JSON structure preservation
- Dry-run mode (`--dry-run`)

## Resources

- [discovery.md](discovery.md) — Detection + routing
- [conventions.md](conventions.md) — Auto-detection + manual override
- [create.md](create.md) — Scaffolding per library
- [refactor.md](refactor.md) — Safe refactoring with impact analysis
- [patterns.md](patterns.md) — Interpolation, pluralization, Good/Bad
- [examples.md](examples.md) — Before/after for every library
- [agents/i18n-analyzer.md](agents/i18n-analyzer.md) — Deep analysis subagent
- [scripts/translate.py](scripts/translate.py) — Translation tool (multi-backend)
- [scripts/validate-keys.js](scripts/validate-keys.js) — Key validation
- [scripts/detect-conventions.js](scripts/detect-conventions.js) — Convention detection
