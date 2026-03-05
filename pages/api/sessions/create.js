const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default async function handler(req, res) {
  // Allow CORS preflight so browser can call this same-origin without CORS issues
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, agent_id, participant_name, session_duration_minutes } = req.query;

  if (!user_id || !agent_id) {
    return res.status(400).json({ error: 'Missing user_id or agent_id' });
  }

  const params = new URLSearchParams({
    user_id,
    agent_id,
    participant_name: participant_name || 'jareer',
    session_duration_minutes: session_duration_minutes || '30',
  });

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/sessions/create?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await backendRes.json().catch(() => ({}));
    res.status(backendRes.status).json(data);
  } catch (error) {
    console.error('Session create proxy error:', error);
    res.status(502).json({ error: 'Backend unavailable' });
  }
}
