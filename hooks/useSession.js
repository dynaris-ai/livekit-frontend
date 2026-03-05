import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../lib/api-client';

export const useSession = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSession = useCallback(async (participantName, sessionDurationMinutes = 30, userId, agentId) => {
    setLoading(true);
    setError(null);

    try {
      const sessionData = await apiClient.createSession({
        participant_name: participantName,
        session_duration_minutes: sessionDurationMinutes,
        ...(userId != null && { user_id: userId }),
        ...(agentId != null && { agent_id: agentId }),
      });
      
      setSession(sessionData);
      return sessionData;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : `Failed to create session: ${err.message}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSession = useCallback(async (sessionId) => {
    if (!sessionId) return null;

    setLoading(true);
    setError(null);

    try {
      const sessionData = await apiClient.getSession(sessionId);
      return sessionData;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : `Failed to get session: ${err.message}`;
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const endSession = useCallback(async (sessionId) => {
    if (!sessionId) return false;

    setLoading(true);
    setError(null);

    try {
      await apiClient.endSession(sessionId);
      setSession(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : `Failed to end session: ${err.message}`;
      setError(errorMessage);
      // Still clear local session even if server request fails
      setSession(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const listSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const sessionsData = await apiClient.listSessions();
      return sessionsData;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : `Failed to list sessions: ${err.message}`;
      setError(errorMessage);
      return { active_sessions: 0, sessions: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    session,
    loading,
    error,
    createSession,
    getSession,
    endSession,
    listSessions,
    clearSession,
    clearError
  };
};
