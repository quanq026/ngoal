import { readSecret, writeSecret } from '@repo/db';
import { decryptSecret, encryptSecret, type EncryptedSecret } from '@repo/crypto';
import { HttpError } from '#shared/lib';
import { connectGitProvider } from './connections-service';

interface OAuthStatePayload {
  teamId: number;
  userId: string;
  returnTo: string;
  exp: number;
}

interface StoredGitHubOAuthConfig {
  clientId?: string;
  clientSecret?: string;
}

const GITHUB_OAUTH_SECRET_KEY = 'git.oauth.github';
const STATE_TTL_MS = 10 * 60 * 1000;

function trimOrigin(raw: string | undefined, fallback: string): string {
  return (raw?.trim() || fallback).replace(/\/+$/, '');
}

async function resolveOAuthConfig() {
  const stored = await readSecret<StoredGitHubOAuthConfig>(GITHUB_OAUTH_SECRET_KEY);
  const clientId = stored?.clientId?.trim() || process.env.GITHUB_OAUTH_CLIENT_ID?.trim() || '';
  const clientSecret =
    stored?.clientSecret?.trim() || process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim() || '';
  const apiUrl = trimOrigin(process.env.API_URL, 'http://localhost:3000');
  const appUrl = trimOrigin(process.env.APP_URL, 'http://localhost:3001');
  const callbackUrl = `${apiUrl}/git/oauth/github/callback`;
  return { clientId, clientSecret, apiUrl, appUrl, callbackUrl };
}

function sanitizeReturnTo(raw: string | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

function appendQuery(baseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function getGitHubOAuthStatus() {
  const { clientId, clientSecret, appUrl, callbackUrl } = await resolveOAuthConfig();
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    hasClientSecret: Boolean(clientSecret),
    callbackUrl,
    homepageUrl: appUrl,
  };
}

export async function saveGitHubOAuthConfig(input: {
  clientId: string;
  clientSecret?: string;
}) {
  const clientId = input.clientId.trim();
  if (!clientId) throw new HttpError(400, 'Client ID is required');
  const current = await resolveOAuthConfig();
  const clientSecret = input.clientSecret?.trim() || current.clientSecret;
  if (!clientSecret) throw new HttpError(400, 'Client Secret is required');

  await writeSecret(
    GITHUB_OAUTH_SECRET_KEY,
    { clientId, clientSecret },
    { clientId, hasClientSecret: true },
  );
  return getGitHubOAuthStatus();
}

export async function startGitHubOAuth(
  teamId: number,
  userId: string,
  returnTo?: string,
): Promise<string> {
  const { clientId, clientSecret, callbackUrl } = await resolveOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new HttpError(
      503,
      'GitHub OAuth is not configured (set Client ID and Client Secret first)',
    );
  }
  const payload: OAuthStatePayload = {
    teamId,
    userId,
    returnTo: sanitizeReturnTo(returnTo),
    exp: Date.now() + STATE_TTL_MS,
  };
  const encrypted = encryptSecret(JSON.stringify(payload));
  const state = Buffer.from(JSON.stringify(encrypted), 'utf8').toString('base64url');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', 'repo admin:repo_hook');
  url.searchParams.set('state', state);
  return url.toString();
}

function decodeState(rawState: string | undefined): OAuthStatePayload {
  if (!rawState) throw new HttpError(400, 'Missing OAuth state');
  let encrypted: EncryptedSecret;
  try {
    encrypted = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8')) as EncryptedSecret;
  } catch {
    throw new HttpError(400, 'Invalid OAuth state');
  }
  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(decryptSecret(encrypted)) as OAuthStatePayload;
  } catch {
    throw new HttpError(400, 'Invalid or tampered OAuth state');
  }
  if (!payload || typeof payload.teamId !== 'number' || typeof payload.userId !== 'string') {
    throw new HttpError(400, 'Invalid OAuth state payload');
  }
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    throw new HttpError(400, 'OAuth session expired, please try again');
  }
  return {
    teamId: payload.teamId,
    userId: payload.userId,
    returnTo: sanitizeReturnTo(payload.returnTo),
    exp: payload.exp,
  };
}

export async function completeGitHubOAuth(input: {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  currentUserId?: string | null;
}): Promise<string> {
  const { clientId, clientSecret, appUrl, callbackUrl } = await resolveOAuthConfig();
  const payload = decodeState(input.state);

  if (input.currentUserId && input.currentUserId !== payload.userId) {
    return appendQuery(appUrl, payload.returnTo, {
      github_oauth: 'error',
      message: 'Session mismatch, please try again',
    });
  }

  if (input.error || !input.code) {
    return appendQuery(appUrl, payload.returnTo, {
      github_oauth: 'error',
      message: input.errorDescription || input.error || 'GitHub authorization was canceled',
    });
  }

  if (!clientId || !clientSecret) {
    return appendQuery(appUrl, payload.returnTo, {
      github_oauth: 'error',
      message: 'GitHub OAuth is not configured on the server',
    });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: input.code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      return appendQuery(appUrl, payload.returnTo, {
        github_oauth: 'error',
        message:
          tokenJson.error_description || tokenJson.error || 'Failed to exchange GitHub OAuth code',
      });
    }

    await connectGitProvider(payload.teamId, {
      provider: 'github',
      baseUrl: 'https://github.com',
      token: tokenJson.access_token,
    });

    return appendQuery(appUrl, payload.returnTo, {
      github_oauth: 'connected',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not connect GitHub account';
    return appendQuery(appUrl, payload.returnTo, {
      github_oauth: 'error',
      message,
    });
  }
}
