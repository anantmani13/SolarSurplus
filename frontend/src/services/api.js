/**
 * API Service — communicates with the FastAPI backend.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a solar surplus forecast based on user inputs.
 */
export async function generateForecast(userInput) {
  return fetchAPI('/api/predict/forecast', {
    method: 'POST',
    body: JSON.stringify(userInput),
  });
}

/**
 * Fetch weather forecast for a location.
 */
export async function getWeatherForecast(lat, lon, days = 7) {
  return fetchAPI(`/api/weather/forecast?lat=${lat}&lon=${lon}&days=${days}`);
}

/**
 * Health check the backend server.
 */
export async function checkHealth() {
  try {
    const data = await fetchAPI('/health');
    return data.status === 'healthy';
  } catch {
    return false;
  }
}
