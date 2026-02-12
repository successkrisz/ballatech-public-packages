import { NodeHttpClient } from '@effect/platform-node'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { DateTime, Effect, ManagedRuntime, Schema } from 'effect'

import { Foos } from './get-foos'

const runtime = ManagedRuntime.make(NodeHttpClient.layerUndici)

const EventSchema = Schema.Struct({
	name: Schema.String,
})

export const handler = (event: APIGatewayProxyEventV2) =>
	Effect.gen(function* () {
		const now = yield* DateTime.now
		const formattedNow = DateTime.formatIntl(
			now,
			Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }),
		)
		const body = yield* Schema.decodeUnknown(Schema.parseJson(EventSchema))(event.body)
		const res = { message: `[${formattedNow}] Hello, ${body.name}!` }
		yield* Effect.log(res)
		yield* Effect.logInfo(`Started at: ${formattedNow}`)
		const foos = yield* Foos
		yield* Effect.log(foos)

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(res),
		}
	}).pipe(runtime.runPromise)
