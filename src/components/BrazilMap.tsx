import { motion } from "framer-motion";

interface Office {
  id: string;
  name: string;
  state: string;
  x: number;
  y: number;
  isMain: boolean;
}

const offices: Office[] = [
  { id: "cuiaba", name: "Cuiabá", state: "MT", x: 44, y: 52, isMain: true },
  { id: "barreiras", name: "Barreiras", state: "BA", x: 70, y: 48, isMain: false },
  { id: "curitiba", name: "Curitiba", state: "PR", x: 56, y: 82, isMain: false },
];

// Brazil outline represented as dots - simplified representation
const brazilDots = [
  // Northern region
  { x: 55, y: 8 }, { x: 58, y: 10 }, { x: 62, y: 8 }, { x: 66, y: 10 }, { x: 70, y: 8 },
  { x: 50, y: 12 }, { x: 54, y: 14 }, { x: 58, y: 12 }, { x: 62, y: 14 }, { x: 66, y: 12 }, { x: 70, y: 14 }, { x: 74, y: 12 },
  { x: 46, y: 16 }, { x: 50, y: 18 }, { x: 54, y: 16 }, { x: 58, y: 18 }, { x: 62, y: 16 }, { x: 66, y: 18 }, { x: 70, y: 16 }, { x: 74, y: 18 }, { x: 78, y: 16 },
  { x: 42, y: 20 }, { x: 46, y: 22 }, { x: 50, y: 20 }, { x: 54, y: 22 }, { x: 58, y: 20 }, { x: 62, y: 22 }, { x: 66, y: 20 }, { x: 70, y: 22 }, { x: 74, y: 20 }, { x: 78, y: 22 }, { x: 82, y: 20 },
  
  // Amazon region
  { x: 38, y: 24 }, { x: 42, y: 26 }, { x: 46, y: 24 }, { x: 50, y: 26 }, { x: 54, y: 24 }, { x: 58, y: 26 }, { x: 62, y: 24 }, { x: 66, y: 26 }, { x: 70, y: 24 }, { x: 74, y: 26 }, { x: 78, y: 24 }, { x: 82, y: 26 }, { x: 86, y: 24 },
  { x: 34, y: 28 }, { x: 38, y: 30 }, { x: 42, y: 28 }, { x: 46, y: 30 }, { x: 50, y: 28 }, { x: 54, y: 30 }, { x: 58, y: 28 }, { x: 62, y: 30 }, { x: 66, y: 28 }, { x: 70, y: 30 }, { x: 74, y: 28 }, { x: 78, y: 30 }, { x: 82, y: 28 }, { x: 86, y: 30 },
  { x: 30, y: 32 }, { x: 34, y: 34 }, { x: 38, y: 32 }, { x: 42, y: 34 }, { x: 46, y: 32 }, { x: 50, y: 34 }, { x: 54, y: 32 }, { x: 58, y: 34 }, { x: 62, y: 32 }, { x: 66, y: 34 }, { x: 70, y: 32 }, { x: 74, y: 34 }, { x: 78, y: 32 }, { x: 82, y: 34 }, { x: 86, y: 32 },
  
  // Central-West (MT highlighted)
  { x: 30, y: 36 }, { x: 34, y: 38 }, { x: 38, y: 36 }, { x: 42, y: 38 }, { x: 46, y: 36 }, { x: 50, y: 38 }, { x: 54, y: 36 }, { x: 58, y: 38 }, { x: 62, y: 36 }, { x: 66, y: 38 }, { x: 70, y: 36 }, { x: 74, y: 38 }, { x: 78, y: 36 }, { x: 82, y: 38 }, { x: 86, y: 36 }, { x: 90, y: 38 },
  { x: 30, y: 40 }, { x: 34, y: 42 }, { x: 38, y: 40 }, { x: 42, y: 42 }, { x: 46, y: 40 }, { x: 50, y: 42 }, { x: 54, y: 40 }, { x: 58, y: 42 }, { x: 62, y: 40 }, { x: 66, y: 42 }, { x: 70, y: 40 }, { x: 74, y: 42 }, { x: 78, y: 40 }, { x: 82, y: 42 }, { x: 86, y: 40 }, { x: 90, y: 42 },
  { x: 30, y: 44 }, { x: 34, y: 46 }, { x: 38, y: 44 }, { x: 42, y: 46 }, { x: 46, y: 44 }, { x: 50, y: 46 }, { x: 54, y: 44 }, { x: 58, y: 46 }, { x: 62, y: 44 }, { x: 66, y: 46 }, { x: 70, y: 44 }, { x: 74, y: 46 }, { x: 78, y: 44 }, { x: 82, y: 46 }, { x: 86, y: 44 }, { x: 90, y: 46 },
  { x: 34, y: 48 }, { x: 38, y: 50 }, { x: 42, y: 48 }, { x: 46, y: 50 }, { x: 50, y: 48 }, { x: 54, y: 50 }, { x: 58, y: 48 }, { x: 62, y: 50 }, { x: 66, y: 48 }, { x: 70, y: 50 }, { x: 74, y: 48 }, { x: 78, y: 50 }, { x: 82, y: 48 }, { x: 86, y: 50 }, { x: 90, y: 48 },
  
  // Northeast (BA highlighted)
  { x: 38, y: 52 }, { x: 42, y: 54 }, { x: 46, y: 52 }, { x: 50, y: 54 }, { x: 54, y: 52 }, { x: 58, y: 54 }, { x: 62, y: 52 }, { x: 66, y: 54 }, { x: 70, y: 52 }, { x: 74, y: 54 }, { x: 78, y: 52 }, { x: 82, y: 54 }, { x: 86, y: 52 },
  { x: 42, y: 56 }, { x: 46, y: 58 }, { x: 50, y: 56 }, { x: 54, y: 58 }, { x: 58, y: 56 }, { x: 62, y: 58 }, { x: 66, y: 56 }, { x: 70, y: 58 }, { x: 74, y: 56 }, { x: 78, y: 58 }, { x: 82, y: 56 },
  
  // Southeast
  { x: 46, y: 60 }, { x: 50, y: 62 }, { x: 54, y: 60 }, { x: 58, y: 62 }, { x: 62, y: 60 }, { x: 66, y: 62 }, { x: 70, y: 60 }, { x: 74, y: 62 }, { x: 78, y: 60 },
  { x: 46, y: 64 }, { x: 50, y: 66 }, { x: 54, y: 64 }, { x: 58, y: 66 }, { x: 62, y: 64 }, { x: 66, y: 66 }, { x: 70, y: 64 }, { x: 74, y: 66 },
  { x: 50, y: 68 }, { x: 54, y: 70 }, { x: 58, y: 68 }, { x: 62, y: 70 }, { x: 66, y: 68 }, { x: 70, y: 70 },
  
  // South (PR highlighted)
  { x: 50, y: 72 }, { x: 54, y: 74 }, { x: 58, y: 72 }, { x: 62, y: 74 }, { x: 66, y: 72 },
  { x: 50, y: 76 }, { x: 54, y: 78 }, { x: 58, y: 76 }, { x: 62, y: 78 }, { x: 66, y: 76 },
  { x: 50, y: 80 }, { x: 54, y: 82 }, { x: 58, y: 80 }, { x: 62, y: 82 },
  { x: 50, y: 84 }, { x: 54, y: 86 }, { x: 58, y: 84 },
  { x: 50, y: 88 }, { x: 54, y: 90 },
];

// Highlighted dots for operational states (MT, BA, PR regions)
const operationalDots = [
  // MT region
  { x: 38, y: 44 }, { x: 42, y: 46 }, { x: 46, y: 44 }, { x: 50, y: 46 }, { x: 38, y: 48 }, { x: 42, y: 50 }, { x: 46, y: 48 }, { x: 50, y: 50 },
  { x: 38, y: 52 }, { x: 42, y: 54 }, { x: 46, y: 52 }, { x: 50, y: 54 },
  // BA region  
  { x: 66, y: 40 }, { x: 70, y: 42 }, { x: 74, y: 40 }, { x: 78, y: 42 }, { x: 82, y: 40 },
  { x: 66, y: 44 }, { x: 70, y: 46 }, { x: 74, y: 44 }, { x: 78, y: 46 }, { x: 82, y: 44 },
  { x: 66, y: 48 }, { x: 70, y: 50 }, { x: 74, y: 48 }, { x: 78, y: 50 },
  // PR region
  { x: 50, y: 76 }, { x: 54, y: 78 }, { x: 58, y: 76 }, { x: 62, y: 78 },
  { x: 50, y: 80 }, { x: 54, y: 82 }, { x: 58, y: 80 },
];

const operationalSet = new Set(operationalDots.map(d => `${d.x}-${d.y}`));

export const BrazilMap = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative w-full aspect-square max-w-md mx-auto"
    >
      <svg
        viewBox="0 0 120 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background dots forming Brazil */}
        {brazilDots.map((dot, index) => {
          const isOperational = operationalSet.has(`${dot.x}-${dot.y}`);
          return (
            <motion.circle
              key={`dot-${index}`}
              cx={dot.x}
              cy={dot.y}
              r={1.2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.003, duration: 0.3 }}
              className={isOperational ? "fill-emerald-500/80" : "fill-gray-600"}
            />
          );
        })}

        {/* Connection lines between offices */}
        <motion.path
          d="M 44 52 Q 57 40 70 48"
          fill="none"
          stroke="url(#connectionGradient)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ delay: 0.8, duration: 1 }}
        />
        <motion.path
          d="M 44 52 Q 50 67 56 82"
          fill="none"
          stroke="url(#connectionGradient)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ delay: 1, duration: 1 }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Office markers */}
        {offices.map((office, index) => (
          <g key={office.id}>
            {/* Outer pulse ring */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={4}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.5"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.3,
                ease: "easeOut"
              }}
            />
            {/* Inner glow */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={2.5}
              className="fill-cyan-400/30"
              filter="url(#glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Main dot */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={2}
              className="fill-cyan-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + index * 0.2, type: "spring" }}
            />
            {/* Center highlight */}
            <circle
              cx={office.x - 0.5}
              cy={office.y - 0.5}
              r={0.6}
              className="fill-white/60"
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
};
