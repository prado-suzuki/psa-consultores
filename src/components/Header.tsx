import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { id: "inicio", label: "Início", href: "#", external: false },
  { id: "servicos", label: "Serviços", href: "#servicos", external: false },
  { id: "sobre", label: "Sobre", href: "#sobre", external: false },
  { id: "contato", label: "Contato", href: "#contato", external: false },
  { id: "carreira", label: "Carreira", href: "https://www.linkedin.com/company/prado-consultores-associados/jobs/", external: true },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-teal-700/50 backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-4 md:px-6 py-2">
        <div className="flex h-20 items-center justify-between">
          {/* Navigation - Left side */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:text-primary rounded-md"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons - Right side */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/equipe"
              className="px-6 py-3 text-sm font-medium rounded-md
                bg-white/20 backdrop-blur-sm border border-white/30 text-white
                hover:bg-white/30 hover:border-white/40 transition-all duration-200"
            >
              Equipe
            </a>
            <a
              href="/auth"
              className="px-6 py-3 text-sm font-medium rounded-md
                bg-primary border border-primary text-primary-foreground
                hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(101,163,13,0.4)] transition-all duration-200"
            >
              Área do Cliente
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2.5 rounded-md bg-white/20 backdrop-blur-sm border border-white/30 text-white
              hover:bg-white/30 transition-colors duration-200"
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
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="block px-4 py-3 text-sm font-medium text-white rounded-md
                  hover:bg-white/10 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="h-px bg-white/20 my-3" />
            <a
              href="/equipe"
              className="block px-4 py-3 text-sm font-medium text-white rounded-md
                hover:bg-white/10 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Equipe
            </a>
            <a
              href="/auth"
              className="block px-4 py-3 text-sm font-medium rounded-md
                bg-primary text-primary-foreground transition-colors duration-200"
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
