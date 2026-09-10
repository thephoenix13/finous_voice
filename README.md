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
| Voice Agent | Deepgram Agent API (WebSocket) |
| STT | Deepgram Nova-3 |
| LLM | Claude Sonnet / GPT-4o |
| TTS | Deepgram Aura-2 |
| Frontend | React + Vite + Tailwind CSS |
| Backend | Vercel Serverless Functions |
| Hosting | Vercel |

---

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

---

## Setup & Development

### Prerequisites
- Node.js 18+
- A [Deepgram](https://deepgram.com/) API key
- (Optional) Anthropic or OpenAI API key for LLM

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
   # Edit .env.local with your API keys
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

2. **Import in Vercel:**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import the `finous-voice` repository
   - Framework preset: Vite

3. **Add Environment Variables** (in Vercel dashboard → Settings → Environment Variables):
   - `DEEPGRAM_API_KEY` = your Deepgram API key
   - `ANTHROPIC_API_KEY` = your Anthropic key (if using Claude)
   - `OPENAI_API_KEY` = your OpenAI key (if using GPT-4o)

4. **Deploy:**
   - Vercel will build and deploy automatically
   - The serverless function at `/api/token` will be available

5. **Configure Custom Domain Routing:**
   - In your domain provider, ensure `www.finous.site/voice` routes to this Vercel project
   - Or use Vercel's domain configuration to set up the `/voice` path

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPGRAM_API_KEY` | ✅ Yes | Deepgram API key for STT/TTS/Agent |
| `ANTHROPIC_API_KEY` | Optional | For Claude Sonnet LLM |
| `OPENAI_API_KEY` | Optional | For GPT-4o LLM |

⚠️ **API keys must NEVER be committed to Git.** Set them only in the Vercel dashboard.

---

## Compliance

This agent follows strict compliance rules:

- **Information only** — never advice
- **No personal data** — never asks for or stores financial details
- **No recommendations** — never suggests specific products or actions
- **No calculations** — explains how math works but never calculates for a user
- **Disclaimer on every response** — "This is general information, not financial or tax advice."

---

## Company

**Finous** — by Nidhiverse Pvt Ltd  
📧 founder@finous.site  
🌐 https://www.finous.site/

---

## License

Proprietary. All rights reserved. © Nidhiverse Pvt Ltd.
