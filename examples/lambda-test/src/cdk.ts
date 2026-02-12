/** biome-ignore-all lint/style/noNonNullAssertion: env vars exist */

import { PrivateApiGateway, requireEnvVar, VpcImports } from '@ballatech/cdk-constructs'
import type { StackProps } from 'aws-cdk-lib'
import { App, CfnOutput, Duration, Stack } from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import type { Construct } from 'constructs'

class LambdaTestStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		const vpcId = requireEnvVar('VPC_ID')
		const securityGroupId = requireEnvVar('SERVERLESS_SECURITY_GROUP')
		const subnetId1 = requireEnvVar('PRIVATE_SUBNET_1')
		const subnetId2 = requireEnvVar('PRIVATE_SUBNET_2')

		const vpcImports = new VpcImports(this, 'VpcImports', {
			vpcId,
			securityGroupIds: [securityGroupId],
			subnetIds: [subnetId1, subnetId2],
		})

		const fn = new nodejs.NodejsFunction(this, 'Fn', {
			...vpcImports.lambdaProps,
			runtime: lambda.Runtime.NODEJS_22_X,
			architecture: lambda.Architecture.ARM_64,
			memorySize: 1536,
			timeout: Duration.seconds(30),
			entry: 'src/handler.ts',
			handler: 'handler',
			bundling: {
				tsconfig: 'tsconfig.json',
				format: nodejs.OutputFormat.CJS,
				target: 'node22',
				minify: true,
				sourceMap: true,
			},
			environment: {
				INTERNAL_API_URL: requireEnvVar('INTERNAL_API_URL'),
			},
		})

		const fnUrl = fn.addFunctionUrl({
			authType: lambda.FunctionUrlAuthType.NONE,
		})

		const { api } = new PrivateApiGateway(this, 'Api', {
			vpc: vpcImports.vpc,
			createVpcEndpoint: false,
			allowedVpcEndpointIds: [requireEnvVar('API_GATEWAY_VPCE_ID')],
			productName: 'lambda-test',
			stageName: 'dev',
		})

		const integration = new apigateway.LambdaIntegration(fn)
		api.root.addResource('foos').addMethod('POST', integration)

		new CfnOutput(this, 'ApiUrl', {
			value: api.url,
		})

		new CfnOutput(this, 'FnArn', {
			value: fn.functionArn,
		})

		new CfnOutput(this, 'FnInvokeUrl', {
			value: fnUrl.url,
		})
	}
}

const app = new App()
new LambdaTestStack(app, 'kballa-lambda-bundle-test', {
	env: {
		account: process.env.AWS_ACCOUNT_ID!,
		region: process.env.AWS_REGION!,
	},
})
app.synth()
