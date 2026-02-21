import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sessions as sessionsApi, Session } from "@/lib/api";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { PathDoodle } from "@/components/Doodles";

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    sessionsApi
      .get(id)
      .then(setSession)
      .catch((e) => setError(e.message ?? "Failed to load session"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="relative min-h-screen px-4 py-10 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-blob blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-secondary/10 rounded-blob blur-3xl opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/history" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All reflections
          </Link>
          <div className="flex items-center gap-2">
            <PathDoodle className="w-6 h-6 text-primary" />
            <span className="font-display font-bold">Pathfinder</span>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center">
            {error}
          </div>
        )}

        {!loading && !error && session && (
          <>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground font-body mb-3 line-clamp-3 bg-card border border-foreground/10 rounded-xl p-4 italic">
                "{session.user_text}"
              </p>
            </div>

            {session.result ? (
              <ResultsDisplay result={session.result} />
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {session.status === "error"
                  ? "Generation failed for this session."
                  : "This session hasn't been generated yet."}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Results;
