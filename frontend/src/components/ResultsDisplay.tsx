/**
 * Shared component for rendering Pathfinder results (reflection, insights, archetypes).
 * Used by both the Write page (inline after generation) and the Results page.
 */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Result } from "@/lib/api";
import { SparklesDoodle } from "@/components/Doodles";

interface ResultsDisplayProps {
  result: Result & { eval?: unknown; retries_used?: number };
  onSpeakText?: (text: string) => void;
  ttsLoading?: boolean;
}

export function ResultsDisplay({ result, onSpeakText, ttsLoading }: ResultsDisplayProps) {
  const hypotheses = result.path_hypotheses ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const totalCards = hypotheses.length;
  const hasMultiple = totalCards > 1;

  const go = (dir: 1 | -1) => {
    if (!hasMultiple || isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + dir + totalCards) % totalCards);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const p = hypotheses[activeIndex];

  return (
    <div className="space-y-6">
      {/* Reflection */}
      <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Reflection</h2>
          {onSpeakText && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSpeakText(result.reflection)}
              disabled={ttsLoading}
            >
              {ttsLoading ? "Speaking…" : "🔊 Replay"}
            </Button>
          )}
        </div>
        <p className="text-base leading-relaxed font-body">{result.reflection}</p>
        {result.clarifying_question && (
          <p className="mt-3 text-sm text-muted-foreground italic font-body">
            {result.clarifying_question}
          </p>
        )}
      </div>

      {/* Insights */}
      {result.insights && (
        <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful">
          <h2 className="text-lg font-display font-semibold mb-4">Insights</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["Energizers", result.insights.energizers],
                ["Drainers", result.insights.drainers],
                ["Values", result.insights.values],
                ["Skills", result.insights.skills],
                ["Work styles", result.insights.work_styles],
                ["Open questions", result.insights.open_questions],
              ] as [string, string[]][]
            ).map(([label, items]) => (
              <div key={label} className="rounded-xl border border-foreground/10 p-4">
                <div className="font-medium mb-2 text-sm">{label}</div>
                {items?.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {items.map((item, i) => (
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

      {/* Path hypotheses carousel */}
      {totalCards > 0 && p && (
        <div className="mt-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h2 className="text-2xl font-display font-bold text-center">Path hypotheses</h2>
            {hasMultiple && (
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                {activeIndex + 1} / {totalCards}
              </span>
            )}
          </div>

          <div className="flex items-stretch gap-3 md:gap-6">
            {/* Left arrow */}
            <div className="flex items-center justify-center w-10 md:w-12 flex-shrink-0">
              {hasMultiple && (
                <button
                  onClick={() => go(-1)}
                  className="w-10 h-10 bg-card border-2 border-foreground/10 rounded-full shadow-playful hover:shadow-playful-hover hover:scale-110 transition-all flex items-center justify-center"
                  aria-label="Previous"
                >
                  <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Card */}
            <div
              className="flex-1 min-w-0"
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const diff = touchStartX.current - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1);
                touchStartX.current = null;
              }}
            >
              <div
                key={activeIndex}
                className={`w-full bg-card border-2 border-foreground/15 rounded-3xl p-6 md:p-8 shadow-playful transition-all duration-300 ${
                  isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
                }`}
              >
                <div className="text-xl md:text-2xl font-display font-bold mb-3">{p.name}</div>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">{p.why_it_fits}</p>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  {p.risks?.length > 0 && (
                    <div className="rounded-2xl border border-foreground/10 p-4">
                      <div className="font-semibold text-sm mb-2">Risks</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {p.risks.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {p.micro_experiments?.length > 0 && (
                    <div className="rounded-2xl border border-foreground/10 p-4">
                      <div className="font-semibold text-sm mb-2">Micro-experiments (≤ 7 days)</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {p.micro_experiments.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {p.environment_fit && (
                  <div className="rounded-2xl border border-foreground/10 p-4 mb-4">
                    <div className="font-semibold text-sm mb-3">Environment fit</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {p.environment_fit.likely_to_fit?.length > 0 && (
                        <div>
                          <div className="text-xs text-foreground/60 font-medium mb-1">Often fits well in:</div>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            {p.environment_fit.likely_to_fit.map((x, i) => <li key={i}>{x}</li>)}
                          </ul>
                        </div>
                      )}
                      {p.environment_fit.may_be_challenging?.length > 0 && (
                        <div>
                          <div className="text-xs text-foreground/60 font-medium mb-1">May be challenging in:</div>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            {p.environment_fit.may_be_challenging.map((x, i) => <li key={i}>{x}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {p.example_roles?.length > 0 && (
                  <div className="mb-4">
                    <div className="font-semibold text-sm mb-2">Roles with a similar shape</div>
                    <div className="flex flex-wrap gap-2">
                      {p.example_roles.map((r, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-muted text-sm font-medium">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {p.company_archetypes?.length > 0 && (
                  <div>
                    <div className="font-semibold text-sm mb-2">Where this often shows up</div>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {p.company_archetypes.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right arrow */}
            <div className="flex items-center justify-center w-10 md:w-12 flex-shrink-0">
              {hasMultiple && (
                <button
                  onClick={() => go(1)}
                  className="w-10 h-10 bg-card border-2 border-foreground/10 rounded-full shadow-playful hover:shadow-playful-hover hover:scale-110 transition-all flex items-center justify-center"
                  aria-label="Next"
                >
                  <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Dot indicators */}
          {hasMultiple && (
            <div className="flex justify-center gap-2 mt-5">
              {hypotheses.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { setIsTransitioning(true); setActiveIndex(idx); setTimeout(() => setIsTransitioning(false), 300); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${idx === activeIndex ? "bg-primary scale-125" : "bg-foreground/20 hover:bg-foreground/40"}`}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
