import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKey } from "@/contexts/ApiKeyContext";

interface ApiKeyModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ApiKeyModal({ trigger, open, onOpenChange }: ApiKeyModalProps) {
  const {
    openaiKey,
    setOpenaiKey,
    hasOpenaiKey,
    elevenLabsKey,
    setElevenLabsKey,
    elevenLabsVoice,
    setElevenLabsVoice,
    hasElevenLabs,
    clearAll,
  } = useApiKey();

  const [openaiInput, setOpenaiInput] = useState(openaiKey || "");
  const [elevenLabsKeyInput, setElevenLabsKeyInput] = useState(elevenLabsKey || "");
  const [elevenLabsVoiceInput, setElevenLabsVoiceInput] = useState(elevenLabsVoice || "");
  const [showKeys, setShowKeys] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSave = () => {
    const trimmedOpenai = openaiInput.trim();
    if (trimmedOpenai) {
      setOpenaiKey(trimmedOpenai);
    }

    const trimmedElevenLabsKey = elevenLabsKeyInput.trim();
    const trimmedElevenLabsVoice = elevenLabsVoiceInput.trim();
    if (trimmedElevenLabsKey) {
      setElevenLabsKey(trimmedElevenLabsKey);
    }
    if (trimmedElevenLabsVoice) {
      setElevenLabsVoice(trimmedElevenLabsVoice);
    }

    onOpenChange?.(false);
  };

  const handleClearAll = () => {
    setOpenaiInput("");
    setElevenLabsKeyInput("");
    setElevenLabsVoiceInput("");
    clearAll();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpenaiInput(openaiKey || "");
      setElevenLabsKeyInput(elevenLabsKey || "");
      setElevenLabsVoiceInput(elevenLabsVoice || "");
    }
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">API Keys</DialogTitle>
          <DialogDescription className="font-body">
            Your keys are stored locally in your browser and never sent to our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* OpenAI Key (Required) */}
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="font-medium">
              OpenAI API Key <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type={showKeys ? "text" : "password"}
                placeholder="sk-..."
                value={openaiInput}
                onChange={(e) => setOpenaiInput(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="shrink-0"
              >
                {showKeys ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Required for reflections.{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get your key →
              </a>
            </p>
            {hasOpenaiKey && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>OpenAI key configured</span>
              </div>
            )}
          </div>

          {/* ElevenLabs (Optional) */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium">Voice Playback (Optional)</span>
              {hasElevenLabs && (
                <span className="ml-auto text-xs text-green-600 dark:text-green-400">✓ Configured</span>
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pl-6">
                <p className="text-xs text-muted-foreground">
                  Add ElevenLabs credentials to hear your reflections read aloud.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabs-key" className="text-sm font-medium">
                    ElevenLabs API Key
                  </Label>
                  <Input
                    id="elevenlabs-key"
                    type={showKeys ? "text" : "password"}
                    placeholder="Your ElevenLabs API key"
                    value={elevenLabsKeyInput}
                    onChange={(e) => setElevenLabsKeyInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    <a
                      href="https://elevenlabs.io/app/settings/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Get your key →
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabs-voice" className="text-sm font-medium">
                    Voice ID
                  </Label>
                  <Input
                    id="elevenlabs-voice"
                    type="text"
                    placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
                    value={elevenLabsVoiceInput}
                    onChange={(e) => setElevenLabsVoiceInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find voice IDs in your{" "}
                    <a
                      href="https://elevenlabs.io/app/voice-library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      ElevenLabs Voice Library
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {(hasOpenaiKey || hasElevenLabs) && (
            <Button type="button" variant="outline" onClick={handleClearAll}>
              Clear All
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={!openaiInput.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple button that opens the API key modal.
 */
export function ApiKeyButton() {
  const { hasOpenaiKey } = useApiKey();
  const [open, setOpen] = useState(false);

  return (
    <ApiKeyModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" size="sm" className="gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          {hasOpenaiKey ? "API Keys ✓" : "Add API Key"}
        </Button>
      }
    />
  );
}
