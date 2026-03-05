const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await backendRes.json().catch(() => ({}));
    res.status(backendRes.status).json(data);
  } catch (error) {
    console.error('Session close proxy error:', error);
    res.status(502).json({ error: 'Backend unavailable' });
  }
}
