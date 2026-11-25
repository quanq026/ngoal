import { runtimeEnv } from './runtimeEnv';

// The product name shown to users: the login panel, the passkey label in the OS
// picker, and the account page. It is defined once, so a rebrand is one edit.
export const APP_NAME = 'nGoal';

// The product site root.
export const APP_SITE_URL = '/';

// Optional external template gallery rules URL (unused in standalone nGoal).
export const TEMPLATE_GALLERY_RULES_URL = '';

// The places that link to the Pro page. The site keeps its own list of these values, so a
// new one goes there too.
export type ProFeature =
  | 'agent-analytics'
  | 'agent-budgets'
  | 'asana-import'
  | 'audit-log'
  | 'email-domains'
  | 'forms'
  | 'http-tools'
  | 'jira-import'
  | 'portal'
  | 'schedules'
  | 'scim'
  | 'sidebar'
  | 'sso'
  | 'workflows'
  | 'workspace-dashboard'
  | 'workspaces';

// The page about the other editions, linked wherever the app names what they add. The UTM
// tags tell the site which place in the app the visitor came from.
export function proUrl(_feature: ProFeature): string {
  return '/';
}

// The legal document URLs, linked from the logged-out screens: Google requires the
// privacy policy and terms registered for the OAuth client to be reachable before
// consent is given. Each instance points these at its own documents through its
// environment (see runtimeEnv); when unset, the legal notice is hidden.
export const PRIVACY_POLICY_URL = runtimeEnv().privacyUrl;
export const TERMS_URL = runtimeEnv().termsUrl;
