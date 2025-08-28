import type { StackProps } from 'aws-cdk-lib'
import { App, CfnOutput, Stack } from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import type { Construct } from 'constructs'

class LambdaTestStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		const fn = new nodejs.NodejsFunction(this, 'Fn', {
			runtime: lambda.Runtime.NODEJS_22_X,
			entry: 'src/handler.ts',
			handler: 'handler',
			bundling: {
				tsconfig: 'tsconfig.json',
				format: nodejs.OutputFormat.ESM,
				target: 'node22',
			},
		})

		const fnUrl = fn.addFunctionUrl({
			authType: lambda.FunctionUrlAuthType.NONE,
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
new LambdaTestStack(app, 'kballa-lambda-bundle-test')
app.synth()
