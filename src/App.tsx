import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AgentProvider,
  useAgentState,
  useAgentConversation,
  useAgentMode,
  useAgentMicrophone,
  useAgentPlayer,
} from '@deepgram/react';
import {
  Mic,
  MicOff,
  ArrowLeft,
  Volume2,
  MessageCircle,
  Info,
  Loader2,
  AlertCircle,
  Send,
  PhoneOff,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT & COMPLIANCE
// ═══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are Finous, a financial literacy and tax information assistant for a global audience.

Your role:
- Explain personal finance and tax concepts in plain English.
- Help users understand compound interest, ETF, index fund, emergency fund, credit score, APR, mortgage, tax brackets, capital gains, deduction vs credit, withholding, filing status, inflation, diversification, net worth, and similar concepts.
- Explain how calculations work — but never calculate for a specific user.
- Explain trade-offs between options — but never recommend one.
- Explain how tax systems work in general terms across countries — but never give jurisdiction-specific advice for a user's situation.

Compliance rules (non-negotiable):
- Never give specific investment advice. Never name a specific stock, fund, insurance product, or lender.
- Never calculate tax liability, mortgage payments, or returns for a specific user.
- Never ask for or accept personal financial data (salary, investments, loan details, account numbers).
- Never offer to file a tax return.
- Never recommend a product, fund, or course of action.
- Never give jurisdiction-specific tax advice for a specific user's situation.
- Always end every response with: "This is general information, not financial or tax advice."
- If a user asks for a recommendation, say: "I can explain how this works, but I can't recommend what you should do. For that, please consult a qualified financial or tax advisor."

Language: Respond in English only.

Tone:
- Friendly, patient, and clear.
- Avoid jargon. Explain as if talking to someone new to finance.
- Keep answers short — 2 to 4 sentences unless the user asks for more detail.
- Never sound like a salesperson. Sound like a helpful teacher.`;

// ═══════════════════════════════════════════════════════════════════
// AGENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const AGENT_CONFIG: any = {
  auth: {
    // ⚠️ SECURITY WARNING: This API key is hardcoded for preview only!
    // In production, use environment variables and the /api/token endpoint
    apiKey: '13f24d75e9b08c53977e73255a4c175f765df2ad',
  },
  agent: {
    listen: {
      provider: {
        type: 'deepgram',
        model: 'nova-3',
        version: 'v1',
        language: 'en',
      },
    },
    think: {
      provider: {
        type: 'open_ai',
        model: 'gpt-4o-mini',
      },
      prompt: SYSTEM_PROMPT,
    },
    speak: {
      provider: {
        type: 'deepgram',
        model: 'aura-2-thalia-en',
        version: 'v1',
      },
    },
    greeting: "Hello! I'm Finous, your financial literacy assistant. Ask me anything about personal finance or tax concepts, and I'll explain them in plain English.",
  },
  audio: {
    input: {
      encoding: 'linear16',
      sampleRate: 16000,
    },
    output: {
      encoding: 'linear16',
      sampleRate: 24000,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════
// SUGGESTED QUESTIONS
// ═══════════════════════════════════════════════════════════════════

const SUGGESTED_QUESTIONS = [
  'What is compound interest?',
  'Explain tax brackets',
  'What is an ETF?',
  'How does a mortgage work?',
  'Difference between deduction and credit?',
  'What is the 50-30-20 rule?',
  'What is a credit score?',
  'How does diversification work?',
  'What is dollar-cost averaging?',
  'Explain capital gains tax',
];

// ═══════════════════════════════════════════════════════════════════
// VOICE AGENT INNER COMPONENT (uses hooks inside provider)
// ═══════════════════════════════════════════════════════════════════

function VoiceAgentInner() {
  const { state, start, stop, isConnected, isConnecting } = useAgentState();
  const { conversation, sendUserMessage } = useAgentConversation();
  const { mode, isSpeaking, isListening } = useAgentMode();
  const { micActive, micMuted, setMicMuted } = useAgentMicrophone();
  const { outputMuted, setOutputMuted } = useAgentPlayer();

  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Determine UI state
  const getAgentState = (): 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' => {
    if (!hasStarted) return 'idle';
    if (isConnecting) return 'connecting';
    if (state === 'disconnected') return 'error';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    if (state === 'connected') return 'listening';
    return 'idle';
  };

  const agentState = getAgentState();

  // Handle mic button tap
  const handleMicTap = useCallback(async () => {
    setError(null);
    
    if (!hasStarted) {
      // First tap — start the session
      try {
        await start();
        setHasStarted(true);
      } catch (err) {
        console.error('Failed to start agent:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        if (errorMessage.includes('token') || errorMessage.includes('Failed to get token')) {
          setError('Unable to connect. Please ensure DEEPGRAM_API_KEY is set in Vercel environment variables.');
        } else if (errorMessage.includes('microphone') || errorMessage.includes('permission')) {
          setError('Microphone access denied. Please grant microphone permission and try again.');
        } else {
          setError(`Connection failed: ${errorMessage}`);
        }
      }
    } else if (isConnected) {
      // Already connected — toggle mute
      setMicMuted(!micMuted);
    } else {
      // Reconnect
      try {
        await start();
      } catch (err) {
        console.error('Failed to reconnect:', err);
        setError('Failed to reconnect. Please check your connection and try again.');
      }
    }
  }, [hasStarted, isConnected, micMuted, start, setMicMuted]);

  // Handle text input
  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (textInput.trim() && isConnected) {
        sendUserMessage(textInput);
        setTextInput('');
      }
    },
    [textInput, isConnected, sendUserMessage]
  );

  // Handle suggested question
  const handleSuggestedClick = useCallback(
    async (question: string) => {
      if (!hasStarted) {
        try {
          await start();
          setHasStarted(true);
          // Small delay to let connection establish
          setTimeout(() => sendUserMessage(question), 500);
        } catch (err) {
          console.error('Failed to start agent:', err);
          setError('Unable to connect. Please ensure API keys are configured.');
        }
      } else if (isConnected) {
        sendUserMessage(question);
      }
    },
    [hasStarted, isConnected, start, sendUserMessage]
  );

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 header-blur bg-white/80 border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="https://www.finous.site/"
              className="flex items-center gap-1.5 text-text-muted hover:text-navy transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </a>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-lg font-semibold text-navy tracking-tight">Finous</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-navy/5 text-navy text-xs font-medium">
              <Volume2 size={12} />
              Voice · Info Only
            </span>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col max-w-[900px] mx-auto w-full px-4">
        {/* Security Warning Banner */}
        <section className="pt-4 pb-2">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 mb-1">
                ⚠️ PREVIEW MODE - API KEY HARDCODED
              </p>
              <p className="text-xs text-red-700 leading-relaxed">
                This is a preview build with a hardcoded API key for testing.
              </p>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="pt-6 pb-4 sm:pt-10 sm:pb-6 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-navy leading-tight">
            Ask Finous anything about money.
          </h1>
          <p className="mt-2 sm:mt-3 text-text-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Understand personal finance and tax rules in plain English.
            <br className="hidden sm:block" /> Information, never advice.
          </p>
        </section>

        {/* ═══ VOICE INTERFACE ═══ */}
        <section className="flex flex-col items-center py-4 sm:py-6 relative">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full bg-gradient-to-br from-gold/[0.04] to-transparent pointer-events-none" />

          {/* Mic Button */}
          <div className="relative">
            {/* Pulse rings for listening state */}
            {(agentState === 'listening' || agentState === 'speaking') && (
              <>
                <div
                  className="absolute inset-0 rounded-full bg-gold/20 animate-pulse-ring"
                  style={{ margin: '-12px' }}
                />
                <div
                  className="absolute inset-0 rounded-full bg-gold/10 animate-pulse-ring"
                  style={{ margin: '-24px', animationDelay: '0.5s' }}
                />
              </>
            )}

            {/* Main Button */}
            <button
              onClick={handleMicTap}
              className={`
                relative z-10 w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] rounded-full
                flex items-center justify-center
                transition-all duration-300 ease-out
                focus:outline-none focus:ring-4 focus:ring-gold/30
                ${agentState === 'idle' ? 'bg-gradient-to-br from-gold to-gold-dark hover:scale-105 mic-glow cursor-pointer' : ''}
                ${agentState === 'listening' ? 'bg-gradient-to-br from-gold to-gold-dark mic-glow-active animate-pulse-dot cursor-pointer' : ''}
                ${agentState === 'thinking' ? 'bg-navy cursor-wait' : ''}
                ${agentState === 'speaking' ? 'bg-gradient-to-br from-navy to-navy-light' : ''}
                ${agentState === 'connecting' ? 'bg-navy/80 cursor-wait' : ''}
                ${agentState === 'error' ? 'bg-gradient-to-br from-red-500 to-red-700 cursor-pointer' : ''}
              `}
              aria-label={
                agentState === 'idle'
                  ? 'Tap to start voice conversation'
                  : agentState === 'listening'
                  ? 'Listening — tap to mute'
                  : agentState === 'speaking'
                  ? 'Finous is speaking'
                  : agentState === 'error'
                  ? 'Error — tap to retry'
                  : 'Connecting...'
              }
            >
              {agentState === 'idle' && <Mic size={48} className="text-white sm:w-14 sm:h-14" />}
              {agentState === 'listening' && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-white rounded-full animate-waveform"
                      style={{ animationDelay: `${i * 0.15}s`, height: '8px' }}
                    />
                  ))}
                </div>
              )}
              {agentState === 'thinking' && <Loader2 size={40} className="text-white animate-spin-slow" />}
              {agentState === 'speaking' && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-gold rounded-full animate-waveform"
                      style={{ animationDelay: `${i * 0.1}s`, height: '8px' }}
                    />
                  ))}
                </div>
              )}
              {agentState === 'connecting' && <Loader2 size={40} className="text-white animate-spin-slow" />}
              {agentState === 'error' && <MicOff size={40} className="text-white" />}
            </button>
          </div>

          {/* State Label */}
          <div className="mt-4 text-center">
            <p className={`text-sm font-medium ${agentState === 'error' ? 'text-error' : 'text-text-muted'}`}>
              {agentState === 'idle' && 'Tap to speak'}
              {agentState === 'listening' && (micMuted ? 'Muted — tap to unmute' : 'Listening...')}
              {agentState === 'thinking' && 'Thinking...'}
              {agentState === 'speaking' && 'Finous is speaking...'}
              {agentState === 'connecting' && 'Connecting...'}
              {agentState === 'error' && 'Connection lost. Tap to retry.'}
            </p>
            {/* Connection status */}
            <p className="text-xs text-text-muted/60 mt-1 flex items-center justify-center gap-1">
              {isConnected ? (
                <>
                  <Wifi size={10} className="text-success" /> Connected
                </>
              ) : hasStarted ? (
                <>
                  <WifiOff size={10} className="text-error" /> Disconnected
                </>
              ) : (
                <>
                  <Wifi size={10} /> Ready
                </>
              )}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl max-w-md text-center">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Control buttons */}
          {hasStarted && isConnected && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setMicMuted(!micMuted)}
                className={`p-2.5 rounded-full transition-all ${
                  micMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                }`}
                title={micMuted ? 'Unmute mic' : 'Mute mic'}
              >
                {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={() => setOutputMuted(!outputMuted)}
                className={`p-2.5 rounded-full transition-all ${
                  outputMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                }`}
                title={outputMuted ? 'Unmute speaker' : 'Mute speaker'}
              >
                <Volume2 size={16} />
              </button>
              <button
                onClick={() => {
                  stop();
                  setHasStarted(false);
                }}
                className="p-2.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                title="End conversation"
              >
                <PhoneOff size={16} />
              </button>
            </div>
          )}
        </section>

        {/* ═══ TEXT INPUT FALLBACK ═══ */}
        <section className="pb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-xs text-text-muted hover:text-navy transition-colors flex items-center gap-1"
            >
              <MessageCircle size={12} />
              {showTextInput ? 'Hide text input' : 'Or type your question'}
            </button>
          </div>

          {showTextInput && (
            <form onSubmit={handleTextSubmit} className="animate-fade-in max-w-lg mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type a question about finance or tax..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                    placeholder:text-text-muted/50 transition-all"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || !isConnected}
                  className="px-4 py-3 rounded-xl bg-navy text-white text-sm font-medium
                    hover:bg-navy-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
              {!isConnected && (
                <p className="text-xs text-text-muted mt-2 text-center">
                  {hasStarted ? 'Connecting... please wait.' : 'Start a voice conversation first, or tap a suggestion below.'}
                </p>
              )}
            </form>
          )}
        </section>

        {/* ═══ SUGGESTED QUESTIONS ═══ */}
        <section className="pb-4">
          <div className="chips-scroll flex gap-2 overflow-x-auto px-1 pb-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedClick(q)}
                className="shrink-0 px-4 py-2 rounded-full border border-gold/30 bg-white
                  text-sm text-navy hover:bg-gold/5 hover:border-gold/50 transition-all
                  whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* ═══ TRANSCRIPT PANEL ═══ */}
        {conversation.length > 0 && (
          <section className="flex-1 pb-4">
            <div className="transcript-scroll overflow-y-auto max-h-[40vh] sm:max-h-[50vh] space-y-3 px-1">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-fade-in flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gray-100 text-text-dark rounded-br-md'
                        : 'bg-white border border-gray-100 shadow-sm text-text-dark rounded-bl-md border-l-[3px] border-l-gold'
                    }`}
                  >
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </section>
        )}

        {/* ═══ EMPTY STATE ═══ */}
        {conversation.length === 0 && (
          <section className="flex-1 flex flex-col items-center justify-center py-6 text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-navy/5 to-gold/5 flex items-center justify-center mb-4">
              <Info size={24} className="text-navy/40" />
            </div>
            <p className="text-sm text-text-muted max-w-xs leading-relaxed">
              Tap the microphone and ask a question, or choose a topic to get started.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-5 w-full max-w-sm px-2">
              {['💰 Compound Interest', '📊 Tax Brackets', '🏦 ETFs', '🏠 Mortgages'].map((topic, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedClick(SUGGESTED_QUESTIONS[i])}
                  className="px-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm
                    text-xs text-navy font-medium hover:border-gold/30 hover:shadow-md
                    transition-all text-left"
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ═══ DISCLAIMER BANNER ═══ */}
        <section className="py-4">
          <div className="bg-amber-50 border border-amber-200/50 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Disclaimer:</strong> Finous Voice provides general information only. It does not give financial, tax, or investment advice. Consult a qualified advisor for personalized guidance.
            </p>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="safe-bottom border-t border-gray-100 bg-white/60 mt-auto">
        <div className="max-w-[900px] mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy">Finous</span>
              <span className="text-xs text-text-muted">by Nidhiverse Pvt Ltd</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <a href="mailto:founder@finous.site" className="hover:text-navy transition-colors">
                founder@finous.site
              </a>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Confidential — For informational purposes only</span>
            </div>
          </div>
          <p className="text-center text-[10px] text-text-muted/50 mt-3 sm:hidden">
            Confidential — For informational purposes only
          </p>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP WITH PROVIDER
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <AgentProvider
      config={AGENT_CONFIG}
      microphone={true}
      microphoneOptions={{
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }}
      tts={true}
      playerSampleRate={24000}
      autoStart={false}
    >
      <VoiceAgentInner />
    </AgentProvider>
  );
}
