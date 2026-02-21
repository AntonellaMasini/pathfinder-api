import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarDoodle, SparklesDoodle, PathDoodle, QuestionDoodle } from "@/components/Doodles";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { sessions as sessionsApi, transcription, Result, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type RecordingState = "idle" | "recording" | "ready";
type Phase = "transcribing" | "extracting" | "synthesizing" | "evaluating" | "repairing" | "done";

const PHASE_LABELS: Record<Phase, string> = {
  transcribing: "Transcribing your voice…",
  extracting: "Extracting insights…",
  synthesizing: "Synthesizing path hypotheses…",
  evaluating: "Evaluating quality…",
  repairing: "Refining output…",
  done: "Done!",
};

const Talk = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Reflection state
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [result, setResult] = useState<(Result & { eval?: unknown; retries_used?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);

  // TTS state
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setRecordingState("ready");
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setError(null);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setError("Could not access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordToggle = () => {
    if (recordingState === "idle" || recordingState === "ready") {
      startRecording();
    } else if (recordingState === "recording") {
      stopRecording();
    }
  };

  const streamSession = async (sid: string) => {
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
        navigate("/login", { state: { from: { pathname: "/talk" } } });
        return;
      }
      setError("Connection lost. Please try again.");
    }
  };

  const handleReflect = async () => {
    if (!audioBlob) {
      setError("No recording to reflect on. Please record something first.");
      return;
    }

    if (!user) {
      navigate("/login", { state: { from: { pathname: "/talk" } } });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setPhase("transcribing");

    try {
      // Step 1: Transcribe the audio
      const { text } = await transcription.transcribe(audioBlob);

      if (!text || text.trim().length < 10) {
        setError("The recording was too short or unclear. Please try again with a longer recording.");
        setLoading(false);
        setPhase(null);
        return;
      }

      setTranscribedText(text);
      setPhase("extracting");

      // Step 2: Create session and stream results
      const session = await sessionsApi.create(text.trim());
      setSessionId(session.id);
      window.history.replaceState(null, "", `/talk?session=${session.id}`);

      await streamSession(session.id);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate("/login", { state: { from: { pathname: "/talk" } } });
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
      const res = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
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

  const handleStartOver = () => {
    setResult(null);
    setPhase(null);
    setAudioBlob(null);
    setRecordingState("idle");
    setTranscribedText(null);
    setSessionId(null);
    window.history.replaceState(null, "", "/talk");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Floating decorative elements */}
      <StarDoodle className="absolute top-16 right-8 w-10 h-10 text-primary float opacity-60 md:w-14 md:h-14" />
      <SparklesDoodle className="absolute top-24 left-12 w-8 h-8 text-secondary wobble opacity-50 md:w-10 md:h-10" />
      <QuestionDoodle className="absolute bottom-24 right-16 w-8 h-8 text-accent float opacity-40 md:w-12 md:h-12" />
      <PathDoodle className="absolute bottom-32 left-8 w-12 h-12 text-mint opacity-30 wobble md:w-16 md:h-16" />
      <StarDoodle className="absolute top-1/2 right-4 w-6 h-6 text-secondary bounce-gentle opacity-40" />

      {/* Blob shapes */}
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-accent/15 rounded-blob blur-3xl opacity-50" />
      <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-secondary/15 rounded-blob blur-3xl opacity-40" />
      <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-primary/15 rounded-blob blur-3xl opacity-30" />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 bg-card border-2 border-foreground/10 rounded-full px-4 py-2 shadow-playful">
              <SparklesDoodle className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">Talk Mode</span>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <Link
                  to="/history"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  My reflections →
                </Link>
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Talk about your path</span>
          </h1>

          {/* Supportive microcopy */}
          <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed font-body">
            Sometimes it's easier to think out loud.{" "}
            <span className="text-foreground font-medium">Press start and speak freely.</span>
          </p>
        </div>

        {/* Recording area — hide once results are shown */}
        {!result && (
          <div className="bg-card border-2 border-foreground/10 rounded-2xl p-8 md:p-12 shadow-playful mb-6 max-w-2xl mx-auto">
            {/* Recording button */}
            <button
              onClick={handleRecordToggle}
              disabled={loading}
              className={`
                relative w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto mb-6
                flex items-center justify-center
                transition-all duration-300 ease-out
                border-4 shadow-playful
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  recordingState === "recording"
                    ? "bg-secondary border-secondary/50 scale-110"
                    : "bg-primary border-primary/50 hover:scale-105 hover:shadow-playful-hover"
                }
              `}
            >
              {recordingState === "recording" ? (
                // Stop icon
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-foreground rounded-md" />
              ) : (
                // Microphone icon
                <svg
                  className="w-12 h-12 md:w-16 md:h-16 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}

              {/* Pulsing ring animation when recording */}
              {recordingState === "recording" && (
                <>
                  <span className="absolute inset-0 rounded-full bg-secondary/40 animate-ping" />
                  <span className="absolute inset-[-8px] rounded-full border-4 border-secondary/30 animate-pulse" />
                </>
              )}
            </button>

            {/* Recording status */}
            <div className="text-center">
              {recordingState === "idle" && !loading && (
                <p className="text-lg font-medium text-foreground font-body">Start recording</p>
              )}
              {recordingState === "recording" && (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 bg-secondary rounded-full animate-pulse" />
                  <p className="text-lg font-medium text-secondary font-body">Recording…</p>
                </div>
              )}
              {recordingState === "ready" && audioBlob && !loading && (
                <p className="text-lg font-medium text-mint font-body">
                  Recording ready! Click Reflect to continue.
                </p>
              )}
            </div>
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
                  {phase === "transcribing" ? "Converting your speech to text…" : "This usually takes 15–30 seconds."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transcribed text preview (shown during processing) */}
        {transcribedText && !result && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-card border border-foreground/10 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">What you said:</p>
              <p className="text-sm text-foreground/80 italic font-body line-clamp-3">"{transcribedText}"</p>
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
            {/* Show transcribed text summary */}
            {transcribedText && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground font-body mb-3 line-clamp-3 bg-card border border-foreground/10 rounded-xl p-4 italic">
                  "{transcribedText}"
                </p>
              </div>
            )}

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
                onClick={handleStartOver}
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
        {!result && recordingState === "ready" && !loading && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6">
            <Button
              variant="hero"
              size="lg"
              className="min-w-[180px]"
              onClick={handleReflect}
              disabled={loading || !audioBlob}
            >
              <SparklesDoodle className="w-5 h-5 mr-1" />
              Reflect
            </Button>
          </div>
        )}

        {/* Instructions */}
        {!result && !loading && (
          <p className="text-sm text-muted-foreground text-center mb-6 font-body">
            {recordingState === "idle" && "Click the button above to start recording your thoughts."}
            {recordingState === "recording" && "Click the button again to stop recording."}
            {recordingState === "ready" && "Want to try again? Click the microphone to record a new one."}
          </p>
        )}

        {!user && !loading && !result && (
          <p className="text-center text-sm text-muted-foreground mt-4 font-body">
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>{" "}
            to save your reflections and view them later.
          </p>
        )}

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

export default Talk;
