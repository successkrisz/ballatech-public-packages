import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Config, Console, Effect, Schema } from 'effect'

const Client = Effect.gen(function* () {
	const internalApiUrl = yield* Config.string('INTERNAL_API_URL')
	const client = (yield* HttpClient.HttpClient).pipe(
		HttpClient.mapRequestInput(HttpClientRequest.prependUrl(internalApiUrl)),
		HttpClient.mapRequestInput(HttpClientRequest.acceptJson),
		HttpClient.filterStatusOk,
	)
	return client
})

export const Foos = Client.pipe(
	// Note: Do not change the path it's used for testing
	Effect.flatMap((client) => client.get('/txdvs')),
	Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Any)),
	Effect.flatMap(Console.log),
)
