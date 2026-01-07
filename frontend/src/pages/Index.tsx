import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import DifferentSection from "@/components/DifferentSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <DifferentSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
