import logo from "@/assets/logo-psa.png";
import { Linkedin, Instagram, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSA Consultores" className="h-10 w-auto brightness-0 invert" />
          </div>

          {/* Copyright */}
          <p className="text-sm text-white/70">
            © 2024 PSA Consultores. Todos os direitos reservados.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            <a href="#" className="text-white hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="#" className="text-white hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-white hover:text-primary transition-colors">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
