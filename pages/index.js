import { useState, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import Link from 'next/link';

export default function Home() {
  const [participantName, setParticipantName] = useState('jareer');
  const [sessionDuration, setSessionDuration] = useState(30);
  const [agentName, setAgentName] = useState(''); // optional: LiveKit worker agent name (default PRODUCTION-AGENT)
  const [session, setSession] = useState(null);
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Ready to create session');
  const [loading, setLoading] = useState(false);
  const [audioElements, setAudioElements] = useState([]);
  const [transcription, setTranscription] = useState([]);
  
  // Refs for better LiveKit handling
  const roomRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentAudioSourceRef = useRef(null);

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
      if (agentName && agentName.trim()) {
        params.set('agent_name', agentName.trim());
      }
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
      console.log('Session created:', sessionData);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Create session error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize audio context for high-quality playback
  const initializeAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000,
      });
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  // Add transcription entry
  const addTranscriptionEntry = useCallback((speaker, text, isFinal = true, participantId = null) => {
    if (!text.trim() || !isFinal) return;
    
    const entry = {
      id: `${speaker}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      speaker,
      text: text.trim(),
      participantId
    };
    
    setTranscription(prev => [...prev, entry]);
    console.log(`📝 Transcription: ${speaker} - "${text.trim()}"`);
  }, []);

  const joinSession = async () => {
    if (!session) return;
    
    setLoading(true);
    setStatus('Connecting to room...');

    try {
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      
      roomRef.current = newRoom;

      // Set up transcription event listeners (like your code)
      newRoom.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {
        console.log('📝 LiveKit transcription received:', {
          segmentsCount: segments.length,
          participantId: participant?.identity,
          trackId: publication?.trackSid,
          segments: segments.map(s => ({
            text: s.text,
            final: s.final,
            startTime: s.startTime,
            endTime: s.endTime
          }))
        });

        segments.forEach(segment => {
          const speaker = participant?.identity?.includes('agent') ? 'ai' : 'user';
          addTranscriptionEntry(speaker, segment.text, segment.final, participant?.identity);
        });
      });
      
      newRoom.on(RoomEvent.Connected, async () => {
        console.log('✅ Connected to LiveKit room');
        setIsConnected(true);
        setStatus('Connected to voice chat!');
        setLoading(false);

        // Enable microphone for user input
        try {
          await newRoom.localParticipant.setMicrophoneEnabled(true);
          console.log('🎤 Microphone enabled');
        } catch (error) {
          console.error('❌ Failed to enable microphone:', error);
        }
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from LiveKit room:', reason);
        setIsConnected(false);
        setStatus('Disconnected from voice chat');
        setRoom(null);
        roomRef.current = null;
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('👤 Participant joined:', participant.identity);
        if (participant.identity.includes('agent')) {
          setStatus('🤖 Voice agent joined the conversation!');
        }
      });

      // Handle audio tracks from agent (proper TEXT-to-Speech handling)
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio && participant.identity.includes('agent')) {
          console.log('🎵 Agent audio track received:', {
            participantId: participant.identity,
            trackSid: publication.trackSid,
            muted: publication.isMuted,
            enabled: publication.isEnabled
          });
      
          // Create audio element for playback (like your code)
          const audioElement = track.attach();
          audioElement.autoplay = true;
          audioElement.volume = 1.0;
          audioElement.setAttribute('data-livekit-track', 'agent-audio');
      
          // Store reference
          setAudioElements(prev => [...prev, { element: audioElement, participant: participant.identity }]);
          
          audioElement.onplay = () => {
            console.log('▶️ Agent audio started playing');
            setStatus(`🔊 Agent is speaking`);
          };
      
          audioElement.onended = () => {
            console.log('🔚 Agent audio ended');
            setStatus('🎤 Ready for your response');
          };
      
          audioElement.onerror = (error) => {
            console.error('❌ Agent audio error:', error);
          };

          // Try to play immediately
          audioElement.play().then(() => {
            console.log('Audio playing for:', participant.identity);
            setStatus(`🔊 Audio playing from ${participant.identity}`);
          }).catch((error) => {
            console.warn('Audio play failed, user interaction may be required:', error);
            setStatus(`⚠️ Click "Enable Audio" to hear ${participant.identity}`);
          });
      
          document.body.appendChild(audioElement);
          console.log('🔊 Agent audio element attached to DOM');
        }
      });

      console.log('Connecting to room with:', { ws_url: session.ws_url, token: session.token });
      await newRoom.connect(session.ws_url, session.token);
      
      setRoom(newRoom);
    } catch (error) {
      setStatus(`Connection error: ${error.message}`);
      console.error('Join session error:', error);
      setLoading(false);
    }
  };

  const enableAudio = async () => {
    console.log('Manually enabling audio for all participants');
    for (const { element, participant } of audioElements) {
      try {
        await element.play();
        console.log('Audio enabled for:', participant);
        setStatus(`🔊 Audio enabled for ${participant}`);
      } catch (error) {
        console.error('Failed to enable audio for:', participant, error);
      }
    }
  };

  const leaveSession = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setStatus('Left session');
      
      // Clean up audio elements
      const audioElements = document.querySelectorAll('audio[data-livekit-track]');
      audioElements.forEach((element) => {
        console.log('🧹 Cleaning up audio element');
        element.remove();
      });
      setAudioElements([]);
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
        } catch (error) {
          console.warn('Error closing audio context:', error);
        }
      }
      
      console.log('Left session');
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

      // Clean up audio elements
      audioElements.forEach(({ element }) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      setAudioElements([]);

      const response = await fetch(`/api/sessions/${session.session_id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setStatus('Session ended successfully');
        console.log('Session ended successfully');
      } else {
        setStatus('Session ended locally');
        console.log('Session ended locally, server cleanup may have failed');
      }
      
      setSession(null);
    } catch (error) {
      setStatus(`End session error: ${error.message}`);
      console.error('End session error:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-end mb-4">
          <Link
            href="/config"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
          >
            Configure Agent
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-center mb-8">
          🎤 LiveKit Voice Agent
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

          <div>
            <label className="block text-sm font-medium mb-1">Worker agent name (optional):</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="default: PRODUCTION-AGENT"
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

          {audioElements.length > 0 && (
            <button
              onClick={enableAudio}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              🔊 Enable Audio
            </button>
          )}
        </div>

        {/* Status */}
        <div className="p-4 bg-gray-50 rounded text-center">
          <p className="font-medium">{status}</p>
          {session && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Room: {session.room_name}</p>
              <p>Session ID: {session.session_id}</p>
              <p>Status: {isConnected ? 'Connected' : 'Not Connected'}</p>
              {audioElements.length > 0 && (
                <p>Audio Sources: {audioElements.map(a => a.participant).join(', ')}</p>
              )}
            </div>
          )}
        </div>


        {/* Transcription Display */}
        {transcription.length > 0 && (
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-medium text-purple-800 mb-3">📝 Live Transcription</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {transcription.slice(-5).map((entry) => (
                <div key={entry.id} className="text-sm">
                  <span className="text-xs text-gray-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`ml-2 font-medium ${
                    entry.speaker === 'user' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {entry.speaker === 'user' ? 'You' : 'Agent'}:
                  </span>
                  <span className="ml-1 text-gray-800">{entry.text}</span>
                </div>
              ))}
            </div>
            {transcription.length > 5 && (
              <p className="text-xs text-purple-600 mt-2">
                Showing last 5 messages ({transcription.length} total)
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
