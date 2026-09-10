// Vercel Serverless Function: /api/token
// Returns a short-lived Deepgram temporary token for the voice agent
//
// ⚠️ PREVIEW BUILD: Uses hardcoded API key as fallback
// For production, set DEEPGRAM_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use environment variable first, fall back to hardcoded key (preview only)
  const apiKey = process.env.DEEPGRAM_API_KEY || '13f24d75e9b08c53977e73255a4c175f765df2ad';

  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl_seconds: 3600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram token grant failed:', response.status, errorText);
      return res.status(502).json({ error: 'Failed to obtain voice token from Deepgram' });
    }

    const data = await response.json();

    return res.status(200).json({
      token: data.access_token,
      expires: data.expires_in,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ error: 'Internal server error generating token' });
  }
}
