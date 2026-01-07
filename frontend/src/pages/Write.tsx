import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarDoodle, SparklesDoodle, PathDoodle, QuestionDoodle } from "@/components/Doodles";

const Write = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      <div className="relative z-10 w-full max-w-2xl mx-auto">
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
        <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start writing here... What's been on your mind lately? What kind of work makes you lose track of time? What moments in your career have felt most meaningful?"
            className="w-full h-64 md:h-80 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-base md:text-lg leading-relaxed font-body resize-none focus:outline-none"
          />
        </div>

        {/* Reflection result (appears only after API call) */}
        {result && (
          <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mt-6 mb-6">
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
          <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mt-6 mb-6">
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
        {Array.isArray(result?.result?.path_hypotheses) &&
          result.result.path_hypotheses.length > 0 && (
            <div className="mt-6 mb-6">
              <h2 className="text-2xl font-display font-bold mb-4 text-center">
                Path hypotheses
              </h2>

              <div className="space-y-4">
                {result.result.path_hypotheses.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful"
                  >
                    <div className="text-lg font-display font-semibold mb-2">
                      {p.name}
                    </div>

                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                      {p.why_it_fits}
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-foreground/10 p-4">
                        <div className="font-medium mb-2">Risks</div>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {p.risks?.map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-foreground/10 p-4">
                        <div className="font-medium mb-2">
                          Micro-experiments (≤ 7 days)
                        </div>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {p.micro_experiments?.map((m: string, i: number) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

