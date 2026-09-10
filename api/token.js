// Vercel Serverless Function: /api/token
// Returns a short-lived Deepgram temporary token for the voice agent
//
// Environment variables needed (set in Vercel dashboard):
// - DEEPGRAM_API_KEY: Your Deepgram API key
//
// API Reference: https://developers.deepgram.com/reference/auth/tokens/grant

export default async function handler(req, res) {
  // Allow CORS for the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.error('DEEPGRAM_API_KEY is not set in environment variables');
    return res.status(500).json({ 
      error: 'Voice agent not configured. Please set DEEPGRAM_API_KEY in Vercel dashboard.' 
    });
  }

  try {
    // Create a short-lived token using Deepgram's Token Grant API
    // POST https://api.deepgram.com/v1/auth/tokens
    // Returns a JWT with usage::write permission for voice APIs
    const response = await fetch('https://api.deepgram.com/v1/auth/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Token valid for 1 hour (3600 seconds)
        // The SDK handles reconnection and token refresh automatically
        ttl_seconds: 3600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram token grant failed:', response.status, errorText);
      return res.status(502).json({ error: 'Failed to obtain voice token from Deepgram' });
    }

    const data = await response.json();

    // Return the token to the client
    // The Deepgram SDK uses this as a Bearer token in the WebSocket Sec-WebSocket-Protocol header
    return res.status(200).json({
      token: data.access_token,
      expires: data.expires_in,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ error: 'Internal server error generating token' });
  }
}
