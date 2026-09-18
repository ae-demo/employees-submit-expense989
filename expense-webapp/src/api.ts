// The expense-api client. Same-origin baseUrl: nginx proxies /api to the
// sibling (react-webapp), so this module carries no host. Authorization is
// src/authz/client.ts's job alone: this middleware attaches the bearer and
// applies the 401 rule exactly as that module documents, and adds nothing of
// its own.
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/expense-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

export const expenseApi = createClient<paths>({ baseUrl: "/api" });
expenseApi.use(authMiddleware);
