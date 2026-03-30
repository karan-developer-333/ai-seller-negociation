import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type Mood = 'neutral' | 'annoyed' | 'impressed' | 'firm' | 'yielding';

interface RajeshAvatarProps {
  mood: Mood;
  className?: string;
  isThinking?: boolean;
}

export const RajeshAvatar: React.FC<RajeshAvatarProps> = ({ mood, className, isThinking }) => {
  const getMoodColors = () => {
    switch (mood) {
      case 'annoyed': return { primary: '#FF6B6B', secondary: '#4D0000', glow: 'rgba(255, 107, 107, 0.4)', blush: '#FF8787' };
      case 'impressed': return { primary: '#FFD93D', secondary: '#4D4000', glow: 'rgba(255, 217, 61, 0.4)', blush: '#FFB7B7' };
      case 'firm': return { primary: '#FF9F29', secondary: '#4D2A00', glow: 'rgba(255, 159, 41, 0.4)', blush: '#FFB7B7' };
      case 'yielding': return { primary: '#6BCB77', secondary: '#004D1A', glow: 'rgba(107, 203, 119, 0.4)', blush: '#FFB7B7' };
      default: return { primary: '#4D96FF', secondary: '#002A4D', glow: 'rgba(77, 150, 255, 0.3)', blush: '#FFB7B7' };
    }
  };

  const colors = getMoodColors();

  return (
    <div className={cn("relative", className)}>
      <motion.div
        animate={{
          y: [0, -4, 0],
          scale: isThinking ? [1, 1.05, 1] : 1
        }}
        transition={{ 
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          scale: { repeat: isThinking ? Infinity : 0, duration: 1.5 }
        }}
        className="w-full h-full rounded-full overflow-hidden border-4 bg-obsidian"
        style={{ borderColor: colors.primary, boxShadow: `0 0 20px ${colors.glow}` }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Face Base */}
          <circle cx="50" cy="50" r="45" fill="#1A1A1A" />
          
          {/* Blushing */}
          <motion.circle 
            cx="25" cy="60" r="8" 
            fill={colors.blush} 
            animate={{ opacity: mood === 'impressed' ? 0.6 : 0.2 }}
            transition={{ duration: 0.5 }}
          />
          <motion.circle 
            cx="75" cy="60" r="8" 
            fill={colors.blush} 
            animate={{ opacity: mood === 'impressed' ? 0.6 : 0.2 }}
            transition={{ duration: 0.5 }}
          />

          {/* Eyes Container */}
          <g transform="translate(0, -5)">
            {/* Left Eye */}
            <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.45, 0.5, 0.55, 1] }}>
              <circle cx="35" cy="45" r="10" fill="white" />
              <motion.circle 
                cx="37" cy="43" r="5" fill="black"
                animate={{ 
                  x: mood === 'annoyed' ? -2 : mood === 'yielding' ? 2 : 0,
                  y: mood === 'annoyed' ? -2 : 0
                }}
              />
              <circle cx="39" cy="40" r="2" fill="white" />
            </motion.g>

            {/* Right Eye */}
            <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.45, 0.5, 0.55, 1] }}>
              <circle cx="65" cy="45" r="10" fill="white" />
              <motion.circle 
                cx="63" cy="43" r="5" fill="black"
                animate={{ 
                  x: mood === 'annoyed' ? 2 : mood === 'yielding' ? -2 : 0,
                  y: mood === 'annoyed' ? -2 : 0
                }}
              />
              <circle cx="61" cy="40" r="2" fill="white" />
            </motion.g>
          </g>

          {/* Mouth */}
          <motion.path
            d={mood === 'annoyed' ? "M 40 75 Q 50 65 60 75" : 
               mood === 'impressed' ? "M 35 70 Q 50 85 65 70" :
               mood === 'firm' ? "M 40 72 L 60 72" :
               "M 40 70 Q 50 78 60 70"}
            stroke={colors.primary}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            animate={{ d: mood === 'annoyed' ? "M 40 75 Q 50 65 60 75" : 
                           mood === 'impressed' ? "M 35 70 Q 50 85 65 70" :
                           mood === 'firm' ? "M 40 72 L 60 72" :
                           "M 40 70 Q 50 78 60 70" }}
          />

          {/* Sparkles for Impressed */}
          {mood === 'impressed' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <circle cx="20" cy="20" r="2" fill="white" />
              <circle cx="85" cy="30" r="1.5" fill="white" />
            </motion.g>
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
};
