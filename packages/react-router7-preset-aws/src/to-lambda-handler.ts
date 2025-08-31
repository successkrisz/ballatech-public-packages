import process from 'node:process'
import { readableStreamToString } from '@react-router/node'
import type {
	APIGatewayProxyEventHeaders,
	APIGatewayProxyEventV2,
	APIGatewayProxyHandlerV2,
	APIGatewayProxyStructuredResultV2,
} from 'aws-lambda'
import {
	type AppLoadContext,
	createRequestHandler as createReactRouterRequestHandler,
	type ServerBuild,
} from 'react-router'

import { isBinaryType } from './binary-types'

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (
	event: APIGatewayProxyEventV2,
) => Promise<AppLoadContext> | AppLoadContext

export type RequestHandler = APIGatewayProxyHandlerV2

/**
 * Returns an AWS Lambda request handler that serves the response using
 * React Router.
 */
export function createRequestHandler({
	build,
	getLoadContext,
	mode = process.env.NODE_ENV,
}: {
	build: ServerBuild
	getLoadContext?: GetLoadContextFunction
	mode?: string
}): RequestHandler {
	const handleRequest = createReactRouterRequestHandler(build, mode)

	return async (event: APIGatewayProxyEventV2) => {
		const request = createReactRouterRequest(event)
		const loadContext = await getLoadContext?.(event)

		const response = await handleRequest(request, loadContext)

		return sendReactRouterResponse(response)
	}
}

export function createReactRouterRequest(event: APIGatewayProxyEventV2): Request {
	const host = event.headers['x-forwarded-host'] ?? event.headers.host
	const search = event.rawQueryString.length > 0 ? `?${event.rawQueryString}` : ''
	const scheme = 'https'
	const url = new URL(`${scheme}://${host}${event.rawPath}${search}`)
	const isFormData = event.headers['content-type']?.includes('multipart/form-data')
	// Note: No current way to abort these for Lambdas, but our router expects
	// requests to contain a signal, so it can detect aborted requests
	const controller = new AbortController()

	return new Request(url.href, {
		method: event.requestContext.http.method,
		headers: createReactRouterHeaders(event.headers, event.cookies),
		signal: controller.signal,
		body:
			event.body && event.isBase64Encoded
				? isFormData
					? Buffer.from(event.body, 'base64')
					: Buffer.from(event.body, 'base64').toString()
				: event.body,
	})
}

export function createReactRouterHeaders(
	requestHeaders: APIGatewayProxyEventHeaders,
	requestCookies?: string[],
): Headers {
	const headers = new Headers()

	for (const [header, value] of Object.entries(requestHeaders)) {
		if (value) {
			headers.append(header, value)
		}
	}

	if (requestCookies) {
		headers.append('Cookie', requestCookies.join('; '))
	}

	return headers
}

export async function sendReactRouterResponse(
	nodeResponse: Response,
): Promise<APIGatewayProxyStructuredResultV2> {
	const cookies: string[] = []

	// Arc/AWS API Gateway will send back set-cookies outside of response headers.
	for (const [key, value] of nodeResponse.headers.entries()) {
		if (key.toLowerCase() === 'set-cookie') {
			cookies.push(value)
		}
	}

	if (cookies.length > 0) {
		nodeResponse.headers.delete('Set-Cookie')
	}

	const contentType = nodeResponse.headers.get('Content-Type')
	const isBase64Encoded = isBinaryType(contentType as string | undefined)
	let body: string | undefined

	if (nodeResponse.body) {
		body = await (isBase64Encoded
			? readableStreamToString(nodeResponse.body, 'base64')
			: nodeResponse.text())
	}

	return {
		statusCode: nodeResponse.status,
		headers: Object.fromEntries(nodeResponse.headers.entries()),
		cookies,
		body,
		isBase64Encoded,
	}
}
