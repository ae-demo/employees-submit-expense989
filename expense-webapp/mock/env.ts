// mock/env.ts — YOURS. Carries exactly the keys the platform actually emits
// for this component (react-webapp SKILL.md's key table): this app's own
// USER_AUTH_* OIDC keys, and nothing else — there is no sibling-API browser
// key (expense-api is same-origin /api) and no configurations.env default.

export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // OIDC scopes (singular group/ou) plus every handle the catalog declares —
  // the mock never widens: which of these the signed-in caller actually holds
  // is decided by mock/authz/session.ts's `?role=` -> ROLE_GRANTS lookup, not
  // by this string.
  USER_AUTH_SCOPES:
    "openid profile email group ou " +
    "claims:read claims:submit claims:read-team claims:decide-manager " +
    "claims:read-all claims:decide-finance claims:export employees:read employees:manage",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};
