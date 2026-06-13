# i18n Examples

Before/after patterns for every library and common scenario.

## Library Setup Patterns

### next-intl
```tsx
import { useTranslations } from 'next-intl';
const t = useTranslations('namespace');
<h1>{t('key')}</h1>
```

### react-i18next
```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('namespace');
<h1>{t('key')}</h1>
```

### vue-i18n
```vue
<template>
  <h1>{{ $t('namespace.key') }}</h1>
</template>
```

### react-intl
```tsx
import { useIntl } from 'react-intl';
const intl = useIntl();
<h1>{intl.formatMessage({ id: 'namespace.key' })}</h1>
```

## Migration Patterns

### Simple String
```tsx
// Before
<button>Save changes</button>

// After
<button>{t('actions.save')}</button>

// Translation
{ "actions": { "save": "Save changes" } }
```

### Interpolation
```tsx
// Before — WRONG: concatenation breaks translation order
<p>Hello, {user.name}! Welcome back.</p>

// After — RIGHT: whole sentence is one key
<p>{t('greeting', { name: user.name })}</p>

// Translation
{ "greeting": "Hello, {name}! Welcome back." }
```

**Bom/Ruim:**
- **Ruim**: `t('hello') + user.name + t('welcome')` — translator can't reorder
- **Bom**: `t('greeting', { name })` — translator controls word order

### Pluralization
```tsx
// Before — WRONG: breaks for Arabic, Polish, Russian
<span>{count === 1 ? '1 item' : `${count} items`}</span>

// After — RIGHT: library handles all plural forms
<span>{t('items', { count })}</span>

// Translation (i18next)
{ "items_one": "{{count}} item", "items_other": "{{count}} items" }

// Translation (ICU)
{ "items": "{count, plural, one {# item} other {# items}}" }
```

**Bom/Ruim:**
- **Ruim**: `count === 1 ? t('one') : t('other')` — fails for languages with 3+ plural forms
- **Bom**: `t('items', { count })` — library handles all locale rules

### Attributes
```tsx
// Before
<input placeholder="Enter your email" aria-label="Email field" />

// After
<input placeholder={t('form.emailPlaceholder')} aria-label={t('form.emailAriaLabel')} />
```

### Conditional Text
```tsx
// Before
{show ? 'Show more' : 'Show less'}

// After
{show ? t('actions.showMore') : t('actions.showLess')}
```

### Rich Text
```tsx
// Before
<p>Click <a href="/help">here</a> for help</p>

// After (react-i18next)
<p>{t('helpLink', { link: (chunks) => <a href="/help">{chunks}</a> })}</p>

// Translation
{ "helpLink": "Click <link>here</link> for help" }
```

**Bom/Ruim:**
- **Ruim**: `<p>{t('click')} <a>{t('here')}</a> {t('forHelp')}</p>` — sentence split into 3 keys
- **Bom**: `t('helpLink', { link })` — translator sees full sentence

### Date/Number Formatting
```tsx
// Before — WRONG: hardcoded format
<p>Created on {new Date().toLocaleDateString('en-US')}</p>
<p>Price: ${price.toFixed(2)}</p>

// After — RIGHT: use library formatter
<p>{t('createdDate', { date: formatter.dateTime(createdAt) })}</p>
<p>{t('price', { amount: formatter.number(price, { style: 'currency', currency: 'USD' }) })}</p>
```

**Bom/Ruim:**
- **Ruim**: `toLocaleDateString('en-US')` — hardcoded locale
- **Bom**: `formatter.dateTime(date)` — uses user's locale

## Key Naming

**Bom:**
- `profile.header.title` — clear hierarchy
- `settings.form.emailLabel` — context + purpose
- `billing.invoice.emptyState` — feature + entity + state

**Ruim:**
- `title` — too generic, collides everywhere
- `headerText` — vague, what header?
- `page.content.section.label.text` — over-nested, 5 levels deep

## Complete Migration Example

**Before:**
```tsx
// src/components/Settings.tsx
export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Configure your preferences</p>
      <form>
        <label>Language</label>
        <select>
          <option>English</option>
          <option>Portuguese</option>
        </select>
        <button>Save changes</button>
      </form>
    </div>
  );
}
```

**After:**
```tsx
// src/components/Settings.tsx
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('settings');
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <p>{t('header.subtitle')}</p>
      <form>
        <label>{t('form.languageLabel')}</label>
        <select>
          <option>{t('form.langEnglish')}</option>
          <option>{t('form.langPortuguese')}</option>
        </select>
        <button>{t('form.saveButton')}</button>
      </form>
    </div>
  );
}
```

**Translation file (messages/en.json):**
```json
{
  "settings": {
    "header": {
      "title": "Settings",
      "subtitle": "Configure your preferences"
    },
    "form": {
      "languageLabel": "Language",
      "langEnglish": "English",
      "langPortuguese": "Portuguese",
      "saveButton": "Save changes"
    }
  }
}
```

**Response:**
```
Mode: migrate

Files changed:
- src/components/Settings.tsx
- messages/en.json

Changes:
- migrated 7 strings to t() calls
- added: [settings.header.title, settings.header.subtitle, settings.form.languageLabel, settings.form.langEnglish, settings.form.langPortuguese, settings.form.saveButton]
- namespace: settings

Validation: ✓ passed
```

## Refactor Example

**Scenario:** Rename namespace `bloqueio` → `block` across the codebase

**Before:**
```tsx
// src/components/BlockedAccount.tsx
const t = useTranslations('bloqueio');
<h1>{t('bloqueio.titulo')}</h1>
<p>{t('bloqueio.mensagem')}</p>
```

**Impact Analysis:**
```
## Impact Analysis

**Target**: `bloqueio.*` → `block.*`

**Found 12 usages across 4 files:**
- src/components/BlockedAccount.tsx (2 usages)
- src/components/BlockedCard.tsx (3 usages)
- src/shared/hooks/useBlockedStatus.ts (1 usage)
- src/pages/AccountStatus.tsx (6 usages)

**Cross-module dependencies:**
- src/shared/hooks/useBlockedStatus.ts (imported by 3 other modules)

**Risk level:** MEDIUM (shared hook affected)

**Confidence:** High
```

**Preview:**
```
## Preview

**Files to change (4 total):**

### src/components/BlockedAccount.tsx
```diff
- const t = useTranslations('bloqueio');
+ const t = useTranslations('block');

- <h1>{t('bloqueio.titulo')}</h1>
+ <h1>{t('block.titulo')}</h1>

- <p>{t('bloqueio.mensagem')}</p>
+ <p>{t('block.mensagem')}</p>
```

### src/components/BlockedCard.tsx
...

**Translation keys to rename:**
- `bloqueio.titulo` → `block.titulo`
- `bloqueio.mensagem` → `block.mensagem`
- `bloqueio.botaoDesbloquear` → `block.unlockButton`

**Apply these changes? [y/N]**
```

**After (user confirms):**
```tsx
// src/components/BlockedAccount.tsx
const t = useTranslations('block');
<h1>{t('block.titulo')}</h1>
<p>{t('block.mensagem')}</p>
```

**Response:**
```
Mode: refactor

Files changed:
- src/components/BlockedAccount.tsx
- src/components/BlockedCard.tsx
- src/shared/hooks/useBlockedStatus.ts
- src/pages/AccountStatus.tsx

Changes:
- renamed 3 keys across 4 files
- namespace: bloqueio → block

Validation: ✓ passed (0 orphaned references)
```
