# i18n Setup Guide

When a project has no i18n, follow this guide to create it from scratch.

## Step 1: Recommend Library

Based on the project's framework, recommend the best library:

| Framework | Recommended Library | Why |
|-----------|---------------------|-----|
| Next.js (App Router) | next-intl | Native integration, file-based routing |
| Next.js (Pages Router) | react-i18next | Flexible, works with any setup |
| React (Vite/CRA) | react-i18next | Most popular, great ecosystem |
| Vue 3 | vue-i18n | Official Vue i18n solution |
| Vue 2 | vue-i18n | Official Vue i18n solution |
| Angular | @angular/localize | Official Angular solution |
| Svelte/SvelteKit | svelte-i18n | Native Svelte integration |
| Any (universal) | i18next | Framework-agnostic, powerful |

Ask the user to confirm the library before proceeding.

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
── pt.json
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

## Step 7: Add to .gitignore (if needed)

If using a translation management service, add:

```gitignore
# Translation files (if managed externally)
# locales/*.json
!locales/en.json
```

## Step 8: Next Steps

After setup, the user can:

1. Run `/polyglot migrate src/components/Settings.tsx` to migrate strings
2. Add more translation keys as needed
3. Consider a translation management service (Lokalise, Crowdin, etc.)

## Validation

After setup, run:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-keys.js locales
```

This ensures the translation files are valid and consistent.
