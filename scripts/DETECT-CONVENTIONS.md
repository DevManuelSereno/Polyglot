# detect-conventions.js

CLI tool for auto-detecting i18n conventions in your project.

## Usage

```bash
# Quick mode: Fast stack detection (~200 tokens, ~100ms)
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js --quick

# Deep mode: Full convention analysis (~2k tokens, ~1s)
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js

# Deep mode with verbose markdown output
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js --verbose

# Analyze 20 files instead of default 10
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js --files 20

# Save output to file
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js --output .claude/.polyglot-conventions.json
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--quick` | Fast stack detection only | false |
| `--files <count>` | Number of files to analyze | 10 |
| `--verbose` | Output human-readable markdown | JSON |
| `--output <file>` | Save output to file | stdout |
| `--help` | Show help message | - |

## Detection Modes

### Quick Mode

Runs automatically when the skill loads. Detects:
- i18n library in use
- Storage type (local/remote)
- Translation files location
- Available locales

Output: ~200 tokens

### Deep Mode

Runs during Phase 1, Step 2. Additionally detects:
- Namespace pattern (separator, depth, casing)
- Hook usage (direct vs prop drilling)
- Sub-component pattern
- Schema integration (Zod factory functions)
- Key naming casing

Output: ~2k tokens

## Installation Paths

The script works in both installation scenarios:

| Installation | Path | Variable |
|-------------|------|----------|
| **Global** (all projects) | `~/.claude/skills/polyglot/` | `${CLAUDE_SKILL_DIR}` → `~/.claude/skills/polyglot` |
| **Project** (single project) | `.claude/skills/polyglot/` | `${CLAUDE_SKILL_DIR}` → `.claude/skills/polyglot` |

The `${CLAUDE_SKILL_DIR}` variable is automatically resolved by Claude Code.

## Manual Execution

```bash
# Navigate to skill directory
cd ~/.claude/skills/polyglot  # or .claude/skills/polyglot for project-level

# Quick mode
node scripts/detect-conventions.js --quick

# Deep mode with verbose output
node scripts/detect-conventions.js --verbose

# Analyze 20 files
node scripts/detect-conventions.js --files 20
```

## Troubleshooting

### "No files with i18n usage found"
- Ensure your project has components that use i18n hooks
- Check if the script is running from the project root
- Try increasing the file count: `--files 20`

### "Only X files analyzed"
- Increase the sample size: `--files 20`
- The warning indicates low confidence in detection

### Path Issues

**Problem:** The script can't find `${CLAUDE_SKILL_DIR}`

**Solution 1:** Run via Claude Code (automatic)
```bash
/polyglot migrate src/components/Settings.tsx
```

**Solution 2:** Navigate to skill directory manually
```bash
# For global installation
cd ~/.claude/skills/polyglot
node scripts/detect-conventions.js

# For project installation
cd .claude/skills/polyglot
node scripts/detect-conventions.js
```

**Solution 3:** Set environment variable manually
```bash
export CLAUDE_SKILL_DIR=~/.claude/skills/polyglot
node ${CLAUDE_SKILL_DIR}/scripts/detect-conventions.js
```
