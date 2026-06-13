---
name: polyglot
description: >
  Internationalize your app. Creates i18n from scratch OR migrates hardcoded strings
  to translation calls. Use when setting up i18n for the first time, or when migrating
  existing strings across next-intl, react-i18next, vue-i18n, react-intl, i18next,
  angular, svelte, or lingui.
when_to_use: >
  "add i18n", "setup i18n", "internationalize", "localize", "migrate strings",
  "hardcoded text", "translate", "i18n this component", "add translation keys",
  "create i18n", "configure i18n"
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
paths:
  - "**/*.{tsx,jsx,vue,svelte,ts,js}"
  - "**/locales/**"
  - "**/messages/**"
  - "**/i18n/**"
hooks:
  PostToolUse:
    - matcher: "Edit|Write|MultiEdit"
      hooks:
        - type: command
          command: "node ${CLAUDE_SKILL_DIR}/scripts/validate-keys.js"
---

# Polyglot

Internationalize your app. Two modes:

- **Setup** — create i18n from scratch when your project has no i18n yet
- **Migrate** — surgically migrate hardcoded strings when i18n already exists

## Project Context

```!
echo "=== i18n Detection ==="
echo "Library:"
grep -rE "useTranslation|useTranslations|useIntl|\$t\(|formatMessage" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --include="*.vue" --include="*.svelte" -l 2>/dev/null | head -3 || echo "  Not found"
echo "Files:"
find locales messages i18n -name "*.json" -o -name "*.yaml" 2>/dev/null | head -5 || echo "  Not found"
```

## Arguments

- **$mode**: `setup` (create from scratch) or `migrate` (migrate existing strings). If omitted, auto-detect.
- **$target**: File(s) to migrate (only for migrate mode)

## Routing Logic

1. Run discovery → see [discovery.md](discovery.md)
2. If i18n detected → **Migrate mode**
3. If no i18n detected → **Setup mode**
4. If user explicitly passed mode → follow it

## Scope Rules

### Setup Mode
- Create i18n architecture (providers, config, translation files)
- Follow framework conventions
- Minimal scaffolding — no over-engineering

### Migrate Mode
- Do not modify files outside scope
- Do not create new architecture
- Do not refactor or modernize
- Do not alter business logic
- Do not touch unrelated lines

## Workflow

### Phase 1: Discover

Detect stack → see [discovery.md](discovery.md)

If detection fails or confidence is Low, invoke `/i18n-analyzer` automatically.

### Phase 2: Route

Based on detection:
- **Has i18n?** → Go to Migrate workflow
- **No i18n?** → Go to Setup workflow

### Phase 3A: Setup (if no i18n exists)

Follow [setup.md](setup.md):
1. Recommend library based on framework
2. Install dependencies
3. Create config files
4. Create translation file structure
5. Add provider/wrapper to app root
6. Create example translations

### Phase 3B: Migrate (if i18n exists)

Read reference (if provided) + target + translation files.

Extract: hook pattern, key convention, existing keys, reusable keys.

### Phase 4: Identify (Migrate only)

Find hardcoded strings: labels, placeholders, errors, aria-labels, tooltips, buttons.

Exclude: constants, logs, identifiers, CSS, data attributes.

### Phase 5: Apply Patterns (Migrate only)

Follow [patterns.md](patterns.md):
- Interpolation (never concatenate)
- Pluralization (delegate to library)
- Formatting (use library utilities)
- Rich text (use Trans or equivalent)

Make smallest change: replace strings, add hook/import if absent, preserve formatting.

### Phase 6: Update Translations

- **Local**: Update files directly
- **Remote**: Output keys for user to add

### Phase 7: Validate

Validation runs automatically via hook. If it fails:
1. Report errors to user
2. Fix any missing keys in translation files
3. Re-run validation before completing

### Phase 8: Respond

```
Mode: [setup|migrate]

Files changed:
- path/to/file.tsx

Changes:
- [setup] created i18n config with [library]
- [migrate] migrated N strings to t() calls
- reused: [key.one, key.two]
- added: [key.three]
- namespace: <ns>

New keys (if remote):
  key.three: "Text" (en)
  key.three: "Texto" (pt-br)

Validation: ✓ passed / ✗ failed (errors fixed)

Notes:
- <decisions only>
```

## Key Strategy (Migrate mode)

1. Check reference for equivalent keys
2. Check target (may be partially migrated)
3. Reuse when semantically equivalent

**Good**: `profile.header.title`, `profile:header.title`, `profile_header_title`
**Bad**: `title`, `headerText`, `page.content.section.label.text`

## Large Files (20+ strings)

Propose batching by section. Ask for scope. Process one batch at a time.

## Error Handling

| Scenario | Action |
|----------|--------|
| Detection fails | Auto-invoke `/i18n-analyzer` |
| Pattern unclear | Ask before proceeding |
| Validation fails | Fix errors, re-validate |
| Reference not provided | Detect from project files |
| Translation files missing | Ask user for storage method |

## Resources

- [discovery.md](discovery.md) — Stack detection with confidence levels
- [setup.md](setup.md) — Scaffolding for each library
- [patterns.md](patterns.md) — Interpolation, pluralization, formatting
- [examples.md](examples.md) — Quick reference patterns
