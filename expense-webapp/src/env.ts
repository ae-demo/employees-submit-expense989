// Typed read of window._env_, the platform's runtime config. The key set is
// fixed by the platform: this app's auth dependency (`user-auth`) emits four
// keys the browser reads (CLIENT_ID, ISSUER, SCOPES, RESOURCE — never
// JWKS_URL, which only the API gateway validates against). There is no
// sibling-API key here: expense-api is reached same-origin at /api, proxied by
// nginx from the pod env `EXPENSE_API_URL` / `EXPENSE_API_GATEWAY_URL`, which
// the browser never sees.

type Env = {
  USER_AUTH_CLIENT_ID: string;
  USER_AUTH_ISSUER: string;
  USER_AUTH_SCOPES: string;
  USER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
