import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, ArrowLeft, Volume2, MessageCircle, Info, Loader2, AlertCircle, Send } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type AgentState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

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
// SUGGESTED QUESTIONS
// ═══════════════════════════════════════════════════════════════════

const SUGGESTED_QUESTIONS = [
  "What is compound interest?",
  "Explain tax brackets",
  "What is an ETF?",
  "How does a mortgage work?",
  "Difference between deduction and credit?",
  "What is the 50-30-20 rule?",
  "What is a credit score?",
  "How does diversification work?",
  "What is dollar-cost averaging?",
  "Explain capital gains tax",
];

// ═══════════════════════════════════════════════════════════════════
// DEMO RESPONSES (for when Deepgram API is not configured)
// ═══════════════════════════════════════════════════════════════════

const DEMO_RESPONSES: Record<string, string> = {
  "what is compound interest": "Compound interest is when you earn interest not just on your original money, but also on the interest you've already earned. It's like interest on interest — your money grows faster over time. Albert Einstein reportedly called it the eighth wonder of the world. This is general information, not financial or tax advice.",
  "explain tax brackets": "Tax brackets are ranges of income that are taxed at different rates. In many countries, as you earn more, each additional dollar falls into a higher bracket and is taxed at a higher rate. Importantly, only the income within each bracket is taxed at that rate — your entire income isn't taxed at the highest rate. This is general information, not financial or tax advice.",
  "what is an etf": "An ETF, or Exchange-Traded Fund, is a basket of investments — like stocks or bonds — that trades on a stock exchange like a single stock. It gives you instant diversification because you own a small piece of many assets at once. ETFs typically have lower fees than actively managed funds. This is general information, not financial or tax advice.",
  "how does a mortgage work": "A mortgage is a loan specifically for buying property. The property itself serves as collateral — if you stop paying, the lender can take it. You make regular payments that cover both the principal (what you borrowed) and interest (the cost of borrowing). Mortgages typically run 15 to 30 years. This is general information, not financial or tax advice.",
  "difference between deduction and credit": "A tax deduction reduces the amount of income that's taxed, while a tax credit directly reduces the tax you owe dollar-for-dollar. For example, a $1,000 deduction might save you $220 in taxes if you're in the 22% bracket, but a $1,000 credit saves you the full $1,000. Credits are generally more valuable. This is general information, not financial or tax advice.",
  "what is the 50-30-20 rule": "The 50-30-20 rule is a budgeting framework. You allocate 50% of after-tax income to needs like rent and groceries, 30% to wants like dining out and entertainment, and 20% to savings and debt repayment. It's a simple starting point for managing money. This is general information, not financial or tax advice.",
  "what is a credit score": "A credit score is a number, typically between 300 and 850, that represents how reliably you've handled borrowed money in the past. Lenders use it to decide whether to lend to you and at what interest rate. It's based on payment history, amounts owed, length of credit history, new credit, and types of credit used. This is general information, not financial or tax advice.",
  "how does diversification work": "Diversification means spreading your investments across different types of assets — stocks, bonds, real estate, different industries, and geographies. The idea is that when one area underperforms, others may do better, reducing your overall risk. It's often described as 'not putting all your eggs in one basket.' This is general information, not financial or tax advice.",
  "what is dollar-cost averaging": "Dollar-cost averaging means investing a fixed amount of money at regular intervals, regardless of the price. When prices are low, your fixed amount buys more shares. When prices are high, it buys fewer. Over time, this smooths out the average price you pay and removes the need to time the market. This is general information, not financial or tax advice.",
  "explain capital gains tax": "Capital gains tax is a tax on the profit you make when you sell an asset for more than you paid for it. Many countries distinguish between short-term gains (held less than a year) and long-term gains (held longer), with long-term gains typically taxed at a lower rate. The tax is only on the gain, not the total sale price. This is general information, not financial or tax advice.",
};

function getDemoResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  
  // Check for exact or close matches
  for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return response;
    }
  }
  
  // Check for recommendation requests
  if (lower.includes('recommend') || lower.includes('should i') || lower.includes('what should') || lower.includes('which one')) {
    return "I can explain how this works, but I can't recommend what you should do. For that, please consult a qualified financial or tax advisor. This is general information, not financial or tax advice.";
  }
  
  // Check for personal data requests
  if (lower.includes('my salary') || lower.includes('my income') || lower.includes('my account') || lower.includes('calculate my')) {
    return "I appreciate you sharing, but I'm not able to process personal financial information or perform calculations for your specific situation. I can explain how concepts work in general terms. This is general information, not financial or tax advice.";
  }
  
  // Default response
  return "That's a great question! I'm here to help explain financial concepts in plain English. Could you try asking about a specific topic like compound interest, tax brackets, ETFs, or budgeting? This is general information, not financial or tax advice.";
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  // Fetch token on mount (simulated for demo)
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // In production, this calls /api/token which returns a Deepgram temp token
        // For demo, we simulate the token fetch
        const response = await fetch('/api/token').catch(() => null);
        if (response && response.ok) {
          const data = await response.json();
          if (data.token) {
            setTokenReady(true);
            setIsConnected(true);
            return;
          }
        }
      } catch {
        // No server available — demo mode
      }
      // Demo mode — token "ready" for UI purposes
      setTimeout(() => {
        setTokenReady(true);
        setIsConnected(true);
      }, 800);
    };
    fetchToken();
  }, []);

  // Add message helper
  const addMessage = useCallback((role: 'user' | 'agent', text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      role,
      text,
      timestamp: new Date(),
    }]);
  }, []);

  // Handle user question
  const handleQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    
    addMessage('user', question);
    setCurrentTranscript('');
    setAgentState('thinking');
    
    // Simulate LLM processing time
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
    
    const response = getDemoResponse(question);
    setAgentState('speaking');
    
    // Simulate TTS playback time
    await new Promise(resolve => setTimeout(resolve, Math.min(response.length * 30, 4000)));
    
    addMessage('agent', response);
    setAgentState('idle');
  }, [addMessage]);

  // Mic button handler
  const handleMicTap = useCallback(() => {
    if (agentState === 'listening') {
      // Stop listening
      setAgentState('idle');
      return;
    }
    
    if (agentState === 'error') {
      setAgentState('idle');
      setErrorMsg('');
      return;
    }
    
    if (agentState !== 'idle') return;
    
    // Request mic permission and start listening
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setAgentState('listening');
          // In production: connect WebSocket to Deepgram
          // For demo: simulate listening then auto-stop after timeout
          setTimeout(() => {
            setAgentState(prev => prev === 'listening' ? 'idle' : prev);
          }, 15000);
        })
        .catch(() => {
          setShowTextInput(true);
          setErrorMsg('Microphone access denied. Please type your question instead.');
          setAgentState('error');
        });
    } else {
      setShowTextInput(true);
    }
  }, [agentState]);

  // Text input submit
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleQuestion(textInput);
      setTextInput('');
    }
  }, [textInput, handleQuestion]);

  // Suggested question click
  const handleSuggestedClick = useCallback((question: string) => {
    handleQuestion(question);
  }, [handleQuestion]);

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
            <span className="text-lg font-semibold text-navy tracking-tight">
              Finous
            </span>
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
          {/* Subtle background glow behind mic */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full bg-gradient-to-br from-gold/[0.04] to-transparent pointer-events-none" />
          
          {/* Mic Button */}
          <div className="relative">
            {/* Pulse rings for listening state */}
            {agentState === 'listening' && (
              <>
                <div className="absolute inset-0 rounded-full bg-gold/20 animate-pulse-ring" style={{ margin: '-12px' }} />
                <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse-ring" style={{ margin: '-24px', animationDelay: '0.5s' }} />
              </>
            )}
            
            {/* Main Button */}
            <button
              onClick={handleMicTap}
              disabled={!tokenReady || (agentState !== 'idle' && agentState !== 'listening' && agentState !== 'error')}
              className={`
                relative z-10 w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] rounded-full
                flex items-center justify-center
                transition-all duration-300 ease-out
                focus:outline-none focus:ring-4 focus:ring-gold/30
                ${agentState === 'idle' ? 'bg-gradient-to-br from-gold to-gold-dark hover:scale-105 mic-glow cursor-pointer' : ''}
                ${agentState === 'listening' ? 'bg-gradient-to-br from-gold to-gold-dark mic-glow-active animate-pulse-dot' : ''}
                ${agentState === 'thinking' ? 'bg-navy cursor-wait' : ''}
                ${agentState === 'speaking' ? 'bg-gradient-to-br from-navy to-navy-light' : ''}
                ${agentState === 'connecting' ? 'bg-navy/80 cursor-wait' : ''}
                ${agentState === 'error' ? 'bg-gradient-to-br from-red-500 to-red-700 cursor-pointer' : ''}
                ${!tokenReady ? 'bg-gray-300 cursor-not-allowed' : ''}
              `}
              aria-label={
                agentState === 'idle' ? 'Tap to speak' :
                agentState === 'listening' ? 'Listening — tap to stop' :
                agentState === 'thinking' ? 'Processing your question' :
                agentState === 'speaking' ? 'Finous is speaking' :
                agentState === 'error' ? 'Error — tap to retry' :
                'Connecting...'
              }
            >
              {/* Button content based on state */}
              {agentState === 'idle' && (
                <Mic size={48} className="text-white sm:w-14 sm:h-14" />
              )}
              {agentState === 'listening' && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-1.5 bg-white rounded-full animate-waveform"
                      style={{ animationDelay: `${i * 0.15}s`, height: '8px' }}
                    />
                  ))}
                </div>
              )}
              {agentState === 'thinking' && (
                <Loader2 size={40} className="text-white animate-spin-slow" />
              )}
              {agentState === 'speaking' && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <div
                      key={i}
                      className="w-1 bg-gold rounded-full animate-waveform"
                      style={{ animationDelay: `${i * 0.1}s`, height: '8px' }}
                    />
                  ))}
                </div>
              )}
              {agentState === 'connecting' && (
                <Loader2 size={40} className="text-white animate-spin-slow" />
              )}
              {agentState === 'error' && (
                <MicOff size={40} className="text-white" />
              )}
              {!tokenReady && (
                <Loader2 size={40} className="text-gray-500 animate-spin-slow" />
              )}
            </button>
          </div>

          {/* State Label */}
          <div className="mt-4 text-center">
            <p className={`text-sm font-medium ${
              agentState === 'error' ? 'text-error' : 'text-text-muted'
            }`}>
              {agentState === 'idle' && 'Tap to speak'}
              {agentState === 'listening' && 'Listening...'}
              {agentState === 'thinking' && 'Thinking...'}
              {agentState === 'speaking' && 'Finous is speaking...'}
              {agentState === 'connecting' && 'Connecting...'}
              {agentState === 'error' && (errorMsg || 'Something went wrong. Tap to retry.')}
            </p>
            {/* Connection status */}
            <p className="text-xs text-text-muted/60 mt-1">
              {isConnected ? '● Connected' : '○ Connecting...'}
            </p>
          </div>
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
                  ref={textInputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Type a question about finance or tax..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                    placeholder:text-text-muted/50 transition-all"
                  disabled={agentState === 'thinking' || agentState === 'speaking'}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || agentState === 'thinking' || agentState === 'speaking'}
                  className="px-4 py-3 rounded-xl bg-navy text-white text-sm font-medium
                    hover:bg-navy-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
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
                disabled={agentState === 'thinking' || agentState === 'speaking'}
                className="shrink-0 px-4 py-2 rounded-full border border-gold/30 bg-white
                  text-sm text-navy hover:bg-gold/5 hover:border-gold/50 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* ═══ TRANSCRIPT PANEL ═══ */}
        {messages.length > 0 && (
          <section className="flex-1 pb-4">
            <div className="transcript-scroll overflow-y-auto max-h-[40vh] sm:max-h-[50vh] space-y-3 px-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gray-100 text-text-dark rounded-br-md'
                        : 'bg-white border border-gray-100 shadow-sm text-text-dark rounded-bl-md border-l-[3px] border-l-gold'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className="text-[10px] text-text-muted/50 mt-1.5">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {currentTranscript && (
                <div className="flex justify-end animate-fade-in">
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-gray-50 text-text-muted text-sm italic rounded-br-md">
                    {currentTranscript}...
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </section>
        )}

        {/* ═══ EMPTY STATE ═══ */}
        {messages.length === 0 && (
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
