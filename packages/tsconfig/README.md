# @ballatech/tsconfig

Internal shared tsconfig presets for the monorepo. Private package.

## Presets

- `tsconfig.base.json`: Common base for all TypeScript projects in the workspace.
- `tsconfig.lambda22.json`: Type-checking preset for AWS Lambda Node 22.x functions bundled with esbuild (no emit). Can be used for frontend builds as well.
- `tsconfig.node22.json`: Type-checking preset for Node 22 scripts executed with `tsx` or bundled with esbuild (no emit).
- `tsconfig.lib.json`: Library preset for packages built with `tsup`, emitting declarations and sourcemaps.

## Usage (pnpm workspaces)

In a package `tsconfig.json`, extend the desired preset:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "@ballatech/tsconfig/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Lambda (Node 22, esbuild bundling, tsc for types only):

```json
{
  "extends": "@ballatech/tsconfig/tsconfig.lambda22.json",
  "include": ["src"]
}
```

Node 22 runtime (tsx/esbuild, no emit):

```json
{
  "extends": "@ballatech/tsconfig/tsconfig.node22.json",
  "include": ["src"]
}
```

Library (tsup builds; emit d.ts):

```json
{
  "extends": "@ballatech/tsconfig/tsconfig.lib.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Notes:

- All presets target modern Node (ES2022), use `moduleResolution: "Bundler"`, and set strict type-checking.
- Library preset enables declaration emit; bundlers like `tsup` should be configured to preserve type output.

## CDK usage with `NodejsFunction`

### CommonJS (default)

```ts
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    new nodejs.NodejsFunction(this, 'FnCjs', {
      entry: 'src/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      bundling: {
        tsconfig: 'packages/tsconfig/tsconfig.lambda22.json',
        // format defaults to CJS; target inferred from runtime (node22)
      },
    })
  }
}
```

### ESM

```ts
new nodejs.NodejsFunction(this, 'FnEsm', {
  entry: 'src/handler.ts',
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_22_X,
  bundling: {
    tsconfig: 'packages/tsconfig/tsconfig.lambda22.json',
    format: nodejs.OutputFormat.ESM,
    target: 'node22',
  },
})
```
