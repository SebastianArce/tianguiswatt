import createClient from 'openapi-fetch'
import type { paths } from '@/client/schema'

/**
 * Typed API client generated from the backend's OpenAPI schema.
 * Base URL is build-time configurable: absolute (e.g. https://api.<domain>) in production,
 * empty in dev so calls stay same-origin and go through the Vite proxy.
 */
export const api = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL ?? '/' })
