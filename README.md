# Finous Voice

A production-ready voice-based financial literacy and tax information agent built with Deepgram Voice Agent API.

## ⚠️ IMPORTANT: API Keys Required

This is a **real voice agent** that requires API keys to function. It is NOT a demo.

### Required Setup

1. **Deepgram API Key** (required)
   - Sign up at https://deepgram.com/
   - Get your API key from the Deepgram Console
   - Add it to Vercel environment variables as `DEEPGRAM_API_KEY`

2. **OpenAI API Key** (required - configured in Deepgram Console)
   - Get your OpenAI API key from https://platform.openai.com/
   - Add it to your Deepgram Console under "LLM Providers"
   - This allows Deepgram to proxy requests to GPT-4o-mini

### Without API Keys

The app will not work without proper API keys. You will see connection errors when trying to use the voice agent.

## Features

- **Real-time voice conversation** using Deepgram Voice Agent API
- **Speech-to-text**: Deepgram Nova-3
- **LLM**: GPT-4o-mini (via Deepgram managed LLM)
- **Text-to-speech**: Deepgram Aura-2
- **Financial literacy focus**: Explains concepts in plain English
- **Compliance-first**: Information only, never advice
- **Mobile-first design**: Works beautifully on all devices
- **Text input fallback**: For users who prefer typing

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Voice SDK**: @deepgram/react (official Deepgram SDK)
- **Backend**: Vercel Serverless Functions (for token generation)
- **Voice API**: Deepgram Voice Agent API

## Project Structure

```
finous-voice/
├── src/
│   ├── App.tsx          # Main voice agent UI
│   ├── main.tsx         # React entry point
│   └── index.css        # Tailwind + custom styles
├── api/
│   └── token.js         # Serverless function for Deepgram tokens
├── index.html           # HTML entry
├── vercel.json          # Vercel routing config
├── package.json         # Dependencies
├── .env.example         # Environment variable template
└── README.md            # This file
```

## Deployment to Vercel

### Step 1: Configure Deepgram Console

1. Go to https://console.deepgram.com/
2. Navigate to your project settings
3. Under "LLM Providers", add your OpenAI API key
4. This allows Deepgram to proxy LLM requests to OpenAI

### Step 2: Deploy to Vercel

1. Push this repository to GitHub
2. Import the repository in Vercel dashboard
3. **Add Environment Variable** (CRITICAL):
   - Go to Settings → Environment Variables
   - Add: `DEEPGRAM_API_KEY` = your Deepgram API key
   - Select all environments (Production, Preview, Development)
4. Click "Deploy"

### Step 3: Verify Deployment

After deployment:
1. Visit your Vercel URL
2. Tap the microphone button
3. Grant microphone permission when prompted
4. Ask a question about finance or tax
5. You should hear Finous respond with voice!

## Troubleshooting

### "Failed to get token" Error

**Cause**: DEEPGRAM_API_KEY is not set or invalid

**Solution**:
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Ensure `DEEPGRAM_API_KEY` is set with your actual Deepgram API key
3. Redeploy the project

### "Unable to connect" Error

**Cause**: OpenAI API key not configured in Deepgram Console

**Solution**:
1. Go to https://console.deepgram.com/
2. Navigate to your project → LLM Providers
3. Add your OpenAI API key
4. Try again

### No Audio Output

**Cause**: Browser audio settings or permissions

**Solution**:
1. Check browser volume is not muted
2. Ensure site has permission to play audio
3. Try a different browser (Chrome recommended)

### Microphone Not Working

**Cause**: Microphone permission denied

**Solution**:
1. Click the lock icon in browser address bar
2. Allow microphone access for the site
3. Refresh the page
4. Note: Microphone requires HTTPS (automatically provided by Vercel)

## Local Development

If you want to test locally:

1. Clone the repository
2. Run `npm install`
3. Create `.env.local` file:
   ```
   DEEPGRAM_API_KEY=your_actual_deepgram_key_here
   ```
4. Run `npm run dev`
5. Open http://localhost:5173

Note: Local development requires HTTPS for microphone access. Use a tool like ngrok or configure Vite for HTTPS.

## Compliance

This agent follows strict compliance rules:

- ✅ **Information only** — never gives advice
- ✅ **No personal data** — never asks for or stores financial details
- ✅ **No recommendations** — never suggests specific products or actions
- ✅ **No calculations** — explains how math works but never calculates for a user
- ✅ **Disclaimer on every response** — "This is general information, not financial or tax advice."

## API Keys Security

⚠️ **NEVER commit API keys to Git**

- API keys are stored in Vercel environment variables (encrypted)
- The serverless function generates short-lived tokens for the frontend
- Your actual API keys are never exposed to the browser

## Support

For issues or questions:
- Email: founder@finous.site
- Website: https://www.finous.site/

## License

Proprietary. All rights reserved. © Nidhiverse Pvt Ltd.
