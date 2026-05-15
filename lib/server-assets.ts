export const resolveServerAssetUrl = (
  value?: string | null,
): string | undefined => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = trimmed.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : trimmed;
};
