import logo from "@/assets/logo-psa.png";
import { Linkedin, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-50 py-8">
      <div className="container mx-auto px-4 md:px-6">
        {/* Botão Trabalhe Conosco */}
        <div className="flex justify-center mb-8">
          <a 
            href="https://www.linkedin.com/company/prado-consultores-associados/jobs/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
          >
            Trabalhe Conosco
          </a>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSA Consultores" className="h-10 w-auto brightness-0 invert" />
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-400">
            © 2024 PSA Consultores. Todos os direitos reservados.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            <a href="https://www.linkedin.com/company/prado-consultores-associados/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="https://www.instagram.com/psaconsultores.br/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="mailto:contato@psaconsultores.com.br" className="text-gray-400 hover:text-primary transition-colors">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
