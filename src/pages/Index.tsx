import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { Services } from "@/components/Services";
import { ResultsSection } from "@/components/ResultsSection";
import { TimelineSection } from "@/components/TimelineSection";
import { LocationsSection } from "@/components/LocationsSection";
import { ClientsSection } from "@/components/ClientsSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      {/* Header fixo */}
      <Header />
      
      {/* Conteúdo principal */}
      <div className="relative">
        <Hero />
        <AboutSection />
        <Services />
        <ResultsSection />
        <TimelineSection />
        <LocationsSection />
        <ClientsSection />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
