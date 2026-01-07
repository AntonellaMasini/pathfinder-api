import { HeartDoodle, StarDoodle, QuestionDoodle } from "./Doodles";

const differences = [
  {
    icon: <span className="text-3xl">🚫</span>,
    title: "No job matching",
    description: "We don't pretend to know what job is 'right' for you. That's your call to make.",
    color: "border-primary/40 bg-primary/5",
  },
  {
    icon: <span className="text-3xl">🏷️</span>,
    title: "No personality labels",
    description: "You're not a type or a category. You're a person with a unique story.",
    color: "border-secondary/40 bg-secondary/5",
  },
  {
    icon: <HeartDoodle className="w-8 h-8 text-accent" />,
    title: "Focus on reflection",
    description: "Real clarity comes from within, not from an algorithm telling you what to do.",
    color: "border-accent/40 bg-accent/5",
  },
  {
    icon: <span className="text-3xl">🧪</span>,
    title: "Agency & experimentation",
    description: "Test small hypotheses. Learn by doing. Stay curious about your own path.",
    color: "border-mint/40 bg-mint/5",
  },
];

const DifferentSection = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-secondary/15 rounded-blob blur-3xl opacity-50" />
      <QuestionDoodle className="absolute top-16 right-20 w-12 h-12 text-accent/40 float" />
      <StarDoodle className="absolute bottom-32 right-10 w-10 h-10 text-primary/40 wobble" />

      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            What makes it different
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Built on a different philosophy about career guidance
          </p>
        </div>

        {/* Differences grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {differences.map((item, index) => (
            <div
              key={item.title}
              className={`relative p-6 rounded-2xl border-2 ${item.color} backdrop-blur-sm hover:translate-y-[-2px] transition-all duration-300`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-card rounded-xl border border-foreground/10 flex items-center justify-center shadow-playful">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-display font-semibold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative divider */}
        <div className="mt-16 flex justify-center">
          <svg width="120" height="40" viewBox="0 0 120 40" className="text-muted-foreground/30">
            <circle cx="30" cy="20" r="4" fill="currentColor" />
            <circle cx="60" cy="20" r="6" fill="currentColor" />
            <circle cx="90" cy="20" r="4" fill="currentColor" />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default DifferentSection;
