import { createRequestHandler } from '@ballatech/react-router7-preset-aws'
import type { ServerBuild } from 'react-router'
import * as build from './build/server'

export const handler = createRequestHandler({
	build: build as unknown as ServerBuild,
})
