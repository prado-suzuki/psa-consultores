import { useState } from "react";
import { Menu, X, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-psa.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { id: "inicio", label: "Início", href: "/", external: false, isRoute: true },
  { id: "sobre", label: "Sobre", href: "/#sobre", external: false, isRoute: false },
  { id: "missao", label: "Missão", href: "/missao", external: false, isRoute: true },
  { id: "servicos", label: "Serviços", href: "/#servicos", external: false, isRoute: false },
  { id: "novidades", label: "Novidades", href: "/novidades", external: false, isRoute: true },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    const scroll = () => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (location.pathname === "/") {
      scroll();
    } else {
      navigate("/");
      setTimeout(scroll, 100);
    }
  };

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
                <button
                  key={item.id}
                  onClick={() => {
                    const sectionId = item.href.replace("/#", "");
                    scrollToSection(sectionId);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-50/80 transition-colors duration-200 hover:text-gray-50"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          {/* CTA Buttons - Right */}
          <div className="hidden md:flex items-center gap-3">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="/equipe"
                    aria-label="Acessar área da equipe"
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
                  >
                    <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Equipe</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Link
              to="/ajuda"
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
            >
              Área do Cliente
            </Link>
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
                <button
                  key={item.id}
                  onClick={() => {
                    const sectionId = item.href.replace("/#", "");
                    scrollToSection(sectionId);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-50/80 hover:text-gray-50 transition-colors duration-200"
                >
                  {item.label}
                </button>
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
