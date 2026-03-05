import { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSession';
import { useLiveKit } from '../hooks/useLiveKit';
import { StatusMessage } from './StatusMessage';
import { SessionInfo } from './SessionInfo';
import { AudioControls } from './AudioControls';
import { SessionsList } from './SessionsList';
import { BackendStatus } from './BackendStatus';
import Link from 'next/link';

export const VoiceAgentDemo = () => {
  const [participantName, setParticipantName] = useState('jareer');
  const [sessionDuration, setSessionDuration] = useState(30);
  const [serverUrl, setServerUrl] = useState('http://localhost:8000');
  const [status, setStatus] = useState({ message: 'Ready to create a voice agent session', type: 'info' });

  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    createSession,
    endSession,
    clearSession
  } = useSession();

  const {
    room,
    isConnected,
    isConnecting,
    error: roomError,
    participants,
    connectToRoom,
    disconnectFromRoom,
    toggleMicrophone,
    getMicrophoneEnabled
  } = useLiveKit();

  // Update status based on current state
  useEffect(() => {
    if (sessionError) {
      setStatus({ message: `Session error: ${sessionError}`, type: 'error' });
    } else if (roomError) {
      setStatus({ message: `Connection error: ${roomError}`, type: 'error' });
    } else if (isConnected) {
      setStatus({ message: 'Connected to voice chat!', type: 'success' });
    } else if (isConnecting) {
      setStatus({ message: 'Connecting to voice chat...', type: 'info' });
    } else if (session && !isConnected) {
      setStatus({ message: `Session created successfully! Room: ${session.room_name}`, type: 'success' });
    } else if (sessionLoading) {
      setStatus({ message: 'Creating session...', type: 'info' });
    } else {
      setStatus({ message: 'Ready to create a voice agent session', type: 'info' });
    }
  }, [sessionError, roomError, isConnected, isConnecting, session, sessionLoading]);

  const handleCreateSession = async () => {
    try {
      await createSession(participantName, sessionDuration);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!session) {
      setStatus({ message: 'No session available to join', type: 'error' });
      return;
    }

    try {
      await connectToRoom(session.ws_url, session.token);
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleLeaveSession = async () => {
    await disconnectFromRoom();
    setStatus({ message: 'Left voice chat', type: 'info' });
  };

  const handleEndSession = async () => {
    if (!session) {
      setStatus({ message: 'No session to end', type: 'error' });
      return;
    }

    try {
      // Leave the room first
      await disconnectFromRoom();
      
      // End the session on the server
      const success = await endSession(session.session_id);
      
      if (success) {
        setStatus({ message: 'Session ended successfully', type: 'success' });
      } else {
        setStatus({ message: 'Session ended locally (server cleanup may have failed)', type: 'warning' });
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const getButtonState = () => {
    if (isConnected) return 'joined';
    if (session) return 'created';
    return 'initial';
  };

  const buttonState = getButtonState();
  const audioStatus = isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Demo Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  🎤 LiveKit Voice Agent Demo
                </h1>
                <div className="flex justify-center">
                  <Link
                    href="/config"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                  >
                    Configure Agent
                  </Link>
                </div>
                <BackendStatus serverUrl={serverUrl} />
              </div>

              {/* Configuration Form */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name:
                  </label>
                  <input
                    type="text"
                    id="participantName"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={session !== null}
                  />
                </div>

                <div>
                  <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Session Duration (minutes):
                  </label>
                  <input
                    type="number"
                    id="sessionDuration"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                    min="1"
                    max="120"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={session !== null}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Backend Server URL:
                  </label>
                  <input
                    type="text"
                    id="serverUrl"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={session !== null}
                    placeholder="http://localhost:8000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your backend server URL with session management endpoints
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center mb-8">
                <button
                  onClick={handleCreateSession}
                  disabled={buttonState !== 'initial' || sessionLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sessionLoading && <div className="spinner"></div>}
                  Create Session
                </button>

                <button
                  onClick={handleJoinSession}
                  disabled={buttonState !== 'created' || isConnecting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isConnecting && <div className="spinner"></div>}
                  Join Voice Chat
                </button>

                <button
                  onClick={handleLeaveSession}
                  disabled={buttonState !== 'joined'}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Leave Session
                </button>

                <button
                  onClick={handleEndSession}
                  disabled={buttonState === 'initial'}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  End Session
                </button>
              </div>

              {/* Status Message */}
              <StatusMessage
                message={status.message}
                type={status.type}
                visible={true}
              />

              {/* Session Information */}
              {session && (
                <div className="mt-8">
                  <SessionInfo
                    session={session}
                    isConnected={isConnected}
                    audioStatus={audioStatus}
                  />
                </div>
              )}

              {/* Audio Controls */}
              <div className="mt-8">
                <AudioControls
                  room={room}
                  isConnected={isConnected}
                  onToggleMicrophone={toggleMicrophone}
                  getMicrophoneEnabled={getMicrophoneEnabled}
                />
              </div>

              {/* Participants Info */}
              {participants.length > 0 && (
                <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">
                    Participants ({participants.length})
                  </h3>
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.sid} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-blue-700">
                          {participant.identity}
                          {participant.identity.includes('agent') && ' (Voice Agent)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sessions List Panel */}
          <div className="lg:col-span-1">
            <SessionsList autoRefresh={true} />
          </div>
        </div>
      </div>
    </div>
  );
};
