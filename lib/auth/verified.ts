interface AuthIdentity {
  provider?: string;
}

interface VerifiedUser {
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: AuthIdentity[] | null;
}

export function hasVerifiedEmail(user: VerifiedUser) {
  if (user.email_confirmed_at) return true;
  const providers = [
    user.app_metadata?.provider,
    ...(user.app_metadata?.providers ?? []),
    ...(user.identities ?? []).map((identity) => identity.provider),
  ];
  return providers.some((provider) => Boolean(provider) && provider !== "email");
}
