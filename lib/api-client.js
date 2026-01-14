// API Client for LiveKit Voice Agent Backend
// Base URL: http://localhost:8000

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
// Use Next.js API proxy for voice agent requests to avoid CORS issues
const VOICEAGENT_URL = process.env.NEXT_PUBLIC_VOICEAGENT_URL || '';

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If we can't parse the error response, use the default message
    }
    
    throw new ApiError(errorMessage, response.status, response);
  }
  
  return response.json();
};

export const apiClient = {
  /**
   * Create a new voice session
   * @param {Object} params - Session parameters
   * @param {string} [params.participant_name="User"] - Participant name
   * @param {number} [params.session_duration_minutes=30] - Session duration in minutes
   * @returns {Promise<Object>} Session object with session_id, room_name, ws_url, token, expires_at
   */
  async createSession(params = {}) {
    const response = await fetch(`${BASE_URL}/api/sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_name: params.participant_name || 'User',
        session_duration_minutes: params.session_duration_minutes || 30,
      }),
    });

    return handleResponse(response);
  },

  /**
   * Get session information
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session information
   */
  async getSession(sessionId) {
    const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      method: 'GET',
    });

    return handleResponse(response);
  },

  /**
   * End a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Success message
   */
  async endSession(sessionId) {
    const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    return handleResponse(response);
  },

  /**
   * List all active sessions
   * @returns {Promise<Object>} Object with active_sessions count and sessions array
   */
  async listSessions() {
    const response = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'GET',
    });

    return handleResponse(response);
  },

  /**
   * Check backend health/connectivity
   * @returns {Promise<boolean>} True if backend is reachable
   */
  async checkHealth() {
    try {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      return false;
    }
  },

  /**
   * Update per-user voice agent configuration (querystring params)
   * POST /voiceagent/config?user_id=...&agent_type=...&...
   * @param {string} userId
   * @param {string} agentType
   * @param {Object} config
   * @returns {Promise<any>}
   */
  async updateVoiceAgentConfig(userId, agentType, config = {}) {
    const params = new URLSearchParams();
    params.set('user_id', userId);
    params.set('agent_type', agentType);

    Object.entries(config).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // tools is an array -> repeat param: tools=a&tools=b
      if (key === 'tools' && Array.isArray(value)) {
        value
          .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
          .filter(Boolean)
          .forEach((tool) => params.append('tools', tool));
        return;
      }

      // omit empty strings to preserve backend defaults
      if (typeof value === 'string' && value.trim() === '') return;

      params.set(key, String(value));
    });

    const response = await fetch(`/api/voiceagent/config?${params.toString()}`, {
      method: 'POST',
    });

    return handleResponse(response);
  },
};

// Export types for TypeScript users
export const SessionStatus = {
  CREATED: 'created',
  EXPIRED: 'expired',
  ENDED: 'ended',
};

// Export the ApiError class for error handling
export { ApiError };
