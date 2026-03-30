import React, { memo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type Mood = 'neutral' | 'surprised' | 'angry' | 'sad' | 'happy' | 'impressed' | 'firm' | 'yielding';

interface RajeshAvatarProps {
  mood: Mood;
  className?: string;
  isThinking?: boolean;
}

export const RajeshAvatar: React.FC<RajeshAvatarProps> = memo(({ mood, className, isThinking }) => {
  const getMoodColors = () => {
    switch (mood) {
      case 'surprised': return { primary: '#9B59B6', secondary: '#4A235A', glow: 'rgba(155, 89, 182, 0.5)', blush: '#D7BDE2' };
      case 'angry': return { primary: '#E74C3C', secondary: '#641E16', glow: 'rgba(231, 76, 60, 0.6)', blush: '#F1948A' };
      case 'sad': return { primary: '#5DADE2', secondary: '#1A5276', glow: 'rgba(93, 173, 226, 0.4)', blush: '#85C1E9' };
      case 'impressed': return { primary: '#F1C40F', secondary: '#7D6608', glow: 'rgba(241, 196, 15, 0.5)', blush: '#F9E79F' };
      case 'firm': return { primary: '#E67E22', secondary: '#784212', glow: 'rgba(230, 126, 34, 0.5)', blush: '#F0B27A' };
      case 'yielding': return { primary: '#2ECC71', secondary: '#145A32', glow: 'rgba(46, 204, 113, 0.5)', blush: '#ABEBC6' };
      case 'happy': return { primary: '#00FF7F', secondary: '#006400', glow: 'rgba(0, 255, 127, 0.6)', blush: '#FF69B4' };
      default: return { primary: '#4D96FF', secondary: '#1A5276', glow: 'rgba(77, 150, 255, 0.4)', blush: '#85C1E9' };
    }
  };

  const colors = getMoodColors();
  
  const showBlush = ['impressed', 'yielding', 'happy', 'surprised', 'sad'].includes(mood);
  const showSparkles = ['impressed', 'happy', 'surprised'].includes(mood);
  const shake = mood === 'angry';

  return (
    <div className={cn("relative", className)}>
      <motion.div
        animate={{
          y: [0, isThinking ? -4 : 0],
          scale: isThinking ? [1, 1.02, 1] : 1,
          x: shake ? [0, -2, 2, -2, 0] : 0
        }}
        transition={{ 
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          scale: { repeat: isThinking ? Infinity : 0, duration: 2 },
          x: { repeat: shake ? Infinity : 0, duration: 0.1 }
        }}
        className="w-full h-full rounded-full overflow-hidden border-4 bg-obsidian"
        style={{ borderColor: colors.primary, boxShadow: `0 0 25px ${colors.glow}` }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="#1A1A1A" />
          
          <circle cx="25" cy="62" r="8" fill={colors.blush} opacity={showBlush ? 0.6 : 0.15} />
          <circle cx="75" cy="62" r="8" fill={colors.blush} opacity={showBlush ? 0.6 : 0.15} />

          <g transform="translate(0, -3)">
            {mood === 'surprised' ? (
              <>
                <circle cx="35" cy="42" r="12" fill="white" />
                <circle cx="35" cy="42" r="6" fill="black" />
                <circle cx="37" cy="40" r="2" fill="white" />
                <circle cx="65" cy="42" r="12" fill="white" />
                <circle cx="65" cy="42" r="6" fill="black" />
                <circle cx="67" cy="40" r="2" fill="white" />
              </>
            ) : mood === 'angry' ? (
              <>
                <g>
                  <circle cx="35" cy="45" r="10" fill="white" />
                  <circle cx="35" cy="46" r="5" fill="black" />
                  <circle cx="37" cy="43" r="2" fill="white" />
                  <line x1="28" y1="38" x2="42" y2="42" stroke={colors.primary} strokeWidth="3" />
                </g>
                <g>
                  <circle cx="65" cy="45" r="10" fill="white" />
                  <circle cx="65" cy="46" r="5" fill="black" />
                  <circle cx="63" cy="43" r="2" fill="white" />
                  <line x1="58" y1="42" x2="72" y2="38" stroke={colors.primary} strokeWidth="3" />
                </g>
              </>
            ) : mood === 'sad' ? (
              <>
                <circle cx="35" cy="45" r="10" fill="white" />
                <circle cx="35" cy="47" r="5" fill="black" />
                <circle cx="37" cy="43" r="2" fill="white" />
                <circle cx="65" cy="45" r="10" fill="white" />
                <circle cx="65" cy="47" r="5" fill="black" />
                <circle cx="63" cy="43" r="2" fill="white" />
                <path d="M 30 38 Q 35 35 40 38" stroke={colors.primary} strokeWidth="2" fill="none" />
                <path d="M 60 38 Q 65 35 70 38" stroke={colors.primary} strokeWidth="2" fill="none" />
              </>
            ) : (
              <>
                <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.45, 0.5, 0.55, 1] }}>
                  <circle cx="35" cy="45" r="10" fill="white" />
                  <circle 
                    cx={37 + (mood === 'happy' ? 1 : 0)} 
                    cy={43} 
                    r="5" fill="black"
                  />
                  <circle cx="38" cy="41" r="2" fill="white" />
                </motion.g>
                <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.45, 0.5, 0.55, 1] }}>
                  <circle cx="65" cy="45" r="10" fill="white" />
                  <circle 
                    cx={63 + (mood === 'happy' ? -1 : 0)} 
                    cy={43} 
                    r="5" fill="black"
                  />
                  <circle cx="63" cy="41" r="2" fill="white" />
                </motion.g>
              </>
            )}
          </g>

          <path
            d={
              mood === 'surprised' ? "M 40 72 Q 50 78 60 72" :
              mood === 'angry' ? "M 38 78 Q 50 68 62 78" :
              mood === 'sad' ? "M 40 78 Q 50 70 60 78" :
              mood === 'impressed' ? "M 35 70 Q 50 82 65 70" :
              mood === 'firm' ? "M 38 73 L 62 73" :
              mood === 'yielding' ? "M 38 72 Q 50 80 62 72" :
              mood === 'happy' ? "M 32 68 Q 50 88 68 68" :
              "M 40 70 Q 50 78 60 70"
            }
            stroke={colors.primary}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {showSparkles && (
            <g>
              <motion.circle 
                cx="18" cy="22" r="3" fill="white" opacity="0.9"
                animate={{ scale: [1, 1.2, 1], opacity: [0.9, 0.5, 0.9] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <motion.circle 
                cx="84" cy="28" r="2" fill="white" opacity="0.7"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.3, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              />
              <motion.circle 
                cx="88" cy="72" r="2.5" fill="white" opacity="0.8"
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
              />
            </g>
          )}

          {mood === 'happy' && (
            <g>
              <path d="M 25 28 L 28 23 L 31 28" stroke="#FFD700" strokeWidth="2" fill="none" />
              <path d="M 69 28 L 72 23 L 75 28" stroke="#FFD700" strokeWidth="2" fill="none" />
            </g>
          )}
          
          {mood === 'sad' && (
            <g>
              <motion.path 
                d="M 15 30 Q 20 35 25 30" stroke="#5DADE2" strokeWidth="2" fill="none" opacity="0.5"
                animate={{ opacity: [0.5, 0.2, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </g>
          )}
        </svg>
      </motion.div>
      
      {isThinking && (
        <motion.div
          className="absolute -inset-4 rounded-full border-2 border-dashed border-gold/40"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        />
      )}
    </div>
  );
});
RajeshAvatar.displayName = 'RajeshAvatar';
