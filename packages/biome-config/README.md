# @ballatech/biome-config

[![npm version](https://img.shields.io/npm/v/%40ballatech%2Fbiome-config?logo=npm)](https://www.npmjs.com/package/@ballatech/biome-config) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

> **@ballatech/biome-config**  
> Shareable [Biome](https://biomejs.dev/) configuration for Ballatech projects.

## Overview

This package provides a reusable, opinionated [Biome](https://biomejs.dev/) configuration for JavaScript/TypeScript projects at Ballatech. It is designed to ensure consistent code formatting, linting, and static analysis across all repositories.

## Features

- **Consistent formatting**: Enforces Ballatech's code style using Biome.
- **Linting rules**: Includes recommended and custom lint rules for TypeScript and JavaScript.
- **Zero-config setup**: Install and extend in your project with minimal configuration.
- **Fast and reliable**: Leverages Biome's performance and correctness.

## Installation

### 1) Install dependencies

Use your preferred package manager to add Biome and this shareable config as dev dependencies.

- pnpm: `pnpm add -D @biomejs/biome @ballatech/biome-config`
- npm: `npm i -D @biomejs/biome @ballatech/biome-config`
- yarn: `yarn add -D @biomejs/biome @ballatech/biome-config`

### 2) Configure Biome to extend this config

Create a `biome.jsonc` at the root of your project (or update your existing one) and extend this package:

```jsonc
{
  // Extend Ballatech's shared Biome configuration
  "extends": ["@ballatech/biome-config"]
}
```

You can still override or add project-specific settings:

```jsonc
{
  "extends": ["@ballatech/biome-config"],
  "formatter": {
    "indentWidth": 2
  }
}
```

### 3) Add helpful scripts (optional)

Add scripts to your `package.json`:

```jsonc
{
  "scripts": {
    "format": "biome format .",
    "format:fix": "biome format --write .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "check": "biome check ."
  }
}
```

Run: `pnpm check` (or the equivalent for your package manager) to format, lint, and validate in one go.
