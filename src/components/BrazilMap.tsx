import { motion } from "framer-motion";
import { useMemo } from "react";

interface Office {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  isMain: boolean;
}

const offices: Office[] = [
  { id: "cuiaba", name: "Cuiabá", state: "MT", lat: -15.6, lng: -56.1, isMain: true },
  { id: "barreiras", name: "Barreiras", state: "BA", lat: -12.15, lng: -45.0, isMain: false },
  { id: "curitiba", name: "Curitiba", state: "PR", lat: -25.43, lng: -49.27, isMain: false },
];

// Brazil bounding box
const BRAZIL_BOUNDS = {
  minLat: -33.75,
  maxLat: 5.27,
  minLng: -73.99,
  maxLng: -32.39,
};

// State bounding boxes for highlighting
const STATE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  MT: { minLat: -18.04, maxLat: -7.35, minLng: -61.63, maxLng: -50.22 },
  BA: { minLat: -18.35, maxLat: -8.53, minLng: -46.62, maxLng: -37.34 },
  PR: { minLat: -26.72, maxLat: -22.52, minLng: -54.62, maxLng: -48.02 },
};

// Convert lat/lng to SVG coordinates
const latLngToSvg = (lat: number, lng: number, width: number, height: number) => {
  const x = ((lng - BRAZIL_BOUNDS.minLng) / (BRAZIL_BOUNDS.maxLng - BRAZIL_BOUNDS.minLng)) * width;
  const y = ((BRAZIL_BOUNDS.maxLat - lat) / (BRAZIL_BOUNDS.maxLat - BRAZIL_BOUNDS.minLat)) * height;
  return { x, y };
};

// Check if point is in a state
const isInState = (lat: number, lng: number, state: string): boolean => {
  const bounds = STATE_BOUNDS[state];
  if (!bounds) return false;
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
};

// Check if point is in any operational state
const isOperational = (lat: number, lng: number): boolean => {
  return Object.keys(STATE_BOUNDS).some(state => isInState(lat, lng, state));
};

// Brazil outline coordinates (simplified polygon)
const BRAZIL_OUTLINE: [number, number][] = [
  [-4.44, -32.39], [-2.5, -34.9], [-1.03, -36.75], [0.7, -40.0], [1.24, -44.99],
  [2.2, -49.0], [4.38, -51.0], [5.27, -54.0], [4.5, -55.5], [3.87, -57.5],
  [2.2, -60.0], [1.24, -65.0], [0.0, -66.5], [-2.0, -68.0], [-4.0, -69.5],
  [-5.0, -70.5], [-7.0, -72.0], [-9.0, -73.0], [-10.0, -73.99], [-12.0, -73.5],
  [-13.5, -72.0], [-15.0, -69.5], [-17.0, -67.0], [-18.0, -64.0], [-19.0, -60.0],
  [-20.0, -57.5], [-22.0, -55.0], [-24.0, -54.0], [-26.0, -53.5], [-28.0, -52.0],
  [-29.5, -50.5], [-30.5, -51.0], [-32.0, -52.5], [-33.5, -53.5], [-33.75, -53.5],
  [-32.0, -52.0], [-30.0, -50.0], [-29.0, -49.0], [-27.5, -48.5], [-26.0, -48.5],
  [-24.5, -47.0], [-23.0, -44.5], [-22.0, -41.0], [-21.0, -40.0], [-19.0, -39.5],
  [-18.0, -39.0], [-15.5, -39.0], [-13.0, -38.5], [-10.0, -36.5], [-7.5, -35.0],
  [-5.5, -35.0], [-4.44, -32.39]
];

// Check if a point is inside Brazil (simplified check using bounding boxes for states)
const isInsideBrazil = (lat: number, lng: number): boolean => {
  // Simple polygon point-in-polygon test (ray casting)
  let inside = false;
  const n = BRAZIL_OUTLINE.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = BRAZIL_OUTLINE[i];
    const [yj, xj] = BRAZIL_OUTLINE[j];
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

export const BrazilMap = () => {
  const SVG_WIDTH = 200;
  const SVG_HEIGHT = 200;
  const DOT_SPACING = 4;
  const DOT_RADIUS = 1.2;

  const dots = useMemo(() => {
    const points: { x: number; y: number; isOperational: boolean }[] = [];
    
    for (let row = 0; row < SVG_HEIGHT / DOT_SPACING; row++) {
      for (let col = 0; col < SVG_WIDTH / DOT_SPACING; col++) {
        const x = col * DOT_SPACING + DOT_SPACING / 2;
        const y = row * DOT_SPACING + DOT_SPACING / 2;
        
        // Convert back to lat/lng
        const lng = BRAZIL_BOUNDS.minLng + (x / SVG_WIDTH) * (BRAZIL_BOUNDS.maxLng - BRAZIL_BOUNDS.minLng);
        const lat = BRAZIL_BOUNDS.maxLat - (y / SVG_HEIGHT) * (BRAZIL_BOUNDS.maxLat - BRAZIL_BOUNDS.minLat);
        
        if (isInsideBrazil(lat, lng)) {
          points.push({
            x,
            y,
            isOperational: isOperational(lat, lng)
          });
        }
      }
    }
    
    return points;
  }, []);

  const officePositions = useMemo(() => {
    return offices.map(office => ({
      ...office,
      ...latLngToSvg(office.lat, office.lng, SVG_WIDTH, SVG_HEIGHT)
    }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative w-full aspect-square max-w-md mx-auto"
    >
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Brazil dots */}
        {dots.map((dot, i) => (
          <motion.circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={DOT_RADIUS}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.0005 }}
            className={dot.isOperational ? "fill-emerald-400" : "fill-gray-300"}
          />
        ))}

        {/* Connection lines between offices */}
        {officePositions.slice(0, -1).map((office, i) => {
          const nextOffice = officePositions[i + 1];
          const midX = (office.x + nextOffice.x) / 2;
          const midY = Math.min(office.y, nextOffice.y) - 15;
          
          return (
            <motion.path
              key={`line-${i}`}
              d={`M ${office.x} ${office.y} Q ${midX} ${midY} ${nextOffice.x} ${nextOffice.y}`}
              fill="none"
              stroke="url(#connectionGradient)"
              strokeWidth="1"
              strokeDasharray="4 2"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.3 }}
            />
          );
        })}

        {/* Office markers */}
        {officePositions.map((office, i) => (
          <g key={office.id}>
            {/* Pulse ring */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={6}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.5, 0.8], 
                opacity: [0.6, 0, 0.6] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                delay: i * 0.3
              }}
            />
            
            {/* Main marker */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={4}
              className="fill-cyan-500"
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.8 + i * 0.15 }}
            />
            
            {/* Inner dot */}
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={2}
              className="fill-white"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 1 + i * 0.15 }}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
};
