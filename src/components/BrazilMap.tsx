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
  { id: "cuiaba", name: "Cuiabá", state: "MT", x: 280, y: 380, isMain: true },
  { id: "barreiras", name: "Barreiras", state: "BA", x: 480, y: 340, isMain: false },
  { id: "curitiba", name: "Curitiba", state: "PR", x: 380, y: 620, isMain: false },
];

// ViewBox configurations for zoom
const zoomConfigs: Record<string, { viewBox: string; scale: number }> = {
  default: { viewBox: "0 0 700 750", scale: 1 },
  cuiaba: { viewBox: "150 280 260 220", scale: 2.5 },
  barreiras: { viewBox: "350 240 260 220", scale: 2.5 },
  curitiba: { viewBox: "250 520 260 220", scale: 2.5 },
};

interface BrazilMapProps {
  selectedOffice?: string | null;
  onOfficeClick?: (officeId: string | null) => void;
}

export const BrazilMap = ({ selectedOffice, onOfficeClick }: BrazilMapProps) => {
  const currentZoom = selectedOffice ? zoomConfigs[selectedOffice] : zoomConfigs.default;

  const getStateClass = (stateId: string) => {
    const officeStates: Record<string, string> = {
      MT: "cuiaba",
      BA: "barreiras",
      PR: "curitiba",
    };
    
    const isOfficeState = Object.keys(officeStates).includes(stateId);
    const isSelected = selectedOffice === officeStates[stateId];
    
    if (isSelected) {
      return "fill-primary/60 stroke-primary transition-colors duration-500";
    }
    if (isOfficeState) {
      return "fill-primary/30 stroke-primary/70 transition-colors duration-500";
    }
    return "fill-muted stroke-muted-foreground/30 transition-colors duration-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative w-full aspect-square max-w-lg mx-auto"
    >
      {/* Reset button */}
      {selectedOffice && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onClick={() => onOfficeClick?.(null)}
          className="absolute top-2 left-2 z-10 px-3 py-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-md shadow-sm text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          ← Ver mapa completo
        </motion.button>
      )}

      <motion.svg
        viewBox={currentZoom.viewBox}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ viewBox: currentZoom.viewBox }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      >
        {/* Background glow */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <ellipse cx="380" cy="400" rx="320" ry="340" fill="url(#mapGlow)" />

        {/* Brazil States - More realistic simplified paths */}
        <g className="states">
          {/* Norte */}
          <path d="M100,200 L180,180 L200,220 L180,280 L120,260 Z" 
                className={getStateClass("AC")} strokeWidth="1.5" />
          <path d="M140,100 L220,80 L240,140 L200,180 L140,160 Z" 
                className={getStateClass("RR")} strokeWidth="1.5" />
          <path d="M120,180 L280,140 L320,200 L300,300 L200,320 L140,280 L100,220 Z" 
                className={getStateClass("AM")} strokeWidth="1.5" />
          <path d="M180,280 L200,320 L240,380 L200,420 L140,400 L160,340 Z" 
                className={getStateClass("RO")} strokeWidth="1.5" />
          <path d="M380,80 L440,60 L460,120 L420,160 L380,140 Z" 
                className={getStateClass("AP")} strokeWidth="1.5" />
          <path d="M300,140 L440,120 L500,180 L480,280 L400,320 L320,280 L320,200 Z" 
                className={getStateClass("PA")} strokeWidth="1.5" />
          <path d="M320,280 L400,280 L400,380 L360,420 L300,380 Z" 
                className={getStateClass("TO")} strokeWidth="1.5" />

          {/* Nordeste */}
          <path d="M480,200 L540,180 L560,240 L540,300 L500,280 L480,240 Z" 
                className={getStateClass("MA")} strokeWidth="1.5" />
          <path d="M520,260 L560,240 L580,300 L560,360 L520,340 L500,300 Z" 
                className={getStateClass("PI")} strokeWidth="1.5" />
          <path d="M560,220 L620,200 L640,260 L600,300 L560,280 Z" 
                className={getStateClass("CE")} strokeWidth="1.5" />
          <path d="M620,220 L660,240 L650,280 L610,270 Z" 
                className={getStateClass("RN")} strokeWidth="1.5" />
          <path d="M610,270 L660,280 L650,310 L600,300 Z" 
                className={getStateClass("PB")} strokeWidth="1.5" />
          <path d="M560,300 L650,310 L640,350 L540,340 Z" 
                className={getStateClass("PE")} strokeWidth="1.5" />
          <path d="M600,350 L650,350 L640,380 L590,380 Z" 
                className={getStateClass("AL")} strokeWidth="1.5" />
          <path d="M580,380 L630,380 L620,410 L570,410 Z" 
                className={getStateClass("SE")} strokeWidth="1.5" />
          
          {/* Bahia - HIGHLIGHTED */}
          <path d="M480,320 L570,310 L600,360 L580,440 L520,500 L440,480 L420,400 L460,360 Z" 
                className={getStateClass("BA")} strokeWidth="2" />

          {/* Centro-Oeste */}
          {/* Mato Grosso - HIGHLIGHTED */}
          <path d="M200,320 L300,300 L360,340 L380,420 L340,500 L260,520 L200,460 L180,380 Z" 
                className={getStateClass("MT")} strokeWidth="2" />
          
          <path d="M260,520 L340,500 L380,560 L360,620 L300,640 L260,600 Z" 
                className={getStateClass("MS")} strokeWidth="1.5" />
          <path d="M340,420 L420,400 L460,460 L440,520 L380,540 L340,500 Z" 
                className={getStateClass("GO")} strokeWidth="1.5" />
          <circle cx="420" cy="480" r="12" className={getStateClass("DF")} strokeWidth="1.5" />

          {/* Sudeste */}
          <path d="M420,480 L520,460 L560,520 L540,580 L460,600 L420,560 Z" 
                className={getStateClass("MG")} strokeWidth="1.5" />
          <path d="M560,500 L600,500 L590,560 L550,560 Z" 
                className={getStateClass("ES")} strokeWidth="1.5" />
          <path d="M520,560 L580,560 L570,600 L510,600 Z" 
                className={getStateClass("RJ")} strokeWidth="1.5" />
          <path d="M380,560 L480,560 L500,620 L460,660 L380,640 L340,600 Z" 
                className={getStateClass("SP")} strokeWidth="1.5" />

          {/* Sul */}
          {/* Paraná - HIGHLIGHTED */}
          <path d="M340,620 L420,620 L460,680 L400,720 L320,700 L300,660 Z" 
                className={getStateClass("PR")} strokeWidth="2" />
          
          <path d="M340,700 L420,700 L440,740 L360,760 L320,740 Z" 
                className={getStateClass("SC")} strokeWidth="1.5" />
          <path d="M300,740 L360,760 L380,820 L320,860 L260,840 L260,780 Z" 
                className={getStateClass("RS")} strokeWidth="1.5" />
        </g>

        {/* State labels when zoomed */}
        {selectedOffice && offices.find(o => o.id === selectedOffice) && (
          <motion.text
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            x={offices.find(o => o.id === selectedOffice)!.x}
            y={offices.find(o => o.id === selectedOffice)!.y - 40}
            textAnchor="middle"
            className="fill-foreground text-sm font-semibold"
            style={{ fontSize: "14px" }}
          >
            {offices.find(o => o.id === selectedOffice)!.state}
          </motion.text>
        )}

        {/* Office markers */}
        {offices.map((office, index) => {
          const isSelected = selectedOffice === office.id;
          const markerSize = isSelected ? 1.5 : 1;
          
          return (
            <g 
              key={office.id} 
              className="cursor-pointer"
              onClick={() => onOfficeClick?.(isSelected ? null : office.id)}
            >
              {/* Pulse ring */}
              <motion.circle
                cx={office.x}
                cy={office.y}
                r={(office.isMain ? 18 : 14) * markerSize}
                className="fill-none stroke-destructive/40"
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
                r={(office.isMain ? 10 : 7) * markerSize}
                className="fill-destructive"
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
                r={(office.isMain ? 4 : 3) * markerSize}
                className="fill-background"
              />
              
              {/* City label */}
              <motion.text
                x={office.x}
                y={office.y + (office.isMain ? 24 : 20) * markerSize}
                textAnchor="middle"
                className="fill-foreground font-medium pointer-events-none"
                style={{ fontSize: isSelected ? "12px" : "9px" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                {office.name}
              </motion.text>
            </g>
          );
        })}
      </motion.svg>
    </motion.div>
  );
};
