[![CI](https://github.com/successkrisz/ballatech-public-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/successkrisz/ballatech-public-packages/actions/workflows/ci.yml) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

# Monorepo for my public packages

Single monorepo for my public packages, to ease the maintenance of my commonly reused non-effect packages.

## Packages

- `@ballatech/biome-config`: Shareable Biome configuration for consistent formatting and linting.
- `@ballatech/cdk-constructs`: Reusable AWS CDK constructs and utilities
  - Constructs: `ReactRouter7App`, `VpcImports`
  - Utilities: `requireEnvVar`
- `@ballatech/react-router7-preset-aws`: Minimal AWS Lambda preset for React Router v7.
- `@ballatech/tsconfig`: Shared TypeScript config presets for the workspace (internal/private).
