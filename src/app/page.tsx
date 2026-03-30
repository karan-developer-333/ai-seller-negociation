"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  TrendingDown, 
  Trophy, 
  Clock, 
  Info, 
  ChevronRight,
  RefreshCw,
  User,
  X,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import { Message, NegotiationState, Product, LeaderboardEntry } from '../types';
import { getSellerResponseStream } from '../services/mistralService';
import { RajeshAvatar } from '../components/RajeshAvatar';

const PRODUCT: Product = {
  id: 'royal-enfield',
  name: 'Vintage Royal Enfield (1965)',
  description: 'A classic piece of Indian history. Fully restored, chrome finish, and that iconic "thump" sound. Original parts, limited edition color.',
  initialPrice: 450000,
  minPrice: 320000,
  image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=800'
};

const INITIAL_STATE: NegotiationState = {
  currentPrice: PRODUCT.initialPrice,
  rounds: 0,
  maxRounds: 10,
  isGameOver: false,
  history: [
    {
      role: 'model',
      text: "Kem cho? Namaste bhaiya! Welcome to Rajesh Bhaiya ki Dukaan! Ye dekho - 1965 ki Royal Enfield, bilkul ekdum tej! Rs 4,50,000 mein ye no-nonsense deal hai. Batao, kya offer karoge?",
      price: 450000,
      mood: 'neutral'
    }
  ],
  product: PRODUCT
};

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function fetchLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard/get?limit=${limit}`);
    const data = await res.json();
    return data.entries || [];
  } catch {
    return [];
  }
}

async function submitLeaderboardEntry(entry: { name: string; price: number; uid: string }): Promise<void> {
  await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
}

export default function App() {
  const [state, setState] = useState<NegotiationState>(INITIAL_STATE);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [currentMood, setCurrentMood] = useState<'neutral' | 'surprised' | 'angry' | 'sad' | 'happy' | 'impressed' | 'firm' | 'yielding'>('neutral');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userName, setUserName] = useState('');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserId(generateUserId());
    const checkMobile = () => setIsMobile(window.innerWidth >= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadLeaderboard() {
      const entries = await fetchLeaderboard(10);
      setLeaderboard(entries);
    }
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.history, streamingMessage]);

  const parseMetadata = React.useCallback((text: string) => {
    let mood = 'neutral';
    let price = state.currentPrice;
    let isDealAccepted = false;
    
    const lines = text.split('\n');
    let verbalResponse = text;
    
    for (const line of lines) {
      const moodMatch = line.match(/MOOD:\s*(\w+)/i);
      if (moodMatch) {
        const m = moodMatch[1].toLowerCase();
        if (['neutral', 'surprised', 'angry', 'sad', 'happy', 'impressed'].includes(m)) {
          mood = m;
        }
      }
      
      const priceMatch = line.match(/PRICE:\s*(\d+)/i);
      if (priceMatch) {
        price = parseInt(priceMatch[1]);
      }
      
      const dealMatch = line.match(/DEAL:\s*(true|false)/i);
      if (dealMatch && dealMatch[1].toLowerCase() === 'true') {
        isDealAccepted = true;
      }
    }
    
    const textMatch = text.match(/TEXT:\s*([\s\S]*?)$/im);
    if (textMatch) {
      verbalResponse = textMatch[1].trim();
    }
    
    const priceInText = text.match(/(\d{5,6})/);
    if (priceInText && price !== state.currentPrice) {
      price = parseInt(priceInText[1]);
    }
    
    const priceReductionPatterns = [
      /(\d{2,3},?\d{0,3})\s*(?:kam|krona|reduce)/i,
      /final\s*(?:kar|kar[ru])\s*(\d{5,6})/i,
      /(\d{5,6})\s*(?:final|fix)/i
    ];
    for (const pattern of priceReductionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extractedPrice = parseInt(match[1].replace(/,/g, ''));
        if (extractedPrice > state.currentPrice * 0.5 && extractedPrice < state.currentPrice) {
          price = extractedPrice;
        }
      }
    }
    
    const dealKeywords = ['deal', 'ho gaya', 'hogaya', 'ho gya', 'done', 'final', 'kardo', 'kar do', 'de do', 'dedo', 'lelunga', 'leleta hu', 'ok done', 'accept', 'agree', 'sigh'];
    const hasDealKeyword = dealKeywords.some(kw => verbalResponse.toLowerCase().includes(kw));
    if (hasDealKeyword && !isDealAccepted) {
      const dealContexts = ['deal', 'ho gaya', 'done', 'final', 'accept', 'agree'];
      const positiveContexts = dealContexts.some(c => verbalResponse.toLowerCase().includes(c));
      if (positiveContexts && verbalResponse.length > 30) {
        isDealAccepted = true;
      }
    }
    
    if (isDealAccepted && mood === 'neutral') mood = 'happy';
    
    return {
      mood,
      price,
      isDealAccepted,
      verbalResponse
    };
  }, [state.currentPrice]);

  const saveToLeaderboard = React.useCallback(async (finalPrice: number) => {
    if (!userId) return;
    
    try {
      await submitLeaderboardEntry({
        name: userName || 'Anonymous Negotiator',
        price: finalPrice,
        uid: userId
      });
      const entries = await fetchLeaderboard(10);
      setLeaderboard(entries);
    } catch (error) {
      console.error('Error saving to leaderboard:', error);
    }
  }, [userId, userName]);

  const handleSend = React.useCallback(async () => {
    if (!input.trim() || isLoading || state.isGameOver) return;

    const userMessage: Message = { role: 'user', text: input };
    const newHistory = [...state.history, userMessage];
    
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');
    
    try {
      const stream = getSellerResponseStream(newHistory, state.product);
      let accumulated = '';
      
      for await (const chunk of stream) {
        if (chunk === "ERROR_MISTRAL_KEY_MISSING") {
          setHasApiKey(false);
          setIsLoading(false);
          return;
        }
        if (chunk === "ERROR_MISTRAL_API_FAILED") {
          throw new Error("Mistral API failed");
        }
        accumulated += chunk;
        const parsed = parseMetadata(accumulated);
        
        if (parsed.mood !== currentMood) {
          setCurrentMood(parsed.mood as typeof currentMood);
        }
        
        setStreamingMessage(parsed.verbalResponse || accumulated || '...');
      }

      const finalParsed = parseMetadata(accumulated);
      
      const modelMessage: Message = {
        role: 'model',
        text: finalParsed.verbalResponse || accumulated,
        price: finalParsed.price,
        mood: (finalParsed.mood || 'neutral') as 'neutral' | 'surprised' | 'angry' | 'sad' | 'happy' | 'impressed' | 'firm' | 'yielding'
      };

      const isGameOver = finalParsed.isDealAccepted || state.rounds + 1 >= state.maxRounds;
      
      if (finalParsed.isDealAccepted) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#E5E4E2', '#FFFFFF']
        });
        saveToLeaderboard(finalParsed.price);
      }

      setState(prev => ({
        ...prev,
        history: [...newHistory, modelMessage],
        currentPrice: finalParsed.price,
        rounds: prev.rounds + 1,
        isGameOver
      }));
      setStreamingMessage('');
    } catch (error) {
      console.error('Negotiation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, state, parseMetadata, currentMood, saveToLeaderboard]);

  const resetGame = () => {
    setState(INITIAL_STATE);
    setIsGameStarted(false);
    setCurrentMood('neutral');
    setInput('');
    setStreamingMessage('');
  };

  if (!isGameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-obsidian">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-6"
        >
          <div className="flex justify-center mb-2">
            <RajeshAvatar mood="neutral" className="w-20 h-20" />
          </div>
          <h1 className="text-4xl font-bold gold-gradient">Bazaar Negotiation</h1>
          <p className="text-platinum/60">Welcome to the local bazaar. Can you convince Rajesh Bhaiya to give you a &quot;best price&quot; for his vintage collection?</p>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="text-xs uppercase tracking-widest text-gold font-semibold mb-2 block">Your Name</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-gold transition-colors text-platinum placeholder:text-platinum/30"
              />
            </div>
            <button 
              onClick={() => setIsGameStarted(true)}
              disabled={!userName.trim()}
              className="w-full btn-gold py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Begin Negotiation <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-obsidian text-platinum overflow-hidden">
      <div className="md:hidden glass-panel border-b border-white/10 p-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <RajeshAvatar mood={currentMood as any} isThinking={isLoading} className="w-10 h-10" />
          <div>
            <h1 className="text-sm font-bold text-gold leading-none">Rajesh Bhaiya</h1>
            <p className="text-[10px] text-platinum/40 uppercase tracking-widest mt-0.5">Bazaar Negotiation</p>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 glass-panel rounded-lg text-gold"
          aria-label="Toggle sidebar"
        >
          <Info size={20} />
        </button>
      </div>

      <AnimatePresence>
        {(isSidebarOpen || isMobile) && (
          <motion.div 
            initial={isMobile ? false : { x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "glass-panel border-r border-white/10 flex flex-col z-40",
              "fixed inset-y-0 left-0 w-80 md:relative md:inset-auto md:translate-x-0",
              "translate-x-0"
            )}
          >
            <div className="p-6 space-y-6 flex-1 overflow-y-auto pt-16 md:pt-6">
              {!isMobile && (
                <div className="absolute top-4 right-4">
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-platinum/40 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
              )}
              
              <div className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden border border-white/10">
                  <img 
                    src={state.product.image} 
                    alt={state.product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              
              <div className="pt-4 space-y-2">
                <h2 className="text-xl font-bold text-gold">{state.product.name}</h2>
                <p className="text-sm text-platinum/60 leading-relaxed">{state.product.description}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-gold flex items-center gap-2">
                  <Info size={12} /> Negotiation Tactics
                </h3>
                <ul className="text-[11px] text-platinum/50 space-y-2 list-disc pl-4">
                  <li>Rajesh Bhaiya loves a good &quot;Bhaiya&quot; or &quot;Sirji&quot;.</li>
                  <li>Show respect for the heritage of the bike.</li>
                  <li>Don&apos;t lowball too hard, or he&apos;ll get &quot;angry&quot;.</li>
                  <li>Use logic like &quot;market down hai&quot; or &quot;maintenance kharcha&quot;.</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-gold mb-1">
                    <Clock size={14} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">Rounds</span>
                  </div>
                  <div className="text-xl font-mono">{state.rounds}/{state.maxRounds}</div>
                </div>
                <div className="glass-panel p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-gold mb-1">
                    <TrendingDown size={14} />
                    <span className="text-[10px] uppercase tracking-wider font-bold">Offer</span>
                  </div>
                  <div className="text-xl font-mono text-gold">₹{state.currentPrice.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 space-y-2 bg-obsidian/80 backdrop-blur-md">
              <button 
                onClick={() => { setShowLeaderboard(true); setIsSidebarOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-platinum/60 hover:text-gold transition-colors"
              >
                <Trophy size={16} /> Leaderboard
              </button>
              <button 
                onClick={() => { resetGame(); setIsSidebarOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-platinum/60 hover:text-red-400 transition-colors"
              >
                <RefreshCw size={16} /> Reset Game
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col min-h-0 relative">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth"
        >
          {state.history.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-3 md:gap-4 max-w-2xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-white/5 border border-white/10" : ""
              )}>
                {msg.role === 'user' ? <User size={16} className="md:w-[18px] md:h-[18px]" /> : <RajeshAvatar mood={msg.mood as any || 'neutral'} className="w-8 h-8 md:w-10 md:h-10" />}
              </div>
              <div className={cn(
                "p-3 md:p-4 rounded-2xl space-y-2 min-w-0",
                msg.role === 'user' ? "bg-white/5 rounded-tr-none" : "glass-panel rounded-tl-none"
              )}>
                {msg.role === 'model' && msg.mood && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      msg.mood === 'angry' ? "border-red-500/50 text-red-400 bg-red-500/10" :
                      msg.mood === 'sad' ? "border-blue-500/50 text-blue-400 bg-blue-500/10" :
                      msg.mood === 'surprised' ? "border-purple-500/50 text-purple-400 bg-purple-500/10" :
                      msg.mood === 'happy' ? "border-green-500/50 text-green-400 bg-green-500/10" :
                      msg.mood === 'impressed' ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" :
                      msg.mood === 'firm' ? "border-orange-500/50 text-orange-400 bg-orange-500/10" :
                      msg.mood === 'yielding' ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" :
                      "border-white/20 text-white/40 bg-white/5"
                    )}>
                      {msg.mood}
                    </span>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.price && msg.role === 'model' && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-4">
                    <span className="text-[10px] text-platinum/40 uppercase tracking-widest">Current Offer</span>
                    <span className="text-base md:text-lg font-mono text-gold">₹{msg.price.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {streamingMessage && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 md:gap-4 max-w-2xl mr-auto"
            >
              <RajeshAvatar mood={currentMood as any} className="w-8 h-8 md:w-10 md:h-10" isThinking={true} />
              <div className="glass-panel p-3 md:p-4 rounded-2xl rounded-tl-none space-y-2">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          {isLoading && !streamingMessage && (
            <div className="flex gap-3 md:gap-4 max-w-2xl">
              <RajeshAvatar mood={currentMood as any} className="w-8 h-8 md:w-10 md:h-10" isThinking={true} />
              <div className="glass-panel p-3 md:p-4 rounded-2xl rounded-tl-none animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t border-white/10 bg-obsidian/50 backdrop-blur-xl shrink-0">
          {!hasApiKey ? (
            <div className="max-w-4xl mx-auto glass-panel p-4 md:p-6 rounded-2xl border-gold/30 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-gold">
                <AlertCircle size={20} />
                <span className="font-bold uppercase tracking-widest text-xs md:text-sm">API Key Required</span>
              </div>
              <p className="text-xs md:text-sm text-platinum/60">To continue the negotiation with Rajesh Bhaiya, please ensure the Mistral API key is configured in the environment.</p>
              <div className="text-[10px] text-platinum/40 bg-white/5 p-2 rounded border border-white/10">
                Tip: Add MISTRAL_API_KEY to your environment variables.
              </div>
            </div>
          ) : !state.isGameOver ? (
            <div className="max-w-4xl mx-auto relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Bhaiya, thoda kam karo..."
                className="w-full bg-white/5 border border-white/10 rounded-full px-5 md:px-6 py-3 md:py-4 pr-12 md:pr-16 focus:outline-none focus:border-gold transition-all text-sm md:text-base text-platinum placeholder:text-platinum/30"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full btn-gold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-gold">
                <AlertCircle size={20} />
                <span className="font-bold uppercase tracking-widest text-xs md:text-sm">Negotiation Concluded</span>
              </div>
              <p className="text-sm text-platinum/60">
                Final Price: <span className="text-gold font-mono">₹{state.currentPrice.toLocaleString()}</span>
              </p>
              <button 
                onClick={resetGame}
                className="btn-gold px-8 py-3 rounded-full text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showLeaderboard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel p-6 md:p-8 rounded-2xl max-w-lg w-full space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold gold-gradient flex items-center gap-2">
                  <Trophy size={22} className="md:w-6 md:h-6" /> Hall of Fame
                </h2>
                <button onClick={() => setShowLeaderboard(false)} className="text-platinum/40 hover:text-white transition-colors">
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                  <div key={entry.uid || i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3 md:gap-4">
                      <span className="text-gold font-mono w-5 text-sm md:text-base">{i + 1}.</span>
                      <div>
                        <div className="font-semibold text-sm md:text-base">{entry.name}</div>
                        <div className="text-[10px] text-platinum/40 uppercase tracking-widest">{entry.date}</div>
                      </div>
                    </div>
                    <div className="text-lg md:text-xl font-mono text-gold">₹{entry.price.toLocaleString()}</div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-platinum/40">No records yet. Be the first to make a deal.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
