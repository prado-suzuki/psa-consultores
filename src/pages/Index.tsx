import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { MetricsBar } from "@/components/MetricsBar";
import { AboutSection } from "@/components/AboutSection";
import { Services } from "@/components/Services";
import { ResultsSection } from "@/components/ResultsSection";
import { TimelineSection } from "@/components/TimelineSection";
import { LocationsSection } from "@/components/LocationsSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      <Header />
      
      <div className="relative">
        <Hero />
        <MetricsBar />
        <AboutSection />
        <Services />
        <ResultsSection />
        <TimelineSection />
        <LocationsSection />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
