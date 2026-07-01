import createClient from 'openapi-fetch'
import type { paths } from '@/client/schema'

/** Typed API client generated from the backend's OpenAPI schema. */
export const api = createClient<paths>({ baseUrl: '/' })
