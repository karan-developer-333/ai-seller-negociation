import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type Mood = 'neutral' | 'annoyed' | 'impressed' | 'firm' | 'yielding';

interface JulianAvatarProps {
  mood: Mood;
  className?: string;
  isThinking?: boolean;
}

export const JulianAvatar: React.FC<JulianAvatarProps> = ({ mood, className, isThinking }) => {
  const getMoodColors = () => {
    switch (mood) {
      case 'annoyed': return { primary: '#ef4444', secondary: '#7f1d1d', glow: 'rgba(239, 68, 68, 0.3)' };
      case 'impressed': return { primary: '#10b981', secondary: '#064e3b', glow: 'rgba(16, 185, 129, 0.3)' };
      case 'firm': return { primary: '#D4AF37', secondary: '#78350f', glow: 'rgba(212, 175, 55, 0.3)' };
      case 'yielding': return { primary: '#94a3b8', secondary: '#1e293b', glow: 'rgba(148, 163, 184, 0.3)' };
      default: return { primary: '#D4AF37', secondary: '#1e1e1e', glow: 'rgba(212, 175, 55, 0.2)' };
    }
  };

  const colors = getMoodColors();

  const eyeVariants = {
    neutral: { scaleY: 1, d: "M 35 45 Q 40 45 45 45" },
    annoyed: { scaleY: 0.3, d: "M 35 42 Q 40 45 45 42" },
    impressed: { scaleY: 1.2, d: "M 35 45 Q 40 40 45 45" },
    firm: { scaleY: 0.8, d: "M 35 43 Q 40 43 45 43" },
    yielding: { scaleY: 1, d: "M 35 45 Q 40 48 45 45" }
  };

  const mouthVariants = {
    neutral: { d: "M 40 65 Q 50 65 60 65" },
    annoyed: { d: "M 42 68 Q 50 65 58 68" },
    impressed: { d: "M 40 65 Q 50 72 60 65" },
    firm: { d: "M 40 67 Q 50 67 60 67" },
    yielding: { d: "M 40 65 Q 50 68 60 65" }
  };

  return (
    <div className={cn("relative", className)}>
      <motion.div
        animate={{
          boxShadow: isThinking ? `0 0 30px ${colors.glow}` : `0 0 15px ${colors.glow}`,
          scale: isThinking ? [1, 1.05, 1] : 1
        }}
        transition={{ repeat: isThinking ? Infinity : 0, duration: 2 }}
        className="w-full h-full rounded-full overflow-hidden border-2"
        style={{ borderColor: colors.primary, background: '#0B0B0B' }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Head Shape */}
          <motion.path
            d="M 20 50 Q 20 20 50 20 Q 80 20 80 50 Q 80 80 50 80 Q 20 80 20 50"
            fill="none"
            stroke={colors.primary}
            strokeWidth="1.5"
            animate={{ stroke: colors.primary }}
          />

          {/* Eyes */}
          <g transform="translate(0, 0)">
            {/* Left Eye */}
            <motion.path
              variants={eyeVariants}
              animate={mood}
              stroke={colors.primary}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="origin-center"
              style={{ x: 0 }}
            />
            {/* Right Eye */}
            <motion.path
              variants={eyeVariants}
              animate={mood}
              stroke={colors.primary}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="origin-center"
              style={{ x: 30 }}
            />
          </g>

          {/* Mouth */}
          <motion.path
            variants={mouthVariants}
            animate={mood}
            stroke={colors.primary}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Decorative Tech Lines */}
          <motion.path
            d="M 10 50 L 20 50 M 80 50 L 90 50 M 50 10 L 50 20 M 50 80 L 50 90"
            stroke={colors.primary}
            strokeWidth="0.5"
            opacity="0.3"
          />
        </svg>
      </motion.div>
      
      {isThinking && (
        <motion.div
          className="absolute -inset-2 rounded-full border border-gold/20"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { repeat: Infinity, duration: 8, ease: "linear" }, scale: { repeat: Infinity, duration: 2 } }}
        />
      )}
    </div>
  );
};
