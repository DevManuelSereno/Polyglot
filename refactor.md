# i18n Refactor Guide

Safe refactoring of i18n keys and namespaces with mandatory impact analysis.

## Philosophy

**Never refactor without understanding the blast radius.** A renamed key that breaks 10 components is worse than a poorly-named key that works. This mode prioritizes safety over speed.

## When to Use Refactor Mode

- Renaming a namespace (e.g., `bloqueio` → `block`)
- Consolidating duplicate keys across namespaces
- Migrating key conventions (e.g., flat → nested)
- Improving i18n architecture without breaking functionality

## When NOT to Use Refactor Mode

- Migrating hardcoded strings → use **Migrate** mode
- Creating i18n from scratch → use **Create** mode
- Changing component logic → out of scope
- Renaming non-i18n identifiers → out of scope

## Workflow: 4 Phases (All Mandatory)

### Phase 1: Impact Analysis

**Goal:** Understand exactly what will break before changing anything.

**Steps:**
1. Search for all usages of the target key/namespace across the entire codebase
2. Identify cross-module dependencies (shared components, hooks, utilities)
3. Calculate blast radius:
   - Files affected
   - Components affected
   - Risk level (Low/Medium/High)
4. Report findings with confidence levels

**Output format:**
```
## Impact Analysis

**Target**: `bloqueio.*` → `block.*`

**Found 47 usages across 12 files:**
- src/components/BlockedAccount.tsx (3 usages)
- src/components/BlockedCard.tsx (2 usages)
- src/shared/hooks/useBlockedStatus.ts (1 usage)
...

**Cross-module dependencies:**
- src/shared/hooks/useBlockedStatus.ts (imported by 5 other modules)

**Risk level:** MEDIUM (shared components affected)

**Confidence:** High (grep found all usages)
```

**Decision gate:** If risk is High, warn user and suggest manual approach. Require explicit confirmation to proceed.

### Phase 2: Preview

**Goal:** Show exact changes before applying them.

**Steps:**
1. Generate diff for each file that will change
2. List all translation keys that will be renamed
3. Show before/after for each change
4. Require explicit user confirmation

**Output format:**
```
## Preview

**Files to change (12 total):**

### src/components/BlockedAccount.tsx
```diff
- const t = useTranslations('bloqueio');
+ const t = useTranslations('block');

- <h1>{t('bloqueio.titulo')}</h1>
+ <h1>{t('block.titulo')}</h1>
```

### src/components/BlockedCard.tsx
...

**Translation keys to rename:**
- `bloqueio.titulo` → `block.titulo`
- `bloqueio.mensagem` → `block.mensagem`
...

**Apply these changes? [y/N]**
```

**Decision gate:** Do not proceed without explicit user confirmation.

### Phase 3: Apply

**Goal:** Make the changes safely.

**Steps:**
1. Rename namespace/keys in all component files
2. Update translation files (or output keys for remote bucket)
3. Preserve all other code unchanged
4. Do not touch unrelated lines

**Rules:**
- Only change i18n-related code (hooks, keys, namespaces)
- Do not refactor component logic
- Do not change imports unless directly related to i18n
- Do not modify business logic, validation, or API behavior

### Phase 4: Validate

**Goal:** Ensure nothing broke.

**Steps:**
1. Run `validate-keys.js` to check translation file consistency (includes orphaned reference detection)
2. Search for orphaned references (old key names still in code)
3. Report any issues found
4. If issues found, fix them or report to user

**Output format:**
```
## Validation

**Translation files:** ✓ valid (0 errors, 0 warnings)

**Orphaned references:** 0 found

**Status:** ✓ Refactor completed successfully
```

## Risk Levels

| Level | Criteria | Action |
|-------|----------|--------|
| **Low** | Only local components affected, no shared dependencies | Proceed with confirmation |
| **Medium** | Some shared components affected, but limited blast radius | Warn user, proceed with explicit confirmation |
| **High** | Core shared utilities/hooks affected, wide blast radius | Strongly warn, suggest manual approach or phased rollout |

## Examples

### Example 1: Rename Namespace (Low Risk)

**Scenario:** Rename `settings.form.*` to `config.form.*`

**Impact:** 3 files, all local components

**Action:** Proceed with confirmation

### Example 2: Rename Shared Hook Namespace (High Risk)

**Scenario:** Rename `auth.*` to `authentication.*`

**Impact:** 47 files, including shared `useAuth` hook used across the app

**Action:** Warn user, suggest manual phased approach

### Example 3: Consolidate Duplicate Keys (Medium Risk)

**Scenario:** Merge `profile.title` and `settings.title` into `common.title`

**Impact:** 8 files, some shared components

**Action:** Warn user, proceed with explicit confirmation

## Error Handling

| Scenario | Action |
|----------|--------|
| Impact analysis finds 0 usages | Abort — target key/namespace doesn't exist |
| User declines confirmation | Abort — no changes made |
| Validation finds orphaned references | Report to user, offer to fix |
| Translation files invalid after rename | Fix keys, re-validate |

## Good/Bad

**Good:**
- Run impact analysis before any change
- Show preview diff before applying
- Require explicit confirmation at each phase
- Validate after applying changes

**Bad:**
- Rename keys without checking usages
- Apply changes without showing diff
- Assume all usages are in the same module
- Skip validation after refactoring
