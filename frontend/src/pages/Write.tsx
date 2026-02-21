import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarDoodle, SparklesDoodle, PathDoodle, QuestionDoodle } from "@/components/Doodles";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { ApiKeyButton, ApiKeyModal } from "@/components/ApiKeyModal";
import { sessions as sessionsApi, tts, Result, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";

type Phase = "extracting" | "synthesizing" | "evaluating" | "repairing" | "done";

const PHASE_LABELS: Record<Phase, string> = {
  extracting: "Extracting insights…",
  synthesizing: "Synthesizing path hypotheses…",
  evaluating: "Evaluating quality…",
  repairing: "Refining output…",
  done: "Done!",
};

const Write = () => {
  const { user } = useAuth();
  const { hasApiKey } = useApiKey();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [result, setResult] = useState<(Result & { eval?: unknown; retries_used?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));

  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // If a session ID is in the URL and we don't have a result yet, resume streaming
  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid && !result && user) {
      setSessionId(sid);
      streamSession(sid);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const streamSession = async (sid: string) => {
    setLoading(true);
    setError(null);
    setPhase("extracting");

    try {
      for await (const ev of sessionsApi.stream(sid)) {
        if (ev.event === "status") {
          setPhase(ev.data.phase as Phase);
        } else if (ev.event === "result") {
          setResult(ev.data as unknown as Result);
          setPhase("done");
          const reflection = (ev.data as unknown as Result).reflection;
          if (reflection) speakText(reflection);
        } else if (ev.event === "error") {
          setError(ev.data.message ?? "Generation failed. Please try again.");
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { state: { from: { pathname: "/write" } } });
        return;
      }
      setError("Connection lost. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReflect = async () => {
    if (text.trim().length < 10) {
      setError("Write a little more so Pathfinder has something to reflect on.");
      return;
    }

    if (!user) {
      navigate("/login", { state: { from: { pathname: "/write" } } });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const session = await sessionsApi.create(text.trim());
      setSessionId(session.id);
      // Update URL so the user can share / refresh
      window.history.replaceState(null, "", `/write?session=${session.id}`);
      await streamSession(session.id);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate("/login", { state: { from: { pathname: "/write" } } });
          return;
        }
        if (err.status === 429) {
          setError("Too many requests. Please wait a moment.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Couldn't reflect right now. Try again in a moment.");
      }
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (textToSpeak: string) => {
    if (!textToSpeak?.trim()) return;
    setTtsLoading(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      const blob = await tts.speak(textToSpeak);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
    } catch {
      /* TTS is optional — fail silently */
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Decorative elements */}
      <StarDoodle className="absolute top-16 left-8 w-10 h-10 text-primary float opacity-60 md:w-14 md:h-14" />
      <SparklesDoodle className="absolute top-24 right-12 w-8 h-8 text-secondary wobble opacity-50 md:w-10 md:h-10" />
      <QuestionDoodle className="absolute bottom-24 left-16 w-8 h-8 text-accent float opacity-40 md:w-12 md:h-12" />
      <PathDoodle className="absolute bottom-32 right-8 w-12 h-12 text-mint opacity-30 wobble md:w-16 md:h-16" />
      <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-primary/15 rounded-blob blur-3xl opacity-50" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-secondary/15 rounded-blob blur-3xl opacity-40" />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 bg-card border-2 border-foreground/10 rounded-full px-4 py-2 shadow-playful">
              <PathDoodle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Write Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <ApiKeyButton />
              {user && (
                <Link
                  to="/history"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  My reflections →
                </Link>
              )}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Write about your path</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed font-body">
            Write freely about your experiences—what energizes you, what drains you, what you want more of.{" "}
            <span className="text-foreground font-medium">There's no right format.</span>
          </p>
        </div>

        {/* Text area — hide once results are shown */}
        {!result && (
          <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful mb-6 max-w-2xl mx-auto">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              placeholder="Start writing here... What's been on your mind lately? What kind of work makes you lose track of time? What moments in your career have felt most meaningful?"
              className="w-full h-64 md:h-80 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-base md:text-lg leading-relaxed font-body resize-none focus:outline-none disabled:opacity-60"
            />
          </div>
        )}

        {/* Loading phase indicator */}
        {loading && phase && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-card border-2 border-foreground/10 rounded-2xl p-6 shadow-playful flex items-center gap-4">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderWidth: 3 }} />
              <div>
                <p className="font-medium text-foreground">{PHASE_LABELS[phase] ?? "Working…"}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  This usually takes 15–30 seconds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-destructive/10 text-destructive rounded-2xl p-4 text-sm text-center">
              {error}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mb-8">
            <ResultsDisplay
              result={result}
              onSpeakText={speakText}
              ttsLoading={ttsLoading}
            />

            {/* Start over */}
            <div className="flex justify-center mt-8 gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setResult(null);
                  setPhase(null);
                  setText("");
                  window.history.replaceState(null, "", "/write");
                }}
              >
                Start a new reflection
              </Button>
              {user && sessionId && (
                <Button variant="outline" size="lg" asChild>
                  <Link to="/history">View all reflections</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Reflect button */}
        {!result && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button
              variant="hero"
              size="lg"
              className="min-w-[180px]"
              onClick={() => {
                if (!hasApiKey) {
                  setShowApiKeyModal(true);
                } else {
                  handleReflect();
                }
              }}
              disabled={loading}
            >
              <SparklesDoodle className="w-5 h-5 mr-1" />
              {loading ? "Reflecting…" : "Reflect"}
            </Button>
          </div>
        )}

        {/* API Key prompt */}
        {!hasApiKey && !result && !loading && (
          <div className="max-w-md mx-auto mt-4 mb-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-body">
                <strong>Add your OpenAI API key</strong> to use Pathfinder.{" "}
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Add key →
                </button>
              </p>
            </div>
          </div>
        )}

        {/* API Key Modal */}
        <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />

        {!user && !loading && (
          <p className="text-center text-sm text-muted-foreground mt-4 font-body">
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>{" "}
            to save your reflections and view them later.
          </p>
        )}

        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm inline-flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
