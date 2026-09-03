/**
 * Address Normalizer utility.
 * Standardizes extracted raw registration addresses using DaData Suggestions API (if API key is present)
 * or falls back to local regex-based cleaning and formatting.
 */

export interface NormalizedAddressResult {
  formattedAddress: string;
  postalCode?: string;
  city?: string;
  street?: string;
  house?: string;
  flat?: string;
}

export async function normalizeRegistrationAddress(
  rawAddress: string,
  dadataApiKey?: string
): Promise<NormalizedAddressResult> {
  if (!rawAddress || !rawAddress.trim()) {
    return { formattedAddress: '' };
  }

  const cleanRaw = rawAddress
    .replace(/^(?:штамп|зарегистрирован(?:а)?|место\s*жительства|по\s*адресу:?)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Try DaData Suggestions API if key is available
  const apiKey = dadataApiKey || (import.meta as any).env?.VITE_DADATA_API_KEY;
  if (apiKey && cleanRaw.length > 5) {
    try {
      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${apiKey}`
        },
        body: JSON.stringify({ query: cleanRaw, count: 1 })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && data.suggestions.length > 0) {
          const s = data.suggestions[0];
          return {
            formattedAddress: s.value || cleanRaw,
            postalCode: s.data?.postal_code || undefined,
            city: s.data?.city || s.data?.settlement || undefined,
            street: s.data?.street || undefined,
            house: s.data?.house || undefined,
            flat: s.data?.flat || undefined
          };
        }
      }
    } catch (err) {
      console.warn('DaData address normalization request failed, using local normalization', err);
    }
  }

  // 2. Local fallback cleaning
  let formatted = cleanRaw;
  formatted = formatted
    .replace(/\bг\s+([А-Яа-я])/g, 'г. $1')
    .replace(/\bгор\s+([А-Яа-я])/g, 'г. $1')
    .replace(/\bул\s+([А-Яа-я])/g, 'ул. $1')
    .replace(/\bпер\s+([А-Яа-я])/g, 'пер. $1')
    .replace(/\bпр\s+([А-Яа-я])/g, 'пр-кт $1')
    .replace(/\bд\s+(\d+)/g, 'д. $1')
    .replace(/\bк\s+(\d+)/g, 'корп. $1')
    .replace(/\bкв\s+(\d+)/g, 'кв. $1');

  return { formattedAddress: formatted };
}
