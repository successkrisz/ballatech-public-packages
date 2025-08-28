import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

// Usage:
// pnpm --filter './packages/lambda-test' run invoke:lambda -- <FUNCTION_ARN> [name]

const args = process.argv.slice(2).filter((a) => a !== '--')
const [functionArn, nameArg] = args

if (!functionArn) {
	console.error('Usage: tsx src/invoke-lambda.ts <FUNCTION_ARN> [name]')
	process.exit(1)
}

const name = nameArg ?? 'World'

// Minimal API Gateway REST API proxy event
const event = {
	resource: '/{proxy+}',
	path: '/hello',
	httpMethod: 'POST',
	headers: {
		'content-type': 'application/json',
	},
	multiValueHeaders: {
		'content-type': ['application/json'],
	},
	queryStringParameters: null,
	multiValueQueryStringParameters: null,
	pathParameters: {
		proxy: 'hello',
	},
	stageVariables: null,
	requestContext: {
		accountId: '123456789012',
		resourceId: 'abcd12',
		stage: 'prod',
		requestId: 'test-invoke-request',
		identity: {},
		resourcePath: '/{proxy+}',
		httpMethod: 'POST',
		apiId: 'test',
	},
	body: JSON.stringify({ name }),
	isBase64Encoded: false,
}

async function main() {
	const client = new LambdaClient({})
	const cmd = new InvokeCommand({
		FunctionName: functionArn,
		Payload: Buffer.from(JSON.stringify(event)),
	})
	const resp = await client.send(cmd)

	const status = resp.StatusCode ?? 0
	const payload = resp.Payload ? Buffer.from(resp.Payload).toString('utf8') : ''
	console.log('status', status)
	console.log('payload', payload)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
