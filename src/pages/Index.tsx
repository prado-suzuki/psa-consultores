import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { MetricsBar } from "@/components/MetricsBar";
import { AboutSection } from "@/components/AboutSection";
import { OfficesSection } from "@/components/OfficesSection";
import { Services } from "@/components/Services";
import { ResultsSection } from "@/components/ResultsSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-gray-50">
      <Header />
      
      <div className="relative bg-gray-50">
        <Hero />
        <MetricsBar />
        <AboutSection />
        <OfficesSection />
        <Services />
        <ResultsSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
