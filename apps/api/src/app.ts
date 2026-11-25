import {
  auth,
  oauthAuthorizationServerMetadata,
  oauthProtectedResourceMetadata,
  openIdConfiguration,
  OIDC_PROVIDER_ID,
  trustedOrigins,
  getAuthSettings,
  hasConfiguredGoogle,
  hasConfiguredOidc,
  getOidcLabel,
} from '@repo/auth';
import { db, hasConfiguredEmailProvider, user } from '@repo/db';
import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { planner } from './planner';
import { gitWebhookRoutes } from './modules/git/webhook';
import { currentUserRoutes } from './modules/current-user';
import { EmbedSitesSchema } from './modules/settings/model';
import { getEmbedSites } from './modules/settings/service';
import { requestTracking } from './shared/request-tracker';

const apiUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

// better-auth serves the OIDC callback at /callback/oidc; identity providers keep the
// redirect URI they were registered with, which is this path.
const LEGACY_OIDC_CALLBACK = `/api/auth/oauth2/callback/${OIDC_PROVIDER_ID}`;
const OIDC_CALLBACK = `/api/auth/callback/${OIDC_PROVIDER_ID}`;

// A browser attaches the session cookie to any request to this origin, including one
// a page on another origin (a sibling subdomain, say) makes on the visitor's behalf.
// better-auth guards its own /api/auth/* with an origin check; this extends the same
// guard to the rest of the api. It only applies to state-changing, cookie-driven
// requests: an api key or bearer token is not sent automatically by a browser, so it
// is not a CSRF vector (MCP and SCIM use bearer tokens, webhooks are signed), and the
// server-side calls the web makes carry neither Origin nor Sec-Fetch-Site.
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// The api's own origin counts too: the /docs page sends its "Try it" requests from it.
const csrfTrustedOrigins = [...trustedOrigins, new URL(apiUrl).origin];

function isCrossSiteCookieRequest(request: Request): boolean {
  if (CSRF_SAFE_METHODS.has(request.method)) return false;
  if (new URL(request.url).pathname.startsWith('/api/auth/')) return false;
  const cookie = request.headers.get('cookie');
  if (!cookie || !cookie.includes('session_token')) return false;
  if (request.headers.get('authorization') || request.headers.get('x-api-key')) return false;
  const origin = request.headers.get('origin');
  if (origin !== null) return !csrfTrustedOrigins.includes(origin);
  // No Origin: trust Sec-Fetch-Site when the browser sent it, allow its absence
  // (non-browser clients that happen to carry a cookie are not page-driven).
  const site = request.headers.get('sec-fetch-site');
  return site !== null && site !== 'same-origin' && site !== 'none';
}

// The assembled Elysia app, without `.listen()`. `index.ts` imports this and
// binds the port; tests import it and pass it to Eden Treaty to drive routes in
// memory (no network). Keep the chain unbroken so `type App` stays accurate.
export const app = new Elysia()
  .use(
    cors({
      origin: trustedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    }),
  )
  // Before the routes: a hook applies only to the routes registered after it.
  .use(requestTracking)
  .onRequest(({ request, set }) => {
    if (isCrossSiteCookieRequest(request)) {
      set.status = 403;
      return { error: 'Cross-site request refused', code: 'CSRF_ORIGIN_REJECTED' };
    }
  })
  // OAuth discovery metadata endpoints
  // authorization server from protected-resource metadata before entering the
  // Better Auth base path.
  //
  // An issuer with a path is looked up with the path after the well-known segment
  // (RFC 8414 §3), and some clients fall back to OpenID discovery, so each document
  // answers under any suffix; the proxy decides which of these paths reach the api.
  .get('/.well-known/oauth-authorization-server', ({ request }) =>
    oauthAuthorizationServerMetadata(request),
  )
  .get('/.well-known/oauth-authorization-server/*', ({ request }) =>
    oauthAuthorizationServerMetadata(request),
  )
  .get('/.well-known/openid-configuration', ({ request }) => openIdConfiguration(request))
  .get('/.well-known/openid-configuration/*', ({ request }) => openIdConfiguration(request))
  .get('/.well-known/oauth-protected-resource', () => oauthProtectedResourceMetadata())
  .get('/.well-known/oauth-protected-resource/*', () => oauthProtectedResourceMetadata())
  // better-auth: forward every /api/auth/* request to its handler.
  .all('/api/auth/*', async ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === LEGACY_OIDC_CALLBACK) {
      url.pathname = OIDC_CALLBACK;
      request = new Request(url.href, request);
    }
    return auth.handler(request);
  })
  .use(currentUserRoutes)
  // What the sign-in and sign-up screens need before there is a session: whether
  // registration is open, invite-only, or closed, and which sign-in methods are
  // offered. Public on purpose — the screens are reached logged out. It carries no
  // credentials, only the instance's own policy.
  .get(
    '/auth-config',
    async () => {
      const settings = await getAuthSettings();
      const emailEnabled = await hasConfiguredEmailProvider();
      return {
        registration: settings.registration,
        // Only usable when the instance can actually send mail.
        magicLink: settings.magicLink && emailEnabled,
        // Cleared together with the mail provider, so the raw setting is what the
        // sign-up endpoint enforces.
        requireEmailVerification: settings.requireEmailVerification,
        emailEnabled,
        // Whether the email/password form is offered at all. The api refuses to turn
        // it off while no provider below is usable, so this is never false alone.
        emailPassword: settings.emailPassword,
        google: await hasConfiguredGoogle(),
        oidc: await hasConfiguredOidc(),
        // Names the operator's own identity provider, so the button shows it as
        // given. Empty falls back to a translated default.
        oidcLabel: await getOidcLabel(),
        hasUsers: (await db.$count(user)) > 0,
      };
    },
    {
      detail: {
        tags: ['System'],
        summary: "Get the instance's sign-in configuration",
        description:
          'Report the registration policy and the sign-in methods the instance offers, so the ' +
          'sign-in and sign-up screens can render before there is a session. Public.',
      },
    },
  )
  // The sites the instance owner lets show the public pages in a frame, which the web app
  // writes into frame-ancestors on those pages. Public on purpose: the web app's proxy
  // reads it with no session, and every public page names the same sites in its header.
  .get('/embed-sites', () => getEmbedSites(), {
    response: { 200: EmbedSitesSchema },
    detail: {
      tags: ['System'],
      summary: 'Get the sites that may embed public pages',
      description:
        'Report the sites that may show the shared work items and views, and the public ' +
        'pages, in a frame. Public.',
    },
  })
  // Root doubles as the liveness/health endpoint.
  .get('/', () => ({ name: 'nGoal api', status: 'ok' }), {
    detail: {
      tags: ['System'],
      summary: 'Check that the api is up',
      description: 'Liveness probe: returns the api name and `status: "ok"`.',
    },
  })
  // Inbound repository webhook receiver (authenticated by its per-project secret).
  .use(gitWebhookRoutes)
  // Planner API: projects, issues, and their dependent entities.
  .use(planner);

// App type — useful for Eden Treaty (type-safe client) on the frontend and in tests.
export type App = typeof app;
