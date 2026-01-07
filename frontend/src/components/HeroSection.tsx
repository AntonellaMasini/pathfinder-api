import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarDoodle, PathDoodle, QuestionDoodle, SparklesDoodle } from "./Doodles";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Floating decorative elements */}
      <StarDoodle className="absolute top-20 left-10 w-12 h-12 text-primary float opacity-70 md:w-16 md:h-16" />
      <StarDoodle className="absolute top-32 right-16 w-8 h-8 text-secondary wobble opacity-60 md:w-12 md:h-12" />
      <QuestionDoodle className="absolute bottom-32 left-20 w-10 h-10 text-accent float opacity-50 md:w-14 md:h-14" />
      <PathDoodle className="absolute top-40 right-8 w-16 h-16 text-mint opacity-40 wobble md:w-24 md:h-24" />
      <SparklesDoodle className="absolute bottom-40 right-24 w-10 h-10 text-primary bounce-gentle opacity-60 md:w-14 md:h-14" />
      <StarDoodle className="absolute bottom-20 right-1/3 w-8 h-8 text-secondary float opacity-50" />

      {/* Blob shapes */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-blob blur-3xl opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-blob blur-3xl opacity-40" />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-accent/20 rounded-blob blur-3xl opacity-30" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-card border-2 border-foreground/10 rounded-full px-4 py-2 mb-8 shadow-playful animate-fade-in-up">
          <SparklesDoodle className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            A new way to explore your career
          </span>
        </div>

        {/* Title */}
        <h1 
          className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 leading-tight"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="gradient-text">Pathfinder</span>
        </h1>

        {/* Subtitle */}
        <p 
          className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up font-body"
          style={{ animationDelay: "0.2s" }}
        >
          A reflective AI tool that helps people make sense of their experiences and explore possible career paths — 
          <span className="text-foreground font-medium"> without prescribing a single answer.</span>
        </p>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Button variant="hero" size="lg" className="min-w-[220px]" asChild>
            <Link to="/write">
              <PathDoodle className="w-5 h-5 mr-1" />
              Write about my path
            </Link>
          </Button>
          <Button variant="hero" size="lg" className="min-w-[220px]" asChild>
            <Link to="/talk">
              <SparklesDoodle className="w-5 h-5 mr-1" />
              Talk about my path
            </Link>
          </Button>
        </div>

        {/* Decorative underline */}
        <div className="mt-12 flex justify-center">
          <svg width="200" height="20" viewBox="0 0 200 20" className="text-secondary opacity-60">
            <path
              d="M5 10 Q50 5, 100 10 T195 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
