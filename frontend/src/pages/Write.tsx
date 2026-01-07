import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarDoodle, SparklesDoodle, PathDoodle, QuestionDoodle } from "@/components/Doodles";

const Write = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const hypotheses = result?.result?.path_hypotheses || [];
  const totalCards = hypotheses.length;
  const hasMultipleCards = totalCards > 1;

  const goToNext = () => {
    if (!hasMultipleCards || isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % totalCards);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrev = () => {
    if (!hasMultipleCards || isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
  };

  const handleReflect = async () => {
    if (text.trim().length < 10) {
      setError("Write a little more so Pathfinder has something to reflect on.");
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
      const res = await fetch("/reflect_guarded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
  
      if (!res.ok) {
        throw new Error("Something went wrong.");
      }
  
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError("Couldn’t reflect right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Floating decorative elements */}
      <StarDoodle className="absolute top-16 left-8 w-10 h-10 text-primary float opacity-60 md:w-14 md:h-14" />
      <SparklesDoodle className="absolute top-24 right-12 w-8 h-8 text-secondary wobble opacity-50 md:w-10 md:h-10" />
      <QuestionDoodle className="absolute bottom-24 left-16 w-8 h-8 text-accent float opacity-40 md:w-12 md:h-12" />
      <PathDoodle className="absolute bottom-32 right-8 w-12 h-12 text-mint opacity-30 wobble md:w-16 md:h-16" />
      <StarDoodle className="absolute top-1/2 left-4 w-6 h-6 text-secondary bounce-gentle opacity-40" />

      {/* Blob shapes */}
      <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-primary/15 rounded-blob blur-3xl opacity-50" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-secondary/15 rounded-blob blur-3xl opacity-40" />
      <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-accent/15 rounded-blob blur-3xl opacity-30" />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-card border-2 border-foreground/10 rounded-full px-4 py-2 mb-6 shadow-playful">
            <PathDoodle className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Write Mode</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Write about your path</span>
          </h1>
          
          {/* Supportive microcopy */}
          <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed font-body">
            Write freely about your experiences—what energizes you, what drains you, what you want more of.{" "}
            <span className="text-foreground font-medium">There's no right format.</span>
          </p>
        </div>

        {/* Text area card */}
        <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mb-6 max-w-2xl mx-auto">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start writing here... What's been on your mind lately? What kind of work makes you lose track of time? What moments in your career have felt most meaningful?"
            className="w-full h-64 md:h-80 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-base md:text-lg leading-relaxed font-body resize-none focus:outline-none"
          />
        </div>

        {/* Reflection result (appears only after API call) */}
        {result && (
          <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mt-6 mb-6 max-w-2xl mx-auto">
            <h2 className="text-lg font-display font-semibold mb-3">
              Reflection
            </h2>
            <p className="text-base leading-relaxed font-body">
              {result.result.reflection}
            </p>
          </div>
        )}

        {/* insights result (appears only after API call) */}
        {result?.result?.insights && (
          <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mt-6 mb-6 max-w-2xl mx-auto">
            <h2 className="text-lg font-display font-semibold mb-4">
              Insights
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Energizers", result.result.insights.energizers],
                ["Drainers", result.result.insights.drainers],
                ["Values", result.result.insights.values],
                ["Skills", result.result.insights.skills],
                ["Work styles", result.result.insights.work_styles],
                ["Open questions", result.result.insights.open_questions],
              ].map(([label, items]) => (
                <div
                  key={label as string}
                  className="rounded-xl border border-foreground/10 p-4"
                >
                  <div className="font-medium mb-2">{label as string}</div>
                  {items && items.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {items.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* path hypotheses result (appears only after API call) */}
        {totalCards > 0 && (() => {
          const p = hypotheses[activeIndex];
          return (
            <div className="mt-10 mb-8">
              {/* Header with title and indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-center">
                  Path hypotheses
                </h2>
                {hasMultipleCards && (
                  <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full font-medium">
                    {activeIndex + 1} / {totalCards}
                  </span>
                )}
              </div>

              {/* 3-column layout: left arrow | card | right arrow */}
              <div className="flex items-stretch gap-3 md:gap-6 max-w-6xl mx-auto">
                {/* Left arrow column */}
                <div className="flex items-center justify-center w-10 md:w-12 lg:w-14 flex-shrink-0">
                  {hasMultipleCards && (
                    <button
                      onClick={goToPrev}
                      className="w-10 h-10 md:w-11 md:h-11 bg-card border-2 border-foreground/10 rounded-full shadow-playful hover:shadow-playful-hover hover:scale-110 hover:bg-card/80 transition-all flex items-center justify-center"
                      aria-label="Previous card"
                    >
                      <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Card container (middle column) */}
                <div 
                  className="flex-1 min-w-0 flex justify-center"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    key={activeIndex}
                    className={`w-full max-w-4xl bg-card border-2 border-foreground/15 rounded-3xl p-6 md:p-8 shadow-playful transition-all duration-300 ${
                      isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
                    }`}
                  >
                    {/* Card title */}
                    <div className="text-xl md:text-2xl font-display font-bold mb-4">
                      {p.name}
                    </div>

                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
                      {p.why_it_fits}
                    </p>

                    {/* Two-column grid for sections on larger screens */}
                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                      {/* Risks */}
                      {p.risks?.length > 0 && (
                        <div className="rounded-2xl border border-foreground/10 p-4 md:p-5">
                          <div className="font-semibold text-base mb-3">Risks</div>
                          <ul className="list-disc pl-5 text-sm md:text-base text-muted-foreground space-y-1.5">
                            {p.risks.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Micro-experiments */}
                      {p.micro_experiments?.length > 0 && (
                        <div className="rounded-2xl border border-foreground/10 p-4 md:p-5">
                          <div className="font-semibold text-base mb-3">
                            Micro-experiments (≤ 7 days)
                          </div>
                          <ul className="list-disc pl-5 text-sm md:text-base text-muted-foreground space-y-1.5">
                            {p.micro_experiments.map((m: string, i: number) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Environment fit */}
                    {p.environment_fit && (
                      <div className="rounded-2xl border border-foreground/10 p-4 md:p-5 mb-4">
                        <div className="font-semibold text-base mb-3">Environment fit</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {p.environment_fit.likely_to_fit?.length > 0 && (
                            <div>
                              <div className="text-sm text-foreground/70 font-medium mb-2">Often fits well in:</div>
                              <ul className="list-disc pl-5 text-sm md:text-base text-muted-foreground space-y-1">
                                {p.environment_fit.likely_to_fit.map((x: string, i: number) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {p.environment_fit.may_be_challenging?.length > 0 && (
                            <div>
                              <div className="text-sm text-foreground/70 font-medium mb-2">May feel challenging in:</div>
                              <ul className="list-disc pl-5 text-sm md:text-base text-muted-foreground space-y-1">
                                {p.environment_fit.may_be_challenging.map((x: string, i: number) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Example roles */}
                    {p.example_roles?.length > 0 && (
                      <div className="mb-4">
                        <div className="font-semibold text-base mb-3">Roles with a similar shape</div>
                        <div className="flex flex-wrap gap-2">
                          {p.example_roles.map((r: string, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full bg-muted text-sm font-medium"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Company archetypes */}
                    {p.company_archetypes?.length > 0 && (
                      <div>
                        <div className="font-semibold text-base mb-3">Where this often shows up</div>
                        <ul className="list-disc pl-5 text-sm md:text-base text-muted-foreground space-y-1">
                          {p.company_archetypes.map((c: string, i: number) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right arrow column */}
                <div className="flex items-center justify-center w-10 md:w-12 lg:w-14 flex-shrink-0">
                  {hasMultipleCards && (
                    <button
                      onClick={goToNext}
                      className="w-10 h-10 md:w-11 md:h-11 bg-card border-2 border-foreground/10 rounded-full shadow-playful hover:shadow-playful-hover hover:scale-110 hover:bg-card/80 transition-all flex items-center justify-center"
                      aria-label="Next card"
                    >
                      <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Dot indicators */}
              {hasMultipleCards && (
                <div className="flex justify-center gap-2 mt-5">
                  {hypotheses.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsTransitioning(true);
                        setActiveIndex(idx);
                        setTimeout(() => setIsTransitioning(false), 300);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx === activeIndex 
                          ? 'bg-primary scale-125' 
                          : 'bg-foreground/20 hover:bg-foreground/40'
                      }`}
                      aria-label={`Go to card ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button
            variant="hero"
            size="lg"
            className="min-w-[180px]"
            onClick={handleReflect}
            disabled={loading}
          >
            <SparklesDoodle className="w-5 h-5 mr-1" />
            {loading ? "Reflecting..." : "Reflect"}
          </Button>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link 
            to="/" 
            className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm inline-flex items-center gap-2 group"
          >
            <svg 
              className="w-4 h-4 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Write;

