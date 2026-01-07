import { ArrowDoodle, CircleDoodle, StarDoodle } from "./Doodles";

const steps = [
  {
    number: "1",
    title: "Share your story",
    description: "Talk or write about your experiences, interests, and what matters to you. No resume needed.",
    color: "bg-primary",
    icon: "💭",
  },
  {
    number: "2",
    title: "See patterns emerge",
    description: "Pathfinder reflects themes and threads back to you — patterns you might not have noticed.",
    color: "bg-secondary",
    icon: "✨",
  },
  {
    number: "3",
    title: "Explore possibilities",
    description: "Discover 'path hypotheses' and small experiments you can try, not definitive answers.",
    color: "bg-accent",
    icon: "🗺️",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-10 right-10 w-48 h-48 bg-mint/20 rounded-blob blur-3xl opacity-40" />
      <StarDoodle className="absolute top-20 left-8 w-10 h-10 text-primary/40 wobble" />

      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Three simple steps to start your reflection journey
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting arrows (desktop only) */}
          <ArrowDoodle className="hidden md:block absolute top-1/3 left-[30%] w-24 h-10 text-foreground/30" />
          <ArrowDoodle className="hidden md:block absolute top-1/3 left-[63%] w-24 h-10 text-foreground/30" />

          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative group"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="bg-card border-2 border-foreground/10 rounded-2xl p-8 h-full shadow-playful hover:shadow-playful-hover hover:translate-y-[-4px] transition-all duration-300">
                {/* Step number with doodle circle */}
                <div className="relative inline-block mb-6">
                  <CircleDoodle className="absolute -inset-2 w-16 h-16 text-foreground/20" />
                  <div className={`relative w-12 h-12 ${step.color} rounded-full flex items-center justify-center text-xl font-display font-bold border-2 border-foreground/20`}>
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="text-4xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-xl font-display font-semibold mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Decorative star on hover */}
              <StarDoodle className="absolute -top-3 -right-3 w-8 h-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 wobble" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
