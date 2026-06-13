# i18n Create Guide

When a project has no i18n, follow this guide to create it from scratch.

## Philosophy

**Opinionated defaults beat endless configuration.** We recommend one library per framework based on ecosystem maturity, DX, and maintenance status. If the user has a strong preference, respect it — but lead with a clear recommendation.

## Step 1: Recommend Library

Based on the project's framework, recommend the best library:

| Framework | Recommended Library | Why |
|-----------|---------------------|-----|
| Next.js (App Router) | next-intl | Native integration, file-based routing, RSC support |
| Next.js (Pages Router) | react-i18next | Flexible, works with any setup |
| React (Vite/CRA) | react-i18next | Most popular, great ecosystem, TypeScript-first |
| Vue 3 | vue-i18n | Official Vue i18n solution, maintained by Vue team |
| Vue 2 | vue-i18n | Official Vue i18n solution |
| Angular | @angular/localize | Official Angular solution, built-in extraction |
| Svelte/SvelteKit | svelte-i18n | Native Svelte integration, reactive stores |
| Any (universal) | i18next | Framework-agnostic, powerful plugin system |

**Decision rule**: If the framework has an official i18n solution, use it. Otherwise, use react-i18next (React) or i18next (universal).

Ask the user to confirm before proceeding. If they disagree, respect their choice.

## Step 2: Install Dependencies

Run the appropriate install command:

```bash
# next-intl
npm install next-intl

# react-i18next
npm install react-i18next i18next

# vue-i18n
npm install vue-i18n

# @angular/localize
ng add @angular/localize

# svelte-i18n
npm install svelte-i18n

# i18next (universal)
npm install i18next
```

**Rule**: Use the project's existing package manager (npm, yarn, pnpm, bun). Detect from lockfile.

## Step 3: Create Config File

Create the i18n configuration file based on the library:

### next-intl

```ts
// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### react-i18next

**ESM (modern projects):**
```ts
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

**CommonJS (older projects):**
```ts
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: require('./locales/en.json') },
    pt: { translation: require('./locales/pt.json') },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### vue-i18n

**ESM (modern projects):**
```ts
// src/i18n.ts
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import pt from './locales/pt.json';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, pt },
});

export default i18n;
```

**CommonJS (older projects):**
```ts
// src/i18n.ts
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: require('./locales/en.json'),
    pt: require('./locales/pt.json'),
  },
});

export default i18n;
```

### svelte-i18n

```ts
// src/i18n.ts
import { register, init } from 'svelte-i18n';

register('en', () => import('./locales/en.json'));
register('pt', () => import('./locales/pt.json'));

init({
  fallbackLocale: 'en',
  initialLocale: 'en',
});
```

## Step 4: Create Translation File Structure

Create the directory structure and initial files:

```
locales/
├── en.json
└── pt.json
```

### en.json

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "An error occurred"
  }
}
```

### pt.json

```json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "edit": "Editar",
    "loading": "Carregando...",
    "error": "Ocorreu um erro"
  }
}
```

**Rule**: Start with a `common` namespace for shared UI strings. Add feature-specific namespaces as the app grows.

## Step 5: Add Provider to App Root

Wrap the app with the i18n provider:

### next-intl (App Router)

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({ children }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

### react-i18next

```tsx
// src/main.tsx or src/index.tsx
import './i18n'; // Import the config file
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### vue-i18n

```ts
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import i18n from './i18n';

createApp(App).use(i18n).mount('#app');
```

### svelte-i18n

```svelte
<!-- src/App.svelte -->
<script>
  import './i18n';
  import { locale } from 'svelte-i18n';
  
  locale.set('en');
</script>

<main>
  <!-- Your app content -->
</main>
```

## Step 6: Create Example Component

Show the user how to use i18n in a component:

### next-intl

```tsx
import { useTranslations } from 'next-intl';

export default function Example() {
  const t = useTranslations('common');
  return <button>{t('save')}</button>;
}
```

### react-i18next

```tsx
import { useTranslation } from 'react-i18next';

export default function Example() {
  const { t } = useTranslation();
  return <button>{t('common.save')}</button>;
}
```

### vue-i18n

```vue
<template>
  <button>{{ $t('common.save') }}</button>
</template>
```

### svelte-i18n

```svelte
<script>
  import { _ } from 'svelte-i18n';
</script>

<button>{$_('common.save')}</button>
```

## Step 7: Next Steps

After create, guide the user:

1. **Migrate strings**: Run `/polyglot migrate src/components/Settings.tsx` to start migrating
2. **Add locales**: Copy `en.json` to new locale files and translate
3. **Consider a Translation Management System (TMS)**: For 3+ locales, consider Lokalise, Crowdin, or Phrase

## Validation

After create, validate:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-keys.js locales
```

This ensures translation files are valid and consistent across locales.
