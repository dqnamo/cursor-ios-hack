function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function withProtocol(value: string) {
  return /^https?:\/\//u.test(value) ? value : `https://${value}`;
}

/**
 * Resolves the app's public base URL without requiring any custom env var.
 * Prefers an explicit APP_BASE_URL override, then falls back to Vercel's
 * built-in production/deployment URLs.
 */
export function resolveAppBaseUrl(): string | null {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) {
    return stripTrailingSlash(withProtocol(explicit));
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionUrl) {
    return `https://${productionUrl}`;
  }

  const deploymentUrl = process.env.VERCEL_URL;
  if (deploymentUrl) {
    return `https://${deploymentUrl}`;
  }

  return null;
}

export function getWardrobeUrl(telegramId: string): string | null {
  const base = resolveAppBaseUrl();
  if (!base) {
    return null;
  }

  return `${base}/wardrobe/${encodeURIComponent(telegramId)}`;
}
