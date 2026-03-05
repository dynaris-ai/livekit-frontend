import { useState } from 'react';
import { Room } from 'livekit-client';

export default function SimpleLiveKitDemo() {
  const [participantName, setParticipantName] = useState('jareer');
  const [sessionDuration, setSessionDuration] = useState(30);
  const [session, setSession] = useState(null);
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Ready to create session');
  const [loading, setLoading] = useState(false);

  const BASE_URL = 'http://localhost:8000';

  const USER_ID = 'QE95OWD7ICDWGqFm4STJuv1qgTfWRtP7';
  const AGENT_ID = '5edd2707-f8bf-4aea-b092-70c8825102a2';

  const createSession = async () => {
    setLoading(true);
    setStatus('Creating session...');
    
    try {
      const params = new URLSearchParams({
        user_id: USER_ID,
        agent_id: AGENT_ID,
        participant_name: participantName,
        session_duration_minutes: String(sessionDuration),
      });
      // Use relative URL so request goes through Next.js (avoids CORS)
      const response = await fetch(`/api/sessions/create?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const sessionData = await response.json();
      setSession(sessionData);
      setStatus(`Session created: ${sessionData.room_name}`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!session) return;
    
    setLoading(true);
    setStatus('Connecting to room...');

    try {
      const newRoom = new Room();
      
      newRoom.on('connected', () => {
        setIsConnected(true);
        setStatus('Connected to voice chat!');
        setLoading(false);
      });

      newRoom.on('disconnected', () => {
        setIsConnected(false);
        setStatus('Disconnected from voice chat');
        setRoom(null);
      });

      await newRoom.connect(session.ws_url, session.token);
      await newRoom.localParticipant.enableCameraAndMicrophone(false, true);
      
      setRoom(newRoom);
    } catch (error) {
      setStatus(`Connection error: ${error.message}`);
      setLoading(false);
    }
  };

  const leaveSession = async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setStatus('Left session');
    }
  };

  const endSession = async () => {
    if (!session) return;

    setLoading(true);
    
    try {
      if (room) {
        await room.disconnect();
        setRoom(null);
        setIsConnected(false);
      }

      const response = await fetch(`/api/sessions/${session.session_id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setStatus('Session ended successfully');
      } else {
        setStatus('Session ended locally');
      }
      
      setSession(null);
    } catch (error) {
      setStatus(`End session error: ${error.message}`);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-8">
          🎤 Simple LiveKit Demo
        </h1>

        {/* Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name:</label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={session !== null}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Duration (minutes):</label>
            <input
              type="number"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(parseInt(e.target.value))}
              min="1"
              max="120"
              className="w-full p-2 border rounded"
              disabled={session !== null}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <button
            onClick={createSession}
            disabled={session !== null || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading && !session ? 'Creating...' : 'Create Session'}
          </button>

          <button
            onClick={joinSession}
            disabled={!session || isConnected || loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading && session && !isConnected ? 'Joining...' : 'Join Voice Chat'}
          </button>

          <button
            onClick={leaveSession}
            disabled={!isConnected}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
          >
            Leave Session
          </button>

          <button
            onClick={endSession}
            disabled={!session}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            End Session
          </button>
        </div>

        {/* Status */}
        <div className="p-4 bg-gray-50 rounded text-center">
          <p className="font-medium">{status}</p>
          {session && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Room: {session.room_name}</p>
              <p>Session ID: {session.session_id}</p>
              <p>Status: {isConnected ? 'Connected' : 'Not Connected'}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-medium text-blue-800 mb-2">How to test:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Make sure your backend is running on localhost:8000</li>
            <li>2. Click "Create Session" to create a room</li>
            <li>3. Click "Join Voice Chat" to connect with audio</li>
            <li>4. Your voice agent should join automatically</li>
            <li>5. Click "End Session" when done</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
