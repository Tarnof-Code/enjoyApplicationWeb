/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SECRET_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_PORT: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


