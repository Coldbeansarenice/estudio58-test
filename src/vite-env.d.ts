/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "memory" only for the single-file phone preview. Leave unset on Vercel. */
  readonly VITE_ROUTER_MODE?: 'browser' | 'memory';
}
