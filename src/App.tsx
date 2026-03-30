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
  Bot,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';
import { Message, NegotiationState, Product, LeaderboardEntry } from './types';
import { getSellerResponseStream } from './services/mistralService';
import { RajeshAvatar } from './components/RajeshAvatar';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';

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
      text: "Namaste! Main hoon Rajesh. Ye Vintage Royal Enfield dekh rahe ho? Ekdum mast condition mein hai. Iska price ₹4,50,000 hai. Kya bolte ho?",
      price: 450000,
      mood: 'neutral'
    }
  ],
  product: PRODUCT
};

export default function App() {
  const [state, setState] = useState<NegotiationState>(INITIAL_STATE);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [currentMood, setCurrentMood] = useState<any>('neutral');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userName, setUserName] = useState('');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Leaderboard from Firebase
  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('price', 'asc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate().toLocaleDateString() : data.date
        } as LeaderboardEntry;
      });
      setLeaderboard(entries);
    }, (error) => {
      console.error("Leaderboard fetch error:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check if Mistral API key is set in environment (server-side)
    // For client-side check, we rely on the error from the service
    setHasApiKey(true); 
  }, []);

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.openSelectKey) {
      await aiStudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.history, streamingMessage]);

  const parseMetadata = React.useCallback((text: string) => {
    const moodMatch = text.match(/MOOD:\s*(\w+)/i);
    const priceMatch = text.match(/PRICE:\s*(\d+)/i);
    const dealMatch = text.match(/DEAL:\s*(true|false)/i);
    const textMatch = text.match(/TEXT:\s*([\s\S]*)/i);

    return {
      mood: moodMatch ? moodMatch[1].toLowerCase() : 'neutral',
      price: priceMatch ? parseInt(priceMatch[1]) : state.currentPrice,
      isDealAccepted: dealMatch ? dealMatch[1].toLowerCase() === 'true' : false,
      verbalResponse: textMatch ? textMatch[1].trim() : ''
    };
  }, [state.currentPrice]);

  const saveToLeaderboard = React.useCallback(async (finalPrice: number) => {
    if (!userId) return;
    
    try {
      const entry = {
        name: userName || 'Anonymous Negotiator',
        price: finalPrice,
        date: Timestamp.now(),
        uid: userId
      };
      await addDoc(collection(db, 'leaderboard'), entry);
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
          setCurrentMood(parsed.mood);
        }
        
        setStreamingMessage(parsed.verbalResponse || '...');
      }

      const finalParsed = parseMetadata(accumulated);
      
      const modelMessage: Message = {
        role: 'model',
        text: finalParsed.verbalResponse || accumulated,
        price: finalParsed.price,
        mood: finalParsed.mood as any
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
  };

  if (!isGameStarted) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-6"
        >
          <h1 className="text-4xl font-bold gold-gradient">Bazaar Negotiation</h1>
          <p className="text-platinum/60">Welcome to the local bazaar. Can you convince Rajesh Bhaiya to give you a "best price" for his vintage collection?</p>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="text-xs uppercase tracking-widest text-gold font-semibold mb-2 block">Your Name</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-gold transition-colors"
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
    <div className="h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-obsidian text-platinum">
      {/* Mobile Header */}
      <div className="md:hidden glass-panel border-b border-white/10 p-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <RajeshAvatar mood={currentMood} isThinking={isLoading} className="w-10 h-10" />
          <div>
            <h1 className="text-sm font-bold text-gold leading-none">Rajesh Bhaiya</h1>
            <p className="text-[10px] text-platinum/40 uppercase tracking-widest mt-1">Bazaar Negotiation</p>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 glass-panel rounded-lg text-gold"
        >
          <Info size={20} />
        </button>
      </div>

      {/* Sidebar / Product Info */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.div 
            initial={window.innerWidth < 768 ? { x: -320 } : false}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "w-full md:w-80 glass-panel border-r border-white/10 flex flex-col z-40",
              "fixed inset-y-0 left-0 md:relative md:inset-auto"
            )}
          >
            <div className="p-6 space-y-6 flex-1 overflow-y-auto pt-20 md:pt-6">
              <div className="md:hidden absolute top-4 right-4">
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-platinum/40 hover:text-white">✕</button>
              </div>
              
              <div className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden border border-white/10">
                  <img src={state.product.image} alt={state.product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 hidden md:block">
                  <RajeshAvatar mood={currentMood} isThinking={isLoading} className="shadow-2xl" />
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
                  <li>Rajesh Bhaiya loves a good "Bhaiya" or "Sirji".</li>
                  <li>Show respect for the heritage of the bike.</li>
                  <li>Don't lowball too hard, or he'll get "annoyed".</li>
                  <li>Use logic like "market down hai" or "maintenance kharcha".</li>
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
                  <div className="text-xl font-mono">₹{state.currentPrice.toLocaleString()}</div>
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

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {state.history.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-4 max-w-2xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-white/5 border border-white/10" : ""
              )}>
                {msg.role === 'user' ? <User size={18} /> : <RajeshAvatar mood={msg.mood || 'neutral'} className="w-10 h-10" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl space-y-2",
                msg.role === 'user' ? "bg-white/5 rounded-tr-none" : "glass-panel rounded-tl-none"
              )}>
                {msg.role === 'model' && msg.mood && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      msg.mood === 'annoyed' ? "border-red-500/50 text-red-400 bg-red-500/10" :
                      msg.mood === 'impressed' ? "border-green-500/50 text-green-400 bg-green-500/10" :
                      msg.mood === 'firm' ? "border-gold/50 text-gold bg-gold/10" :
                      "border-white/20 text-white/40 bg-white/5"
                    )}>
                      {msg.mood}
                    </span>
                  </div>
                )}
                <div className="prose prose-invert prose-sm">
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
              className="flex gap-4 max-w-2xl mr-auto"
            >
              <RajeshAvatar mood={currentMood} className="w-10 h-10" isThinking={true} />
              <div className="glass-panel p-4 rounded-2xl rounded-tl-none space-y-2">
                <div className="prose prose-invert prose-sm">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          {isLoading && !streamingMessage && (
            <div className="flex gap-4 max-w-2xl">
              <RajeshAvatar mood={currentMood} className="w-10 h-10" isThinking={true} />
              <div className="glass-panel p-4 rounded-2xl rounded-tl-none animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-gold/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-white/10 bg-obsidian/50 backdrop-blur-xl pb-safe">
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
                className="w-full bg-white/5 border border-white/10 rounded-full px-5 md:px-6 py-3 md:py-4 pr-14 md:pr-16 focus:outline-none focus:border-gold transition-all text-sm md:text-base"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full btn-gold flex items-center justify-center disabled:opacity-50"
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

      {/* Leaderboard Modal */}
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
              className="glass-panel p-8 rounded-2xl max-w-lg w-full space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold gold-gradient flex items-center gap-2">
                  <Trophy size={24} /> Hall of Fame
                </h2>
                <button onClick={() => setShowLeaderboard(false)} className="text-platinum/40 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-4">
                      <span className="text-gold font-mono w-4">{i + 1}.</span>
                      <div>
                        <div className="font-semibold">{entry.name}</div>
                        <div className="text-[10px] text-platinum/40 uppercase tracking-widest">{entry.date}</div>
                      </div>
                    </div>
                    <div className="text-xl font-mono text-gold">₹{entry.price.toLocaleString()}</div>
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
