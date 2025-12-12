import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { id: "inicio", label: "Início", href: "#", external: false },
  { id: "servicos", label: "Serviços", href: "#servicos", external: false },
  { id: "sobre", label: "Sobre", href: "#sobre", external: false },
  { id: "contato", label: "Contato", href: "#contato", external: false },
  { id: "carreira", label: "Carreira", href: "https://www.linkedin.com/company/psaconsultores/jobs/", external: true },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Navigation - Left side */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-primary rounded-md"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons - Right side */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/equipe"
              className="px-5 py-2.5 text-sm font-medium rounded-full
                bg-gray-100 border border-gray-200 text-gray-700
                hover:bg-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              Equipe
            </a>
            <a
              href="/auth"
              className="px-5 py-2.5 text-sm font-medium rounded-full
                bg-primary border border-primary text-primary-foreground
                hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(101,163,13,0.4)] transition-all duration-200"
            >
              Área do Cliente
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700
              hover:bg-gray-200 transition-colors duration-200"
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
                className="block px-4 py-3 text-sm font-medium text-gray-700 rounded-xl
                  hover:bg-gray-100 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="h-px bg-gray-200 my-3" />
            <a
              href="/equipe"
              className="block px-4 py-3 text-sm font-medium text-gray-700 rounded-xl
                hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Equipe
            </a>
            <a
              href="/auth"
              className="block px-4 py-3 text-sm font-medium rounded-xl
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
