# i18n Patterns Reference

## String Interpolation

When a hardcoded string contains dynamic values, never concatenate — use the interpolation mechanism of the detected i18n library.

**Detect the interpolation pattern** from the reference module or translation files:
- ICU / named: `"Hello, {name}"` → `t('greeting', { name })`
- Positional: `"Hello, %s"` → `t('greeting', name)` (avoid if ICU is available)
- Template: `` `Hello, ${name}` `` → must be converted to interpolation

**Rules:**
- Never split a sentence into multiple `t()` calls joined by concatenation.
- If the reference module uses ICU MessageFormat, follow it exactly.
- If interpolation is used in the reference module, replicate the same variable naming style.
- Watch for implicit concatenation in JSX: `<p>Hello, {user.name}</p>` is interpolation, not two strings.

**Bom/Ruim:**
- **Ruim**: `t('hello') + ' ' + user.name + ' ' + t('welcome')` — translator can't reorder words
- **Bom**: `t('greeting', { name: user.name })` — translator controls full sentence structure

## Pluralization

When a string changes based on a count, use the pluralization mechanism detected in the project.

**Detect the pluralization pattern** from translation files or the reference module:
- **ICU MessageFormat**: `"You have {count, plural, one {# item} other {# items}}"`
- **Key suffix**: `items.one`, `items.other` (or `items_singular`, `items_plural`)
- **Object form** (i18next): `{ "items_one": "{{count}} item", "items_other": "{{count}} items" }`

**Rules:**
- Never use `count === 1 ? t('singular') : t('plural')` in code — this breaks for languages with complex plural rules (Arabic has 6 forms, Polish has 3, Russian has 3).
- Always delegate plural logic to the i18n library.
- If the reference module has pluralized keys, replicate the exact same pattern.

**Bom/Ruim:**
- **Ruim**: `count === 1 ? t('item.one') : t('item.other')` — fails for Arabic, Polish, Russian
- **Bom**: `t('items', { count })` — library handles all locale-specific plural rules

## Formatting (Dates, Numbers, Currencies)

When a hardcoded string contains formatted values, use the formatting mechanism of the detected i18n library.

**Detect the formatting pattern** from the reference module:
- **next-intl**: `useFormatter()` → `formatter.dateTime()`, `formatter.number()`
- **react-intl**: `<FormattedMessage>` with `values` + `Intl` API, or `useIntl().formatDate()`
- **i18next**: custom formatters via `i18next.services.formatter`
- **Native**: `Intl.DateTimeFormat`, `Intl.NumberFormat` wrapped in a helper

**Rules:**
- Do not format dates/numbers inline with `toLocaleDateString()` if the project has a formatting utility.
- Follow the existing formatting pattern from the reference module exactly.

**Bom/Ruim:**
- **Ruim**: `new Date().toLocaleDateString('en-US')` — hardcoded locale, ignores user preference
- **Bom**: `formatter.dateTime(date)` — uses user's locale automatically

## Rich Text and Inline Components

When a translated string contains markup, links, or inline components, use the mechanism detected in the project.

**Detect the rich text pattern** from the reference module:
- **Component-based**: `<Trans>` (react-i18next, react-intl), `<FormattedMessage>` with JSX children
- **Tag-based**: `"Click <link>here</link>"` → `t('cta', { link: (chunks) => <a href="...">{chunks}</a> })`
- **HTML injection**: `dangerouslySetInnerHTML` with sanitized translations (rare, flag as risk)

**Rules:**
- Never hardcode markup inside a translation key unless the project already does this.
- If the reference module uses `<Trans>` or equivalent, replicate the exact pattern.
- Do not split a rich text sentence into multiple keys.

**Bom/Ruim:**
- **Ruim**: `<p>{t('click')} <a>{t('here')}</a> {t('forHelp')}</p>` — sentence split, translator loses context
- **Bom**: `t('helpLink', { link: (chunks) => <a>{chunks}</a> })` — translator sees full sentence

## Sub-Component Translation Patterns

Sub-components need special handling to avoid runtime errors like "t is not defined".

### Pattern A: Direct Hook Access (Client Components)

```tsx
// ChildComponent.tsx — standalone client component
import { useTranslations } from 'next-intl';

export default function ChildComponent() {
  const t = useTranslations('namespace');
  return <h1>{t('title')}</h1>;
}
```

**When to use**: Component is a client component with direct access to the hook.

### Pattern B: Prop Drilling (Server Components / Shared Components)

```tsx
// Parent.tsx
import { useTranslations } from 'next-intl';
import ChildComponent from './ChildComponent';

export default function Parent() {
  const t = useTranslations('namespace');
  return <ChildComponent t={t} />;
}

// ChildComponent.tsx
type Props = { t: any };

export default function ChildComponent({ t }: Props) {
  return <h1>{t('title')}</h1>;
}
```

**When to use**: 
- Sub-component is shared across multiple parents
- Sub-component is a server component (cannot use hooks)
- Project convention requires prop drilling

**Rules:**
- If detected convention says "prop-drilling", ALWAYS pass `t` as prop
- Never call `useTranslations()` in sub-components if project uses prop drilling
- Type the `t` prop appropriately (usually `any` or the specific type from your library)

### Pattern C: Context-Based (Advanced)

```tsx
// i18n-context.tsx
import { createContext, useContext } from 'react';
import { useTranslations } from 'next-intl';

const I18nContext = createContext<any>(null);

export function I18nProvider({ children, namespace }: { children: React.ReactNode; namespace: string }) {
  const t = useTranslations(namespace);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const t = useContext(I18nContext);
  if (!t) throw new Error('useI18n must be used within I18nProvider');
  return t;
}

// ChildComponent.tsx
import { useI18n } from './i18n-context';

export default function ChildComponent() {
  const t = useI18n();
  return <h1>{t('title')}</h1>;
}
```

**When to use**: Deep component trees where prop drilling becomes cumbersome.

### Detection Rules

The `detect-conventions.js` script automatically detects which pattern your project uses:

- If 70%+ of sub-components receive `t` as prop → **Pattern B**
- If 70%+ of sub-components call hook directly → **Pattern A**
- If project has i18n context → **Pattern C**

**ALWAYS validate detected pattern with user before applying.**

## Zod Schema i18n Pattern

When using Zod schemas with i18n, follow the detected pattern.

### Factory Function Pattern (Recommended)

```tsx
// schemas/organization.ts
import { z } from 'zod';

export const createOrganizationSchema = (t: any) =>
  z.object({
    name: z.string().min(1, t('schema.name.required')),
    email: z.string().email(t('schema.email.invalid')),
    website: z.string().url(t('schema.website.invalid')).optional(),
  });

// component.tsx
import { useTranslations } from 'next-intl';
import { createOrganizationSchema } from '@/schemas/organization';

export default function OrganizationForm() {
  const t = useTranslations('organization');
  const schema = createOrganizationSchema(t);
  
  // Use schema with react-hook-form, formik, etc.
}
```

**Rules:**
- Schemas MUST receive `t` as parameter (never call hook directly in schema file)
- Validation messages use full key path: `t('schema.field.rule')`
- Schema files are separate from component files
- Export factory function, not schema instance

### Inline Pattern (Less Common)

```tsx
// component.tsx
import { z } from 'zod';
import { useTranslations } from 'next-intl';

export default function MyForm() {
  const t = useTranslations('form');
  
  const schema = z.object({
    name: z.string().min(1, t('name.required')),
  });
}
```

**When to use**: Simple forms with few fields, schema not reused.

### Detection

The `detect-conventions.js` script detects:
- If schemas use factory functions → apply factory pattern
- If schemas use inline `t()` → apply inline pattern
- If no schemas detected → skip this section

**Bom/Ruim:**
- **Ruim**: Schema file imports `useTranslations` directly (breaks server components)
- **Bom**: Schema receives `t` as parameter (works everywhere)

## JSX Contexts

Strings appear in different positions in JSX. Each has specific handling:

| Context | Example | Handling |
|---------|---------|----------|
| Text content | `<p>Hello</p>` | Replace text with `{t('key')}` |
| Attribute | `<input placeholder="Name" />` | Replace value with `{t('key')}` |
| Attribute (string) | `<img alt="Logo" />` | Replace value with `{t('key')}` |
| Conditional text | `{show ? 'Yes' : 'No'}` | Replace each branch: `{show ? t('yes') : t('no')}` |
| Template literal | `` `Hello ${name}` `` | Convert to interpolation: `t('greeting', { name })` |
| Object value | `{ label: 'Save' }` | Replace value: `{ label: t('save') }` |
| Nested JSX | `<p>Click <b>here</b></p>` | See Rich Text section |

**Rules:**
- Migrate all user-visible strings regardless of context.
- Do not skip aria-labels, titles, or placeholders — they are user-visible.
- Exclude: CSS class names, data attributes, event handler names, non-visible debug strings.

## Large Files Strategy (Migrate mode only)

When a module has many hardcoded strings (20+):

1. Count total hardcoded strings in the target module.
2. If more than 20, propose batching by logical section (e.g., header, form, footer).
3. Ask the user if they want all strings migrated or a specific subset.
4. Process one batch at a time.

**Rules:**
- Do not silently skip strings. If a string is not migrated, note it in the response.
- If a module is too large to analyze in one pass, say so and propose a strategy.
