import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Header />
      <main className="relative">
        <Hero />
        <Services />
        <WhyChooseUs />
        <CTA />
        <Footer />
      </main>
    </>
  );
};

export default Index;
