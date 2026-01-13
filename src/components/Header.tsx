import { useState } from "react";
import { Menu, X, Users, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo-psa.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { id: "inicio", label: "Início", href: "/", external: false, isRoute: true },
  { id: "servicos", label: "Serviços", href: "/#servicos", external: false, isRoute: false },
  { id: "sobre", label: "Sobre", href: "/#sobre", external: false, isRoute: false },
  { id: "novidades", label: "Novidades", href: "/novidades", external: false, isRoute: true },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Left */}
          <a href="#" className="flex items-center">
            <img 
              src={logo} 
              alt="PSA Consultores" 
              className="h-8 w-auto brightness-0 invert" 
            />
          </a>

          {/* Navigation - Center */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) =>
              item.isRoute ? (
                <Link
                  key={item.id}
                  to={item.href}
                  className="px-4 py-2 text-sm font-medium text-gray-50/80 transition-colors duration-200 hover:text-gray-50"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="px-4 py-2 text-sm font-medium text-gray-50/80 transition-colors duration-200 hover:text-gray-50"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          {/* CTA Buttons - Right */}
          <div className="hidden md:flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="/equipe"
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
                  >
                    <Users className="h-5 w-5 text-primary" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Equipe</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="/auth"
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
                  >
                    <User className="h-5 w-5 text-primary" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Área do Cliente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="py-4 space-y-1">
            {navItems.map((item) =>
              item.isRoute ? (
                <Link
                  key={item.id}
                  to={item.href}
                  className="block px-4 py-3 text-sm font-medium text-gray-50/80 hover:text-gray-50 transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="block px-4 py-3 text-sm font-medium text-gray-50/80 hover:text-gray-50 transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              )
            )}
            <div className="h-px bg-gray-50/10 my-3" />
            <a
              href="/equipe"
              className="block px-4 py-3 text-sm font-medium text-gray-50/80 hover:text-gray-50 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Equipe
            </a>
            <a
              href="/auth"
              className="block px-4 py-3 text-sm font-medium text-primary transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Área do Cliente
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};
