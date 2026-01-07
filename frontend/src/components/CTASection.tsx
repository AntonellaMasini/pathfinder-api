import { Button } from "@/components/ui/button";
import { StarDoodle, PathDoodle, SquiggleDoodle, SparklesDoodle } from "./Doodles";

const CTASection = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-secondary/10" />
      <StarDoodle className="absolute top-10 left-16 w-10 h-10 text-primary/50 float" />
      <PathDoodle className="absolute bottom-16 right-12 w-16 h-16 text-accent/40 wobble" />
      <SparklesDoodle className="absolute top-20 right-1/4 w-8 h-8 text-secondary/50 bounce-gentle" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Card container */}
        <div className="bg-card border-2 border-foreground/10 rounded-3xl p-10 md:p-16 shadow-playful">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl mb-8">
            <span className="text-4xl">🌱</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Ready to start reflecting?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            No sign-up required. Just you, your thoughts, and a curious companion to help you explore.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="heroSecondary" size="lg">
              <SparklesDoodle className="w-5 h-5 mr-1" />
              Try the demo
            </Button>
            <Button variant="ghost" size="lg">
              Learn more →
            </Button>
          </div>

          {/* Decorative squiggle */}
          <div className="mt-10">
            <SquiggleDoodle className="w-32 h-8 mx-auto text-muted-foreground/30" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
