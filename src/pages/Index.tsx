import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      {/* Header fixo */}
      <Header />
      
      {/* Conteúdo principal - Hero começa do topo para aparecer atrás do header */}
      <div className="relative">
        <Hero />
        <Services />
        <WhyChooseUs />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
