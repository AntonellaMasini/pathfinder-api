import React, { createContext, useContext, useState, ReactNode } from "react";

interface ApiKeyContextType {
  // OpenAI
  openaiKey: string | null;
  setOpenaiKey: (key: string | null) => void;
  hasOpenaiKey: boolean;
  
  // ElevenLabs (optional)
  elevenLabsKey: string | null;
  setElevenLabsKey: (key: string | null) => void;
  elevenLabsVoice: string | null;
  setElevenLabsVoice: (voice: string | null) => void;
  hasElevenLabs: boolean;
  
  // Legacy alias for OpenAI key
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  hasApiKey: boolean;
  
  clearAll: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

const OPENAI_KEY = "pf_openai_key";
const ELEVENLABS_KEY = "pf_elevenlabs_key";
const ELEVENLABS_VOICE = "pf_elevenlabs_voice";

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [openaiKey, setOpenaiKeyState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(OPENAI_KEY);
    }
    return null;
  });

  const [elevenLabsKey, setElevenLabsKeyState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ELEVENLABS_KEY);
    }
    return null;
  });

  const [elevenLabsVoice, setElevenLabsVoiceState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ELEVENLABS_VOICE);
    }
    return null;
  });

  const setOpenaiKey = (key: string | null) => {
    setOpenaiKeyState(key);
    if (key) {
      localStorage.setItem(OPENAI_KEY, key);
    } else {
      localStorage.removeItem(OPENAI_KEY);
    }
  };

  const setElevenLabsKey = (key: string | null) => {
    setElevenLabsKeyState(key);
    if (key) {
      localStorage.setItem(ELEVENLABS_KEY, key);
    } else {
      localStorage.removeItem(ELEVENLABS_KEY);
    }
  };

  const setElevenLabsVoice = (voice: string | null) => {
    setElevenLabsVoiceState(voice);
    if (voice) {
      localStorage.setItem(ELEVENLABS_VOICE, voice);
    } else {
      localStorage.removeItem(ELEVENLABS_VOICE);
    }
  };

  const clearAll = () => {
    setOpenaiKeyState(null);
    setElevenLabsKeyState(null);
    setElevenLabsVoiceState(null);
    localStorage.removeItem(OPENAI_KEY);
    localStorage.removeItem(ELEVENLABS_KEY);
    localStorage.removeItem(ELEVENLABS_VOICE);
  };

  return (
    <ApiKeyContext.Provider
      value={{
        openaiKey,
        setOpenaiKey,
        hasOpenaiKey: !!openaiKey,
        
        elevenLabsKey,
        setElevenLabsKey,
        elevenLabsVoice,
        setElevenLabsVoice,
        hasElevenLabs: !!(elevenLabsKey && elevenLabsVoice),
        
        // Legacy aliases
        apiKey: openaiKey,
        setApiKey: setOpenaiKey,
        hasApiKey: !!openaiKey,
        
        clearAll,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error("useApiKey must be used within an ApiKeyProvider");
  }
  return context;
}
