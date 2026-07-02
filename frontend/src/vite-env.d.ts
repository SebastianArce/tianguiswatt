/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API base URL baked at build time (prod). Unset in dev → same-origin. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
