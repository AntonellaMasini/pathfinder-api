import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarDoodle, SparklesDoodle, PathDoodle, QuestionDoodle } from "@/components/Doodles";

type RecordingState = "idle" | "recording" | "ready";

const Talk = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check your permissions.");
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

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-card border-2 border-foreground/10 rounded-full px-4 py-2 mb-6 shadow-playful">
            <SparklesDoodle className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-muted-foreground">Talk Mode</span>
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

        {/* Recording area */}
        <div className="bg-card border-2 border-foreground/10 rounded-2xl p-8 md:p-12 shadow-playful mb-6">
          {/* Recording button */}
          <button
            onClick={handleRecordToggle}
            className={`
              relative w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto mb-6
              flex items-center justify-center
              transition-all duration-300 ease-out
              border-4 shadow-playful
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
            {recordingState === "idle" && (
              <p className="text-lg font-medium text-foreground font-body">Start recording</p>
            )}
            {recordingState === "recording" && (
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 bg-secondary rounded-full animate-pulse" />
                <p className="text-lg font-medium text-secondary font-body">Recording…</p>
              </div>
            )}
            {recordingState === "ready" && audioBlob && (
              <p className="text-lg font-medium text-mint font-body">
                Recording ready (we'll send this to the AI soon).
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground mb-6 font-body">
          {recordingState === "idle" && "Click the button above to start recording your thoughts."}
          {recordingState === "recording" && "Click the button again to stop recording."}
          {recordingState === "ready" && "Want to try again? Click the button to record a new one."}
        </p>

        {/* Action button when ready */}
        {recordingState === "ready" && (
          <div className="mb-6">
            <Button variant="hero" size="lg" className="min-w-[180px]">
              <SparklesDoodle className="w-5 h-5 mr-1" />
              Reflect
            </Button>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8">
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

