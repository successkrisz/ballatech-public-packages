# @ballatech/cdk-constructs

Reusable CDK constructs

## Available Constructs

- `ReactRouter7App`
- `PrivateApiGateway`
- `VpcImports`

## Available Utilities

- `requireEnvVar`

### ReactRouter7App

A construct that creates a React Router 7 app using:

- AWS Lambda: to serve the serverside requests
- AWS API Gateway: to connect the Lambda function to CloudFront
- AWS CloudFront: to serve the entire application
- AWS S3: to store static assets

Should be used in combination with `@ballatech/react-router7-preset-aws` package to create the serverside build output.

### PrivateApiGateway

A construct that creates a private REST API Gateway accessible only from within a VPC. It handles:

- **Private endpoint configuration** with VPC endpoint association
- **Resource policy** that restricts access to specified VPC endpoints (allow + explicit deny)
- **Optional VPC Endpoint creation** for the `execute-api` service in the provided VPC
- **Optional CORS** — pass `true` for permissive defaults or supply custom `CorsOptions`

Exposes `api` (the `RestApi` instance), an optional `vpcEndpoint`, and a pre-built `apiUrl`.

Usage with an existing VPC endpoint:

```ts
import { PrivateApiGateway, VpcImports } from '@ballatech/cdk-constructs'

const vpcImports = new VpcImports(this, 'VpcImports', {
  vpcId: 'vpc-123',
  securityGroupIds: ['sg-abc'],
  subnetIds: ['subnet-1', 'subnet-2'],
})

const privateApi = new PrivateApiGateway(this, 'PrivateApi', {
  vpc: vpcImports.vpc,
  productName: 'my-service',
  stageName: 'prod',
  allowedVpcEndpointIds: ['vpce-abc123'],
  enableCors: true,
})

// Add resources and methods to the API
const foos = privateApi.api.root.addResource('foos')
foos.addMethod('GET', new apigateway.LambdaIntegration(myLambda))
```

Usage with automatic VPC endpoint creation:

```ts
const privateApi = new PrivateApiGateway(this, 'PrivateApi', {
  vpc: myVpc,
  productName: 'my-service',
  stageName: 'dev',
  createVpcEndpoint: true,
  description: 'Internal API for my-service',
})
```

### VpcImports

Utility construct for importing an existing VPC, subnets, and security groups by ID, and providing the necessary properties to attach AWS Lambda functions to the VPC.

Usage:

```ts
import { VpcImports } from '@ballatech/cdk-constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

const vpcImports = new VpcImports(this, 'VpcImports', {
  vpcId: 'vpc-123',
  securityGroupIds: ['sg-abc'],
  subnetIds: ['subnet-1', 'subnet-2'],
})

new NodejsFunction(this, 'Fn', {
  ...vpcImports.lambdaProps,
  // other lambda props
})
```

### requireEnvVar

Reads an environment variable and throws an error if it is missing or empty.

```ts
import { requireEnvVar } from '@ballatech/cdk-constructs'

const DATABASE_URL = requireEnvVar('DATABASE_URL')
```
