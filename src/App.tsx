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
  VolumeX,
  MessageCircle,
  Loader2,
  AlertCircle,
  Send,
  PhoneOff,
  X,
  BookOpen,
  Map,
  User,
  GitCompare,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { 
  LEARNING_PATHS, 
  SCENARIOS, 
  LIFE_STAGES, 
  COMPARISONS, 
  SUGGESTED_QUESTIONS,
  ENHANCED_SYSTEM_PROMPT 
} from './data/financialContent';

// ═══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = ENHANCED_SYSTEM_PROMPT;

// ═══════════════════════════════════════════════════════════════════
// AGENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const AGENT_CONFIG: any = {
  auth: {
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
// CATEGORY TABS
// ═══════════════════════════════════════════════════════════════════

type CategoryTab = 'quick' | 'learn' | 'scenarios' | 'stages' | 'compare';

const CATEGORIES: { id: CategoryTab; label: string; icon: any }[] = [
  { id: 'quick', label: 'Quick', icon: Sparkles },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'scenarios', label: 'Scenarios', icon: Map },
  { id: 'stages', label: 'Stages', icon: User },
  { id: 'compare', label: 'Compare', icon: GitCompare },
];

// ═══════════════════════════════════════════════════════════════════
// VOICE AGENT INNER COMPONENT
// ═══════════════════════════════════════════════════════════════════

function VoiceAgentInner() {
  const { state, start, stop, isConnected, isConnecting } = useAgentState();
  const { conversation, sendUserMessage } = useAgentConversation();
  const { isSpeaking, isListening } = useAgentMode();
  const { micMuted, setMicMuted } = useAgentMicrophone();
  const { outputMuted, setOutputMuted } = useAgentPlayer();

  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>('quick');
  const [showBanner, setShowBanner] = useState(true);
  
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
      try {
        await start();
        setHasStarted(true);
      } catch (err) {
        console.error('Failed to start agent:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        if (errorMessage.includes('token') || errorMessage.includes('Failed to get token')) {
          setError('Unable to connect. Please ensure DEEPGRAM_API_KEY is set.');
        } else if (errorMessage.includes('microphone') || errorMessage.includes('permission')) {
          setError('Microphone access denied. Please grant permission.');
        } else {
          setError(`Connection failed: ${errorMessage}`);
        }
      }
    } else if (isConnected) {
      setMicMuted(!micMuted);
    } else {
      try {
        await start();
      } catch (err) {
        setError('Failed to reconnect. Please try again.');
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
          setTimeout(() => sendUserMessage(question), 500);
        } catch (err) {
          setError('Unable to connect. Please ensure API keys are configured.');
        }
      } else if (isConnected) {
        sendUserMessage(question);
      }
    },
    [hasStarted, isConnected, start, sendUserMessage]
  );

  // Get chips for active tab
  type Chip = { text: string; emoji?: string; action: () => void };
  
  const getChipsForTab = (): Chip[] => {
    switch (activeTab) {
      case 'quick':
        return SUGGESTED_QUESTIONS.slice(0, 10).map(q => ({ text: q, action: () => handleSuggestedClick(q) }));
      case 'learn':
        return Object.entries(LEARNING_PATHS).map(([_, path]) => ({
          text: path.title,
          emoji: '📚',
          action: () => handleSuggestedClick(`Start learning path: ${path.title}`)
        }));
      case 'scenarios':
        return Object.entries(SCENARIOS).map(([_, scenario]) => ({
          text: scenario.title,
          emoji: '🚶',
          action: () => handleSuggestedClick(`Walk me through: ${scenario.title}`)
        }));
      case 'stages':
        return Object.entries(LIFE_STAGES).map(([_, stage]) => ({
          text: stage.title,
          emoji: '🎯',
          action: () => handleSuggestedClick(`What should I learn in ${stage.title}?`)
        }));
      case 'compare':
        return Object.entries(COMPARISONS).map(([_, comparison]) => ({
          text: comparison.title,
          emoji: '⚖️',
          action: () => handleSuggestedClick(`Compare: ${comparison.title}`)
        }));
      default:
        return [];
    }
  };

  const chips = getChipsForTab();

  return (
    <div className="min-h-screen flex flex-col safe-bottom">
      {/* ═══ AMBIENT BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full transition-all duration-1000 ${
          agentState === 'listening' ? 'bg-green-500/10 blur-[120px]' :
          agentState === 'speaking' ? 'bg-amber-500/10 blur-[120px]' :
          agentState === 'thinking' ? 'bg-indigo-500/10 blur-[120px]' :
          'bg-indigo-500/5 blur-[100px]'
        }`} />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 glass-dark safe-top">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <a
              href="https://www.finous.site/"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Back to Finous"
            >
              <ArrowLeft size={16} className="text-white/70" />
            </a>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">F</span>
              </div>
              <span className="text-sm font-semibold text-white">Finous</span>
            </div>
          </div>
          
          {/* Connection indicator */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-medium text-green-400">Live</span>
              </div>
            ) : hasStarted ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-medium text-red-400">Offline</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="text-[10px] font-medium text-white/40">Ready</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ SECURITY BANNER ═══ */}
      {showBanner && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 px-4 py-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
            <AlertCircle size={12} className="shrink-0" />
            <span>Preview mode</span>
          </p>
          <button 
            onClick={() => setShowBanner(false)}
            className="p-1 rounded-full hover:bg-amber-500/10 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} className="text-amber-400/60" />
          </button>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col max-w-[900px] mx-auto w-full relative z-10">
        
        {/* ═══ HERO + ORB SECTION ═══ */}
        <section className="relative px-4 pt-6 pb-4 sm:pt-10 sm:pb-6">
          {/* Headline */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
              <span className="gradient-text">Ask Finous</span>
              <br className="sm:hidden" />
              <span className="text-white"> anything about money</span>
            </h1>
            <p className="mt-2 text-white/50 text-xs sm:text-sm max-w-md mx-auto">
              Personal finance & tax in plain English
            </p>
          </div>

          {/* ═══ THE ORB - CENTER PIECE ═══ */}
          <div className="flex flex-col items-center relative">
            {/* Ripple rings when listening */}
            {agentState === 'listening' && (
              <>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-green-500/20 animate-ripple" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-green-500/10 animate-ripple" style={{ animationDelay: '0.7s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-green-500/5 animate-ripple" style={{ animationDelay: '1.4s' }} />
              </>
            )}

            {/* Main Orb Button */}
            <button
              onClick={handleMicTap}
              className={`
                relative z-10 w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full
                flex items-center justify-center
                transition-all duration-500 ease-out
                focus:outline-none btn-press
                ${agentState === 'idle' ? 'orb orb-idle animate-orb-breathe cursor-pointer hover:scale-105' : ''}
                ${agentState === 'listening' ? 'orb orb-listening animate-pulse-glow cursor-pointer' : ''}
                ${agentState === 'thinking' ? 'orb animate-pulse-glow cursor-wait' : ''}
                ${agentState === 'speaking' ? 'orb orb-speaking animate-pulse-glow' : ''}
                ${agentState === 'connecting' ? 'orb animate-pulse-glow cursor-wait' : ''}
                ${agentState === 'error' ? 'bg-gradient-to-br from-red-500/60 to-red-700/60 cursor-pointer' : ''}
              `}
              aria-label={
                agentState === 'idle' ? 'Tap to start' :
                agentState === 'listening' ? 'Listening' :
                agentState === 'speaking' ? 'Speaking' :
                agentState === 'error' ? 'Retry' : 'Connecting'
              }
            >
              {/* Inner glow */}
              <div className="absolute inset-4 rounded-full bg-white/5 backdrop-blur-sm" />
              
              {/* Content */}
              <div className="relative z-10">
                {agentState === 'idle' && (
                  <Mic size={48} className="text-white/90 sm:w-14 sm:h-14" strokeWidth={1.5} />
                )}
                {agentState === 'listening' && (
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white/90 rounded-full animate-waveform"
                        style={{ animationDelay: `${i * 0.12}s`, height: '12px' }}
                      />
                    ))}
                  </div>
                )}
                {agentState === 'thinking' && <Loader2 size={44} className="text-white/90 animate-spin-slow" />}
                {agentState === 'speaking' && (
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white/90 rounded-full animate-waveform"
                        style={{ animationDelay: `${i * 0.08}s`, height: '10px' }}
                      />
                    ))}
                  </div>
                )}
                {agentState === 'connecting' && <Loader2 size={44} className="text-white/90 animate-spin-slow" />}
                {agentState === 'error' && <MicOff size={44} className="text-white/90" />}
              </div>
            </button>

            {/* State label */}
            <div className="mt-5 text-center">
              <p className={`text-sm font-medium transition-colors ${
                agentState === 'error' ? 'text-red-400' : 
                agentState === 'listening' ? 'text-green-400' :
                agentState === 'speaking' ? 'text-amber-400' :
                agentState === 'thinking' ? 'text-indigo-400' :
                'text-white/50'
              }`}>
                {agentState === 'idle' && 'Tap the orb to speak'}
                {agentState === 'listening' && (micMuted ? 'Muted' : 'Listening...')}
                {agentState === 'thinking' && 'Thinking...'}
                {agentState === 'speaking' && 'Speaking...'}
                {agentState === 'connecting' && 'Connecting...'}
                {agentState === 'error' && 'Tap to retry'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-xs text-center animate-fade-in">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Control buttons */}
            {hasStarted && isConnected && (
              <div className="flex items-center gap-2 mt-4 animate-fade-in">
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`p-3 rounded-full transition-all btn-press ${
                    micMuted ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                  title={micMuted ? 'Unmute mic' : 'Mute mic'}
                >
                  {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={() => setOutputMuted(!outputMuted)}
                  className={`p-3 rounded-full transition-all btn-press ${
                    outputMuted ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                  title={outputMuted ? 'Unmute' : 'Mute'}
                >
                  {outputMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={() => { stop(); setHasStarted(false); }}
                  className="p-3 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all btn-press"
                  title="End"
                >
                  <PhoneOff size={16} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═══ TEXT INPUT ═══ */}
        {showTextInput && (
          <section className="px-4 pb-3 animate-fade-in">
            <form onSubmit={handleTextSubmit} className="max-w-lg mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30
                    placeholder:text-white/30 transition-all"
                  disabled={!isConnected}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || !isConnected}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium
                    hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-press"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ═══ CATEGORY TABS ═══ */}
        <section className="px-4 pb-2">
          <div className="flex gap-1.5 overflow-x-auto chips-scroll pb-1 -mx-1 px-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`
                    shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium
                    transition-all btn-press whitespace-nowrap
                    ${isActive 
                      ? 'category-pill-active' 
                      : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                    }
                  `}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══ SUGGESTION CHIPS ═══ */}
        <section className="px-4 pb-3">
          <div className="chips-scroll flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {chips.map((chip, i) => (
              <button
                key={`${activeTab}-${i}`}
                onClick={chip.action}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-medium
                  bg-white/5 border border-white/10 text-white/70
                  hover:bg-white/10 hover:border-white/20 hover:text-white
                  transition-all btn-press whitespace-nowrap"
              >
                {chip.emoji && <span className="text-sm">{chip.emoji}</span>}
                <span>{chip.text}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ═══ TRANSCRIPT PANEL ═══ */}
        {conversation.length > 0 && (
          <section className="flex-1 px-4 pb-4">
            <div className="transcript-scroll overflow-y-auto max-h-[35vh] sm:max-h-[45vh] space-y-2.5">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-fade-in flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed rounded-2xl ${
                      msg.role === 'user'
                        ? 'message-user rounded-br-md'
                        : 'message-agent rounded-bl-md'
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
          <section className="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-4 text-center animate-slide-up">
            {/* Floating icon */}
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-white/5 flex items-center justify-center animate-float">
                <Sparkles size={24} className="text-indigo-400" />
              </div>
            </div>
            
            <p className="text-xs text-white/40 max-w-[260px] leading-relaxed">
              Tap the orb or choose a topic below
            </p>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-5 w-full max-w-xs">
              <button
                onClick={() => { setActiveTab('learn'); handleSuggestedClick('Start learning path: Investing Basics'); }}
                className="flex flex-col items-start p-3.5 rounded-2xl bg-white/5 border border-white/10
                  hover:bg-white/10 hover:border-white/20 transition-all btn-press text-left"
              >
                <BookOpen size={16} className="text-indigo-400 mb-1.5" />
                <span className="text-xs font-semibold text-white">Learn</span>
                <span className="text-[10px] text-white/40">Guided paths</span>
              </button>
              <button
                onClick={() => { setActiveTab('scenarios'); handleSuggestedClick('Walk me through: Your First Paycheck'); }}
                className="flex flex-col items-start p-3.5 rounded-2xl bg-white/5 border border-white/10
                  hover:bg-white/10 hover:border-white/20 transition-all btn-press text-left"
              >
                <Map size={16} className="text-green-400 mb-1.5" />
                <span className="text-xs font-semibold text-white">Scenarios</span>
                <span className="text-[10px] text-white/40">Life walkthroughs</span>
              </button>
              <button
                onClick={() => { setActiveTab('stages'); handleSuggestedClick('What should I learn in my 20s?'); }}
                className="flex flex-col items-start p-3.5 rounded-2xl bg-white/5 border border-white/10
                  hover:bg-white/10 hover:border-white/20 transition-all btn-press text-left"
              >
                <User size={16} className="text-purple-400 mb-1.5" />
                <span className="text-xs font-semibold text-white">My Stage</span>
                <span className="text-[10px] text-white/40">Age-specific</span>
              </button>
              <button
                onClick={() => { setActiveTab('compare'); handleSuggestedClick('Compare: ETF vs Mutual Fund'); }}
                className="flex flex-col items-start p-3.5 rounded-2xl bg-white/5 border border-white/10
                  hover:bg-white/10 hover:border-white/20 transition-all btn-press text-left"
              >
                <GitCompare size={16} className="text-amber-400 mb-1.5" />
                <span className="text-xs font-semibold text-white">Compare</span>
                <span className="text-[10px] text-white/40">Side by side</span>
              </button>
            </div>
          </section>
        )}

        {/* ═══ DISCLAIMER ═══ */}
        <section className="px-4 pb-3">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-3 py-2.5 flex items-start gap-2">
            <AlertCircle size={12} className="text-amber-400/60 shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/30 leading-relaxed">
              <strong className="text-white/40">Info only.</strong> Not financial or tax advice. Consult a qualified advisor.
            </p>
          </div>
        </section>
      </main>

      {/* ═══ FLOATING TEXT INPUT BUTTON ═══ */}
      {!showTextInput && conversation.length > 0 && (
        <button
          onClick={() => setShowTextInput(true)}
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-6 z-40
            w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg
            flex items-center justify-center hover:from-indigo-600 hover:to-purple-700
            transition-all btn-press shadow-indigo-500/20"
          aria-label="Type a question"
        >
          <MessageCircle size={18} />
        </button>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 mt-auto">
        <div className="max-w-[900px] mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/70">Finous</span>
              <span className="text-[10px] text-white/30">by Nidhiverse Pvt Ltd</span>
            </div>
            <a href="mailto:founder@finous.site" className="text-[10px] text-white/30 hover:text-white/50 transition-colors">
              founder@finous.site
            </a>
          </div>
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
