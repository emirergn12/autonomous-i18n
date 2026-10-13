<div align="center">
  <h1>🌐 Autonomous i18n & Localization Manager</h1>
  <p><strong>Code-Intelligent, Context-Aware Autonomous Software Localization Engine for Developers</strong></p>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Tests-35%20Passed-brightgreen.svg)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/Security-Hardened-success.svg)](#-security-architecture--hardening)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

</div>

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [System Architecture](#️-system-architecture)
- [Monorepo Package Structure](#-monorepo-package-structure)
- [Technical Innovations & Core Pillars](#-technical-innovations--core-pillars)
- [Security Architecture & Hardening](#-security-architecture--hardening)
- [Quickstart Guide](#-quickstart-guide)
- [Configuration Reference](#-configuration-reference)
- [CLI Command Reference & Live DX](#-cli-command-reference--live-dx)
- [Web Management Dashboard](#-web-management-dashboard)
- [CI/CD GitHub Action Pipeline](#-cicd-github-action-pipeline)
- [Verification & Automated Test Suite](#-verification--automated-test-suite)
- [Author & Architecture Note](#-author--architecture-note)
- [License & Ownership](#-license--ownership)

---

## 📌 Executive Summary

**Autonomous i18n Manager** is an enterprise-grade Developer Tool (DevTool) engineered to eliminate localization friction in modern software projects.

Traditional localization workflows are manual, fragmented, and error-prone. Primitive regex search tools or ungrounded machine translation scripts frequently break code interpolation variables (e.g., `{count}`, `{{userName}}`, `%s`), produce unnatural phrasing out of UI context, and leave obsolete keys cluttering language files.

This project delivers an autonomous localization pipeline utilizing **Abstract Syntax Tree (AST) compilation**, **UI Role Inference**, and **LLM Variable Protection Guardrails** to scan, audit, and translate missing i18n keys with 100% parameter integrity.

It provides both a high-ergonomics **CLI Engine** for local DX and CI/CD automation, and a modern **Glassmorphic Web Dashboard** connected via a secure, zero-dependency REST API bridge.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Source Codebase ["Source Codebase (.ts, .tsx, .js, .jsx)"]
        AST_ENGINE[Babel AST Parser<br/>@babel/parser & traverse]
    end

    subgraph Core Engine ["@i18n-manager/core"]
        EXTRACTOR[Context Extractor<br/>UI Role, Component Name, Parameters]
        STORE[Locale JSON Store<br/>Nested & Flat Serializer]
        DIFF[Diff & Audit Engine<br/>Missing & Dead Keys Tracker]
        FIREWALL[Path Traversal & Prototype Guards]
    end

    subgraph AI Pipeline ["@i18n-manager/ai"]
        MASKER[Placeholder Masker<br/>Unicode Variable Protection]
        PROMPT[Context-Enriched Prompt Builder]
        PROVIDERS[Multi-Provider Adaptor<br/>Gemini 1.5/2.0, OpenAI, Ollama, Mock]
        REPAIR[Auto-Repair Guardrail]
    end

    subgraph Developer Interfaces ["Developer Interfaces"]
        CLI["@i18n-manager/cli<br/>scan, translate, clean, check, ui"]
        WEB["@i18n-manager/dashboard<br/>React Glassmorphism Dashboard"]
        BRIDGE[Isolated DevServer REST API Bridge<br/>http://127.0.0.1:3001]
    end

    AST_ENGINE --> EXTRACTOR
    EXTRACTOR --> DIFF
    STORE --> DIFF
    DIFF --> MASKER
    MASKER --> PROMPT
    PROMPT --> PROVIDERS
    PROVIDERS --> REPAIR
    REPAIR --> FIREWALL
    FIREWALL --> STORE

    CLI <--> Core Engine
    CLI <--> AI Pipeline
    BRIDGE <--> Core Engine
    BRIDGE <--> AI Pipeline
    WEB <--> BRIDGE
```

---

## 📦 Monorepo Package Structure

Built as a 100% type-safe TypeScript monorepo with clean separation of concerns:

| Package                                             | Role                                                                         | Key Technologies                                          |
| :-------------------------------------------------- | :--------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **[`@i18n-manager/core`](packages/core)**           | AST compiler engine, JSON store serializers, diff metrics & security shields | `@babel/parser`, `@babel/traverse`, `zod`                 |
| **[`@i18n-manager/ai`](packages/ai)**               | Multi-LLM pipeline, placeholder token maskers, heuristic auto-repair         | Google Gemini, OpenAI, Ollama, Fetch API                  |
| **[`@i18n-manager/cli`](packages/cli)**             | Interactive terminal CLI, table formatting, setup wizard, CI/CD exit codes   | `commander`, `@clack/prompts`, `cli-table3`, `picocolors` |
| **[`@i18n-manager/dashboard`](packages/dashboard)** | Visual management cockpit, coverage radar, translation matrix grid           | React 19, Vite, Lucide Icons, Vanilla CSS                 |

---

## ✨ Technical Innovations & Core Pillars

### 1. Abstract Syntax Tree (AST) Compiler Intelligence

- Employs Babel compiler infrastructure to perform static analysis on TypeScript (`.ts`), TSX, JavaScript (`.js`), and JSX files.
- Extracts `t('key')`, `i18n.t('key')`, `formatMessage({ id: 'key' })`, and `<Trans i18nKey="..." />` calls.
- **UI Role Inference:** Automatically identifies the surrounding UI element (`button`, `heading`, `placeholder`, `error`, `alert`, `aria`) to anchor LLM translations in software context (e.g. translating "Save" as an imperative action for a button vs. a noun).

### 2. Variable Protection & Guardrail Pipeline

- **Unicode Token Masking:** Substitutes dynamic placeholders (`{count}`, `{{userName}}`, `%s`, `%1$s`, `<0>tag</0>`) with neutral slot tokens (`__SLOT_0__`) before invoking LLM models.
- **Automated Heuristic Repair:** Post-translation validation inspects translated outputs. If an LLM misplaces or alters placeholder tokens, the repair guardrail automatically restores parameters to maintain 100% runtime stability.

### 3. Multi-Provider LLM Orchestration

- First-class support for **Google Gemini (1.5 / 2.0 Flash)**, **OpenAI (GPT-4o / GPT-4o-mini)**, **Ollama** (offline local inference), and a zero-dependency **Mock Provider** for offline CI pipelines.
- Smart batching mechanism optimizes token utilization and request concurrency.

---

## 🛡️ Security Architecture & Hardening

Security is treated as a first-class engineering priority across the entire system:

### 1. Prototype Pollution Immunity

- Custom JSON flattening and unflattening algorithms in [`@i18n-manager/core`](packages/core/src/store/json-utils.ts) implement strict property filtering.
- Dangerous prototype properties (`__proto__`, `constructor`, `prototype`) are explicitly blocked, preventing global object pollution and Remote Code Execution (RCE) vectors.

### 2. Path Traversal Firewall

- [`LocaleStore`](packages/core/src/store/locale-store.ts) enforces a strict regex validator (`/^[a-zA-Z0-9_-]+$/`) on locale identifiers.
- Resolved filesystem paths are checked with boundary confinement assertions (`path.resolve`), making directory traversal (`../../etc/passwd`) mathematically impossible.

### 3. Isolated Local DevServer Bridge

- The local HTTP bridge binds strictly to **`127.0.0.1`** (loopback interface), completely isolating it from public Wi-Fi or local area networks.
- **CORS Origin Guard:** Restricts cross-origin requests exclusively to local origins (`localhost` / `127.0.0.1`), immunizing the developer from Drive-By CSRF and DNS Rebinding attacks.
- **Payload Size Limiter:** Enforces a strict 1MB payload buffer limit (`MAX_BODY_SIZE`) on all API endpoints to prevent Denial-of-Service (DoS) memory exhaustion.

### 4. Credential Shielding

- Google Gemini API calls utilize the standard `x-goog-api-key` HTTP header rather than leaking credentials via URL query parameters in HTTP logs and proxy caches.
- Built-in `.gitignore` rules prevent accidental commits of `.env` files and local secrets.

---

## 🚀 Quickstart Guide

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/emirergn12/autonomous-i18n.git
cd autonomous-i18n

# Install monorepo dependencies and compile
npm install
npm run build
```

### 2. Initialize a Project

In any React, Next.js, or Vue project directory:

```bash
npx @i18n-manager/cli init
```

The interactive setup wizard prompts for source locale, target locales, and file patterns, generating a validated `i18n.config.json`.

---

## ⚙️ Configuration Reference

Configuration is managed via `i18n.config.json` at your project root:

```json
{
  "sourceLocale": "en",
  "targetLocales": ["tr", "de", "es", "fr"],
  "localesDir": "./locales",
  "format": "nested-json",
  "include": ["src/**/*.{ts,tsx,js,jsx}"],
  "exclude": ["node_modules/**", "dist/**", "**/*.test.*"],
  "ai": {
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "temperature": 0.2
  }
}
```

| Property        | Type                               | Description                                 |
| :-------------- | :--------------------------------- | :------------------------------------------ |
| `sourceLocale`  | `string`                           | Base source language code (e.g., `'en'`).   |
| `targetLocales` | `string[]`                         | Array of target language codes to generate. |
| `localesDir`    | `string`                           | Directory containing locale `.json` files.  |
| `format`        | `'nested-json' \| 'flat-json'`     | Storage format for language keys.           |
| `include`       | `string[]`                         | Glob patterns for source files to inspect.  |
| `ai.provider`   | `'gemini' \| 'openai' \| 'ollama'` | Active LLM translation backend.             |

---

## 🛠️ CLI Command Reference & Live DX

### Command Summary

| Command          | Description                                         | Common Flags                                           |
| :--------------- | :-------------------------------------------------- | :----------------------------------------------------- |
| `i18n init`      | Runs interactive setup wizard.                      | N/A                                                    |
| `i18n scan`      | Audits codebase AST against language files.         | `--json`                                               |
| `i18n translate` | Autonomously translates missing keys via LLM.       | `--auto-approve`, `--interactive`, `--provider <name>` |
| `i18n clean`     | Prunes dead, unreferenced keys from language files. | `-f, --force`, `--dry-run`                             |
| `i18n check`     | CI/CD mode. Fails build (`exit 1`) on missing keys. | `--format <console\|markdown\|json>`, `-o <file>`      |
| `i18n ui`        | Launches DevServer REST API Bridge & Web Cockpit.   | `-p, --port <3000>`                                    |

### Live CLI Terminal Showcase

```text
$ npx @i18n-manager/cli scan

🔍 [i18n-manager] Codebase Localization Audit
   Source: en | Targets: tr, de, es
   Scanned: 24 file(s) | Keys Extracted: 48

┌────────────┬──────────────────┬────────────────┬───────────────┐
│ Locale     │ Coverage         │ Missing Keys   │ Status        │
├────────────┼──────────────────┼────────────────┼───────────────┤
│ TR         │ 95.8%            │ 2              │ 🟨 Review     │
│ DE         │ 91.6%            │ 4              │ 🟨 Review     │
│ ES         │ 100.0%           │ 0              │ 🟩 Complete   │
└────────────┴──────────────────┴────────────────┴───────────────┘

📊 Overall Health Score: 95.8%

⚠️  Missing Keys (6):
   - [tr] auth.forgot_password [src/components/LoginForm.tsx:42] (Role: button)
   - [tr] dashboard.greeting [src/pages/Dashboard.tsx:18] (Params: {userName})
```

---

## 🖥️ Web Management Dashboard

Launch the visual management dashboard by executing:

```bash
npx @i18n-manager/cli ui
```

Then visit **`http://localhost:3001`** to access:

- **Health Radar Gauge:** Real-time localization health score with dynamic color grading.
- **Interactive Matrix Grid:** Search, filter by Missing/Dead keys, and **double-click inline edit** cells with instant filesystem persistence.
- **AI Translation Studio:** Side-by-side translation diff viewer with placeholder protection feedback.
- **Dead Key Cleaner:** One-click removal of unreferenced translation keys.

---

## 🤖 CI/CD GitHub Action Pipeline

Add `.github/workflows/i18n-check.yml` to prevent unlocalized code from merging into production:

```yaml
name: i18n Localization Audit

on:
  pull_request:
    branches: [main, master]

jobs:
  audit-localization:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Codebase
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install Dependencies
        run: npm ci

      - name: Run Localization Audit Check
        run: npx @i18n-manager/cli check --format markdown -o ./i18n-report.md
```

---

## 🧪 Verification & Automated Test Suite

The project enforces strict type checking and automated regression testing across all packages:

```bash
# Run full monorepo test suite
npm test
```

```text
 ✓ packages/ai/tests/prompt.test.ts (2 tests)
 ✓ packages/ai/tests/guardrails.test.ts (5 tests)
 ✓ packages/ai/tests/pipeline.test.ts (1 test)
 ✓ packages/cli/tests/cli.test.ts (4 tests)
 ✓ packages/core/tests/diff-engine.test.ts (1 test)
 ✓ packages/core/tests/config.test.ts (4 tests)
 ✓ packages/core/tests/store.test.ts (7 tests)
 ✓ packages/core/tests/extractor.test.ts (6 tests)
 ✓ packages/core/tests/server.test.ts (5 tests)

 Test Files  9 passed (9)
      Tests  35 passed (35)
   Duration  1.30s
```

---

## 👨‍💻 Author & Architecture Note

Designed, engineered, and maintained as a showcase Developer Tool & Micro-SaaS project demonstrating full-stack system architecture, AST compiler engineering, secure DevServer bridging, and LLM guardrail pipelines.

- **Author & Architect:** [@emirergn12](https://github.com/emirergn12)
- **GitHub Profile:** [github.com/emirergn12](https://github.com/emirergn12)
- **Engineering Highlights:** 100% Type-Safe TypeScript Monorepo, 35 Automated Vitest Suite Tests (100% passing), Zero-Dependency DevServer API Bridge, Security-Hardened (Anti-Prototype Pollution & Path Traversal Guards), Glassmorphic React UI.

---

## 📄 License & Ownership

Distributed under the **MIT License**. See [LICENSE](LICENSE) for full legal text.

Copyright (c) 2026 @emirergn12. All rights reserved.
