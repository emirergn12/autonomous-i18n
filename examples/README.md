# Showcase Application & Playground

This directory serves as a live demonstration and interactive playground for **Autonomous i18n Manager**.

## Features Demonstrated
* **AST Context Extraction:** React components in `src/` using `t('key')` and dynamic interpolations (`{ name }`, `{ percent }`).
* **UI Role Detection:** Automated inference of UI element purpose (`button`, `heading`, `alert`, `placeholder`).
* **Multi-Language Support:** Synchronizing source locale (`en`) with target locales (`tr`, `de`, `es`).
* **Dead Key Cleanup:** Detecting obsolete locale keys never referenced in source code.

## Quick CLI Commands

### 1. Audit Localization Health
```bash
node ../packages/cli/dist/index.js scan
```

### 2. Autonomous AI Translation Pipeline
```bash
node ../packages/cli/dist/index.js translate --auto-approve
```

### 3. Clean Dead Keys
```bash
node ../packages/cli/dist/index.js clean -f
```

### 4. Launch Glassmorphic Web Dashboard
```bash
node ../packages/cli/dist/index.js ui
```
Open **`http://localhost:3001`** in your browser to interact with the visual dashboard!
