// Vercel Serverless Function: /api/token
// Returns a short-lived Deepgram temporary token for the voice agent

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.error('DEEPGRAM_API_KEY is not set');
    return res.status(500).json({ error: 'Voice agent not configured' });
  }

  try {
    // Request a temporary token from Deepgram
    const response = await fetch('https://api.deepgram.com/v1/auth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Scope the token to only what's needed for the voice agent
        scope: [
          'agent:corp:read',      // Read agent configuration
          'agent:corp:write',     // Write agent configuration  
          'agent:service:read',   // Read agent service
          'agent:service:write',  // Write agent service
        ],
        // Token expires in 1 hour
        expiration_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        // Restrict to specific origins in production
        // tags: ['finous-voice'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram token request failed:', response.status, errorText);
      return res.status(502).json({ error: 'Failed to obtain voice token' });
    }

    const data = await response.json();

    // Return the token to the client
    return res.status(200).json({
      token: data.token,
      expires: data.expires,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
