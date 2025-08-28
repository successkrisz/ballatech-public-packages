import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { Effect, Schema } from 'effect'

const EventSchema = Schema.Struct({
	name: Schema.String,
})

export const handler = (event: APIGatewayProxyEventV2) =>
	Effect.gen(function* () {
		const body = yield* Schema.decodeUnknown(Schema.parseJson(EventSchema))(event.body)
		const res = { message: `Hello, ${body.name}!` }

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(res),
		}
	}).pipe(Effect.runPromise)
