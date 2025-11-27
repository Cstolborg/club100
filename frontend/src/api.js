import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get access token for Spotify Web Playback SDK
 */
export const getToken = async () => {
  try {
    const response = await api.get('/api/token');
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get token:', error);
    throw new Error('Failed to authenticate. Please log in again.');
  }
};

/**
 * Search for artists by name
 * @param {string} query - Artist name to search for
 */
export const searchArtists = async (query) => {
  try {
    if (!query || query.trim() === '') {
      return [];
    }
    const response = await api.get('/api/search', {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to search artists:', error);
    throw new Error('Failed to search artists. Please try again.');
  }
};

/**
 * Fetch top 10 tracks for each of 10 artists
 * @param {string[]} artistIds - Array of exactly 10 Spotify artist IDs
 */
export const fetchTracks = async (artistIds) => {
  try {
    if (artistIds.length !== 10) {
      throw new Error('Must provide exactly 10 artist IDs');
    }
    const response = await api.post('/api/tracks', {
      artist_ids: artistIds,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tracks:', error);
    throw new Error('Failed to fetch tracks. Please try again.');
  }
};

/**
 * Start playback for a specific minute/track
 * @param {string} deviceId - Spotify device ID
 * @param {string} trackUri - Spotify track URI
 * @param {number} durationMs - Track duration in milliseconds
 */
export const playMinute = async (deviceId, trackUri, durationMs) => {
  try {
    const response = await api.post('/api/play-minute', {
      device_id: deviceId,
      track_uri: trackUri,
      duration_ms: durationMs,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to play track:', error);
    if (error.response?.status === 404) {
      throw new Error('Device not found. Make sure Spotify player is active.');
    }
    throw new Error('Failed to play track. Please try again.');
  }
};

/**
 * Get available Spotify devices
 * Used to verify that the Web Playback SDK device is registered
 */
export const getDevices = async () => {
  try {
    const response = await api.get('/api/devices');
    return response.data.devices;
  } catch (error) {
    console.error('Failed to get devices:', error);
    throw new Error('Failed to get devices. Please try again.');
  }
};

/**
 * Check backend health and authentication status
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Failed to check health:', error);
    return { status: 'unhealthy', has_tokens: false };
  }
};

/**
 * Get login URL (redirects to Spotify OAuth)
 */
export const getLoginUrl = () => {
  return `${API_BASE_URL}/login`;
};
