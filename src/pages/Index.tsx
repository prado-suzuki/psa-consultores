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
import { SectionTransition } from "@/components/SectionTransition";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      <Header />
      
      <div className="relative">
        <Hero />
        <MetricsBar />
        <AboutSection />
        <SectionTransition from="light" to="dark" />
        <Services />
        <SectionTransition from="dark" to="light" />
        <ResultsSection />
        <SectionTransition from="light" to="dark" />
        <TimelineSection />
        <SectionTransition from="dark" to="light" />
        <LocationsSection />
        <SectionTransition from="light" to="dark" />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
