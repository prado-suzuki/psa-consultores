import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-psa.png";

const navItems = [
  { id: "inicio", label: "Início", href: "#" },
  { id: "servicos", label: "Serviços", href: "#servicos" },
  { id: "sobre", label: "Sobre", href: "#sobre" },
  { id: "contato", label: "Contato", href: "#contato" },
];

export const Header = () => {
  const [activeItem, setActiveItem] = useState("inicio");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-6 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex items-center justify-between bg-gray-900/80 backdrop-blur-lg rounded-full px-6 py-3 border border-gray-800/50 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="PSA Consultores" className="h-8 w-auto" />
          </div>

          {/* Navigation with Tubelight Effect */}
          <nav className="hidden md:flex items-center relative bg-gray-800/50 rounded-full p-1.5">
            {navItems.map((item, index) => {
              const isActive = activeItem === item.id;
              const isHovered = hoveredItem === item.id;
              const showGlow = isActive || isHovered;

              return (
                <div key={item.id} className="relative">
                  {showGlow && (
                    <motion.div
                      layoutId="tubelight"
                      className="absolute inset-0 bg-primary/20 rounded-full"
                      style={{
                        boxShadow: `0 0 20px hsl(var(--primary) / 0.5), 
                                    0 0 40px hsl(var(--primary) / 0.3),
                                    inset 0 0 10px hsl(var(--primary) / 0.2)`,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <a
                    href={item.href}
                    className="relative z-10 px-6 py-2.5 text-sm font-medium transition-colors rounded-full block"
                    style={{
                      color: showGlow ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => setActiveItem(item.id)}
                  >
                    {item.label}
                  </a>
                </div>
              );
            })}
          </nav>

          {/* CTA Button */}
          <Button 
            className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground"
            style={{
              boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
            }}
          >
            Fale Conosco
          </Button>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-muted-foreground hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  );
};
