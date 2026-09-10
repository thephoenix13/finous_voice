# Finous Voice

A voice-based financial literacy and tax information agent by [Finous](https://www.finous.site/).

**Production URL:** https://www.finous.site/voice

---

## Overview

Finous Voice is a voice agent that explains personal finance and tax concepts in plain English through natural conversation. It provides **information only** — never advice, recommendations, or personalized calculations.

### What It Does
- Explains financial concepts (compound interest, ETFs, tax brackets, etc.)
- Answers questions about how financial systems work
- Defines terms and explains trade-offs
- Works globally, English only
- Real-time voice conversation with natural speech

### What It Doesn't Do
- ❌ Recommend specific products, funds, or services
- ❌ Calculate personal tax, returns, or payments
- ❌ Accept or store personal financial data
- ❌ Give jurisdiction-specific advice
- ❌ Offer to file tax returns

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Voice Agent | Deepgram Voice Agent API (WebSocket) |
| STT | Deepgram Nova-3 |
| LLM | GPT-4o-mini (via Deepgram managed LLM) |
| TTS | Deepgram Aura-2 |
| Frontend | React + Vite + Tailwind CSS |
| SDK | @deepgram/react |
| Backend | Vercel Serverless Functions |
| Hosting | Vercel |

---

## Project Structure

```
finous-voice/
├── src/
│   ├── App.tsx          # Main voice agent UI with Deepgram SDK
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

---

## Setup & Development

### Prerequisites
- Node.js 18+
- A [Deepgram](https://deepgram.com/) API key
- An [OpenAI](https://platform.openai.com/) API key (configured in Deepgram Console)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/finous-voice.git
   cd finous-voice
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Deepgram API key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open** http://localhost:5173

---

## Deployment to Vercel

### Step-by-step:

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Finous Voice agent"
   git remote add origin https://github.com/your-org/finous-voice.git
   git push -u origin main
   ```

2. **Configure Deepgram Console:**
   - Go to [console.deepgram.com](https://console.deepgram.com)
   - Navigate to your project settings
   - Under "LLM Providers", add your OpenAI API key
   - This allows Deepgram to proxy LLM requests to OpenAI

3. **Import in Vercel:**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import the `finous-voice` repository
   - Framework preset: Vite

4. **Add Environment Variable** (in Vercel dashboard → Settings → Environment Variables):
   - `DEEPGRAM_API_KEY` = your Deepgram API key

   ⚠️ **Only the Deepgram API key is needed.** The OpenAI key is configured in the Deepgram Console, not in Vercel.

5. **Deploy:**
   - Vercel will build and deploy automatically
   - The serverless function at `/api/token` will be available

6. **Configure Custom Domain Routing:**
   - In your domain provider, ensure `www.finous.site/voice` routes to this Vercel project
   - Or use Vercel's domain configuration to set up the `/voice` path

---

## Environment Variables

| Variable | Required | Where to Set | Description |
|----------|----------|-------------|-------------|
| `DEEPGRAM_API_KEY` | ✅ Yes | Vercel Dashboard | Deepgram API key for STT/TTS/Agent |
| OpenAI API Key | ✅ Yes | Deepgram Console | For GPT-4o-mini LLM (configured in Deepgram, NOT Vercel) |

⚠️ **API keys must NEVER be committed to Git.** Set them only in the appropriate dashboards.

---

## How Voice Works

1. User taps the microphone button
2. Frontend requests a short-lived token from `/api/token`
3. Token is used to connect to Deepgram's Voice Agent WebSocket
4. Browser captures microphone audio and streams to Deepgram
5. Deepgram handles:
   - Speech-to-text (Nova-3)
   - LLM processing (GPT-4o-mini with Finous system prompt)
   - Text-to-speech (Aura-2)
6. Audio plays back in the browser
7. Conversation transcript appears on screen
8. User can interrupt (barge-in) by speaking again

---

## Compliance

This agent follows strict compliance rules:

- **Information only** — never advice
- **No personal data** — never asks for or stores financial details
- **No recommendations** — never suggests specific products or actions
- **No calculations** — explains how math works but never calculates for a user
- **Disclaimer on every response** — "This is general information, not financial or tax advice."

---

## Browser Support

- Chrome, Firefox, Safari, Edge (latest)
- Mobile Chrome, Mobile Safari
- Requires microphone permission
- Requires HTTPS (except localhost)

---

## Troubleshooting

### "Voice agent not configured" error
- Ensure `DEEPGRAM_API_KEY` is set in Vercel environment variables
- Redeploy after adding the variable

### "Failed to obtain voice token" error
- Verify your Deepgram API key is valid
- Check that your Deepgram account has sufficient credits

### No audio output
- Check browser audio permissions
- Ensure device volume is up
- Try a different browser

### Microphone not working
- Grant microphone permission when prompted
- Check browser settings for site permissions
- Try HTTPS (required for mic access)

---

## Company

**Finous** — by Nidhiverse Pvt Ltd  
📧 founder@finous.site  
🌐 https://www.finous.site/

---

## License

Proprietary. All rights reserved. © Nidhiverse Pvt Ltd.
