import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { App, Stack, type StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { ReactRouterV7Stack } from './react-router-v7.stack'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
class MyReactRouterAppInfraStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		const prefix = 'kb-test-01'

		new ReactRouterV7Stack(this, `${prefix}-Frontend`, {
			clientBuildPath: path.resolve(__dirname, '../../my-react-router-app/build/client'),
			serverBuildPath: path.resolve(__dirname, '../../my-react-router-app/build/lambda/index.cjs'),
			environment: {
				NODE_ENV: 'production',
			},
		})
	}
}

const app = new App()
new MyReactRouterAppInfraStack(app, 'kb-my-react-router-app')
app.synth()
