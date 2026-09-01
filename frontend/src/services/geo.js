/**
 * Reverse geocoding helper (free, no API key).
 * Uses BigDataCloud's reverse-geocode-client to resolve coordinates
 * into locality / state / country names.
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?` +
      `latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
    const data = await res.json();
    return {
      locality: data.locality || data.city || data.district || '',
      district: data.district || '',
      state: data.principalSubdivision || '',
      country: data.countryName || data.country_code || '',
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return null;
  }
}

export function formatLocationName(geo) {
  if (!geo) return null;
  const parts = [];
  for (const key of ['locality', 'district', 'state', 'country']) {
    const value = (geo[key] || '').trim();
    if (value && parts[parts.length - 1] !== value) parts.push(value);
  }
  return parts.join(', ') || null;
}

export function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  return `${Number(latitude).toFixed(2)}°N, ${Number(longitude).toFixed(2)}°E`;
}