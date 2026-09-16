import { API_BASE_URL } from '../config/constants.js';

// Default request timeout (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Login request timeout (60 seconds — allows for cold start)
const LOGIN_TIMEOUT = 60000;

/**
 * Base API wrapper with timeout, auth headers, and error handling.
 * @param {string} endpoint - API path (e.g., '/api/projects')
 * @param {object} options - Fetch options (method, body, headers, timeout)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function api(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Determine timeout: use provided, or longer for login, or default
  const timeout =
    options.timeout ||
    (endpoint.includes('/auth/login') ? LOGIN_TIMEOUT : DEFAULT_TIMEOUT);

  // Set up abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const config = {
    credentials: 'include',
    headers,
    signal: controller.signal,
    ...options,
  };

  // Remove custom `timeout` so fetch doesn't reject unknown option
  delete config.timeout;

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    // Clear timeout once response is received
    clearTimeout(timeoutId);

    // Handle 401 – expired or invalid token (but NOT on login page)
    if (response.status === 401 && !location.hash.startsWith('#login')) {
      localStorage.removeItem('token');
      document.body.classList.remove('app-dashboard');
      location.hash = '#login';
      throw new Error('Session expired. Please login again.');
    }

    // Handle non-OK responses
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Something went wrong');
    }

    // Return parsed JSON
    return response.json();
  } catch (err) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);

    // Handle abort/timeout specifically
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }

    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Cannot reach server. Please check your connection.');
    }

    // Re-throw other errors
    throw err;
  }
}
