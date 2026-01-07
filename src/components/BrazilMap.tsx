import { motion } from "framer-motion";

const offices = [
  { id: "cuiaba", x: 340, y: 420, isMain: true },
  { id: "barreiras", x: 480, y: 360, isMain: false },
  { id: "curitiba", x: 410, y: 580, isMain: false },
];

const clientDots = [
  { x: 320, y: 380 }, { x: 360, y: 400 }, { x: 300, y: 440 },
  { x: 380, y: 450 }, { x: 420, y: 380 }, { x: 440, y: 420 },
  { x: 500, y: 340 }, { x: 460, y: 380 }, { x: 520, y: 380 },
  { x: 380, y: 520 }, { x: 420, y: 540 }, { x: 440, y: 560 },
  { x: 360, y: 560 }, { x: 400, y: 600 }, { x: 380, y: 480 },
];

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
        viewBox="0 0 700 750"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background glow */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <ellipse cx="400" cy="420" rx="280" ry="300" fill="url(#mapGlow)" />

        {/* Brazil States - Simplified paths */}
        <g className="states">
          {/* Amazonas - AM */}
          <path d="M120,180 L280,150 L320,200 L300,280 L220,320 L140,280 L100,220 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Pará - PA */}
          <path d="M280,150 L420,140 L460,200 L440,280 L380,320 L300,280 L320,200 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Maranhão - MA */}
          <path d="M420,200 L500,180 L540,240 L520,300 L460,320 L440,280 L460,200 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Piauí - PI */}
          <path d="M500,240 L540,240 L560,300 L540,360 L500,340 L480,300 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Ceará - CE */}
          <path d="M540,200 L600,200 L620,260 L580,300 L540,280 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Rio Grande do Norte - RN */}
          <path d="M600,200 L650,220 L640,260 L600,260 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Paraíba - PB */}
          <path d="M600,260 L660,270 L650,300 L590,300 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Pernambuco - PE */}
          <path d="M540,300 L650,300 L640,340 L520,340 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Alagoas - AL */}
          <path d="M600,340 L650,340 L640,370 L590,370 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Sergipe - SE */}
          <path d="M590,370 L630,370 L620,400 L580,400 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Bahia - BA - HIGHLIGHTED */}
          <path d="M460,320 L580,300 L600,340 L580,420 L520,480 L440,460 L420,380 Z" 
                className="fill-primary/40 stroke-primary/60" strokeWidth="2" />
          
          {/* Tocantins - TO */}
          <path d="M380,280 L460,280 L460,380 L420,420 L360,380 L360,320 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Goiás - GO */}
          <path d="M340,380 L420,380 L440,460 L400,500 L340,480 L320,420 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Mato Grosso - MT - HIGHLIGHTED */}
          <path d="M220,320 L360,320 L360,420 L340,480 L280,500 L200,460 L180,380 Z" 
                className="fill-primary/40 stroke-primary/60" strokeWidth="2" />
          
          {/* Mato Grosso do Sul - MS */}
          <path d="M280,500 L340,480 L380,520 L360,580 L300,600 L260,560 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Minas Gerais - MG */}
          <path d="M400,460 L520,440 L560,500 L520,560 L440,580 L400,540 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Espírito Santo - ES */}
          <path d="M560,480 L600,480 L590,540 L550,540 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Rio de Janeiro - RJ */}
          <path d="M520,540 L580,540 L570,580 L510,580 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* São Paulo - SP */}
          <path d="M380,540 L480,540 L500,600 L440,640 L360,620 L340,580 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Paraná - PR - HIGHLIGHTED */}
          <path d="M340,580 L420,600 L440,660 L380,700 L300,680 L300,620 Z" 
                className="fill-primary/40 stroke-primary/60" strokeWidth="2" />
          
          {/* Santa Catarina - SC */}
          <path d="M340,680 L420,680 L420,720 L340,720 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Rio Grande do Sul - RS */}
          <path d="M300,700 L380,700 L400,750 L320,780 L260,760 L280,720 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Rondônia - RO */}
          <path d="M140,340 L220,340 L240,400 L200,440 L140,420 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Acre - AC */}
          <path d="M60,320 L140,300 L160,360 L120,400 L60,380 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Roraima - RR */}
          <path d="M180,80 L260,60 L280,120 L240,160 L180,140 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Amapá - AP */}
          <path d="M380,60 L440,40 L460,100 L420,140 L380,120 Z" 
                className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
          
          {/* Distrito Federal - DF */}
          <circle cx="420" cy="440" r="10" className="fill-gray-500/30 stroke-gray-600/50" strokeWidth="1" />
        </g>

        {/* Client dots */}
        {clientDots.map((dot, index) => (
          <motion.circle
            key={`client-${index}`}
            cx={dot.x}
            cy={dot.y}
            r={4}
            className="fill-primary/60"
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
          />
        ))}

        {/* Office markers */}
        {offices.map((office, index) => (
          <g key={office.id}>
            {/* Pulse ring */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={office.isMain ? 20 : 14}
              className="fill-none stroke-red-500/40"
              strokeWidth="2"
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ 
                scale: [0.8, 1.4, 0.8], 
                opacity: [0.8, 0, 0.8] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: index * 0.3 
              }}
            />
            {/* Main dot */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={office.isMain ? 10 : 7}
              className="fill-red-500"
              filter="url(#glow)"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.2, type: "spring" }}
            />
            {/* Inner dot */}
            <circle
              cx={office.x}
              cy={office.y}
              r={office.isMain ? 4 : 3}
              className="fill-white"
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
};
