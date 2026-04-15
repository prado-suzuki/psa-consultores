import logo from "@/assets/logo-psa.png";
import { Linkedin, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-50 py-4">
      <div className="container mx-auto px-4 md:px-6">
        {/* Link Trabalhe Conosco */}
        <div className="flex justify-center mb-2">
          <a
            href="https://www.linkedin.com/company/prado-consultores-associados/jobs/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Trabalhe Conosco
          </a>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSA Consultores" className="h-8 w-auto brightness-0 invert" />
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-400">
            © 2026 PSA Consultores. Todos os direitos reservados.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            <a
              href="https://www.linkedin.com/company/prado-consultores-associados/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PSA Consultores no LinkedIn"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              <Linkedin className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href="https://www.instagram.com/psaconsultores.br/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PSA Consultores no Instagram"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              <Instagram className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href="mailto:contato@psaconsultores.com.br"
              aria-label="Enviar email para contato@psaconsultores.com.br"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
