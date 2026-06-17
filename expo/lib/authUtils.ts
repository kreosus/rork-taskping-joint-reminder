export type AuthProviderType = "google" | "facebook" | "phone" | "apple";

export interface AppUser {
  id: string;
  name: string;
  provider: AuthProviderType;
  identifier: string;
  createdAt: number;
}

export interface StoredUserCandidate {
  id?: unknown;
  name?: unknown;
  provider?: unknown;
  identifier?: unknown;
  createdAt?: unknown;
}

export function isAuthProvider(value: unknown): value is AuthProviderType {
  return value === "google" || value === "facebook" || value === "phone" || value === "apple";
}

export function normalizeIdentifier(provider: AuthProviderType, identifier: string): string {
  const trimmed = identifier.trim();
  if (provider === "phone") return trimmed.replace(/[^+\d]/g, "");
  // Apple identifiers are opaque, case-sensitive user IDs (or a private-relay email), so don't lowercase.
  if (provider === "apple") return trimmed;
  return trimmed.toLowerCase();
}

export function isValidIdentifier(provider: AuthProviderType, normalized: string): boolean {
  if (provider === "phone") return /^\+?\d{10,15}$/.test(normalized);
  // Apple may return an opaque user ID rather than an email, so accept any non-empty value.
  if (provider === "apple") return normalized.length > 0;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function sanitizeUser(candidate: StoredUserCandidate): AppUser | null {
  if (typeof candidate.id !== "string") return null;
  if (typeof candidate.name !== "string") return null;
  if (!isAuthProvider(candidate.provider)) return null;
  if (typeof candidate.identifier !== "string") return null;
  if (typeof candidate.createdAt !== "number") return null;
  const identifier = normalizeIdentifier(candidate.provider, candidate.identifier);
  if (!isValidIdentifier(candidate.provider, identifier)) return null;
  return {
    id: candidate.id,
    name: candidate.name,
    provider: candidate.provider,
    identifier,
    createdAt: candidate.createdAt,
  };
}
