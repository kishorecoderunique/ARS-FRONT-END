async function reverseGeocode(config, lat, lng) {
  if (!config.geocodingKey) return 'Unknown location';
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', config.geocodingKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Geocoding request failed with status ${response.status}.`);
    const data = await response.json();
    return data.status === 'OK' && data.results?.[0]?.formatted_address
      ? data.results[0].formatted_address
      : 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    return 'Unknown location';
  }
}

module.exports = { reverseGeocode };
