/**
 * Typed API client for Pathfinder.
 * All requests go through the Vite proxy in dev (target: http://localhost:8000).
 */

const BASE = "";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return localStorage.getItem("pf_token");
}

export function setToken(token: string): void {
  localStorage.setItem("pf_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("pf_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// BYOK (Bring Your Own Key) helpers
// ---------------------------------------------------------------------------

const OPENAI_KEY_STORAGE = "pf_openai_key";
const ELEVENLABS_KEY_STORAGE = "pf_elevenlabs_key";
const ELEVENLABS_VOICE_STORAGE = "pf_elevenlabs_voice";

export function getOpenAIKey(): string | null {
  return localStorage.getItem(OPENAI_KEY_STORAGE);
}

export function setOpenAIKey(key: string): void {
  localStorage.setItem(OPENAI_KEY_STORAGE, key);
}

export function clearOpenAIKey(): void {
  localStorage.removeItem(OPENAI_KEY_STORAGE);
}

export function getElevenLabsKey(): string | null {
  return localStorage.getItem(ELEVENLABS_KEY_STORAGE);
}

export function getElevenLabsVoice(): string | null {
  return localStorage.getItem(ELEVENLABS_VOICE_STORAGE);
}

export function hasElevenLabsConfig(): boolean {
  return !!(getElevenLabsKey() && getElevenLabsVoice());
}

function openAIKeyHeader(): Record<string, string> {
  const key = getOpenAIKey();
  return key ? { "X-OpenAI-Key": key } : {};
}

function elevenLabsHeaders(): Record<string, string> {
  const key = getElevenLabsKey();
  const voice = getElevenLabsVoice();
  const headers: Record<string, string> = {};
  if (key) headers["X-ElevenLabs-Key"] = key;
  if (voice) headers["X-ElevenLabs-Voice"] = voice;
  return headers;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      detail = body?.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(resp.status, detail);
  }

  // 204 No Content
  if (resp.status === 204) return undefined as unknown as T;

  return resp.json();
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Session {
  id: string;
  user_text: string;
  status: "pending" | "generating" | "done" | "error";
  created_at: string;
  completed_at: string | null;
  result: Result | null;
}

export interface SessionListItem {
  id: string;
  user_text: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  first_archetype: string | null;
}

export interface Result {
  reflection: string;
  clarifying_question: string;
  insights: Insights;
  path_hypotheses: PathHypothesis[];
  eval_data: EvalData | null;
  retries_used: number;
}

export interface Insights {
  energizers: string[];
  drainers: string[];
  values: string[];
  skills: string[];
  work_styles: string[];
  constraints: string[];
  open_questions: string[];
}

export interface PathHypothesis {
  name: string;
  why_it_fits: string;
  risks: string[];
  micro_experiments: string[];
  environment_fit: { likely_to_fit: string[]; may_be_challenging: string[] };
  example_roles: string[];
  company_archetypes: string[];
}

export interface EvalData {
  faithfulness: number;
  non_prescriptive: number;
  clarity: number;
  actionability: number;
  overreach: number;
  advice_risk: number;
  pass_gate: boolean;
}

// SSE stream events
export type SSEEvent =
  | { event: "status"; data: { phase: string } }
  | { event: "result"; data: Result & { eval: EvalData | null; retries_used: number } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message: string } };

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const auth = {
  register(email: string, password: string): Promise<User> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    // OAuth2PasswordRequestForm expects form data
    const form = new URLSearchParams({ username: email, password });
    const resp = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new ApiError(resp.status, body?.detail ?? `HTTP ${resp.status}`);
    }
    return resp.json();
  },

  me(): Promise<User> {
    return request("/auth/me");
  },
};

// ---------------------------------------------------------------------------
// Sessions API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Transcription API
// ---------------------------------------------------------------------------

export const transcription = {
  /**
   * Transcribe audio using OpenAI Whisper.
   * Accepts a Blob (e.g. from MediaRecorder).
   * Supports BYOK: uses user's OpenAI key from localStorage if available.
   */
  async transcribe(audioBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const resp = await fetch(`${BASE}/transcribe`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        ...openAIKeyHeader(),
      },
      body: formData,
    });

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const body = await resp.json();
        detail = body?.detail ?? detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(resp.status, detail);
    }

    return resp.json();
  },
};

// ---------------------------------------------------------------------------
// Sessions API
// ---------------------------------------------------------------------------

export const sessions = {
  list(): Promise<SessionListItem[]> {
    return request("/sessions");
  },

  create(user_text: string): Promise<Session> {
    return request("/sessions", {
      method: "POST",
      body: JSON.stringify({ user_text }),
    });
  },

  get(id: string): Promise<Session> {
    return request(`/sessions/${id}`);
  },

  delete(id: string): Promise<void> {
    return request(`/sessions/${id}`, { method: "DELETE" });
  },

  /**
   * Fetch-based SSE stream. Returns an async generator of typed events.
   * Uses Bearer auth (EventSource doesn't support custom headers).
   * Supports BYOK: uses user's OpenAI key from localStorage if available.
   */
  async *stream(sessionId: string): AsyncGenerator<SSEEvent> {
    const resp = await fetch(`${BASE}/sessions/${sessionId}/stream`, {
      headers: {
        ...authHeaders(),
        ...openAIKeyHeader(),
      },
    });

    if (!resp.ok) {
      let msg = `HTTP ${resp.status}`;
      try {
        const body = await resp.json();
        msg = body?.detail ?? msg;
      } catch {
        /* ignore */
      }
      throw new ApiError(resp.status, msg);
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const eventLine = chunk.match(/^event: (.+)/m)?.[1] ?? "message";
        const dataLine = chunk.match(/^data: (.+)/m)?.[1] ?? "{}";
        try {
          yield { event: eventLine, data: JSON.parse(dataLine) } as SSEEvent;
        } catch {
          /* skip malformed chunk */
        }
      }
    }
  },
};

// ---------------------------------------------------------------------------
// TTS API (optional - requires ElevenLabs config)
// ---------------------------------------------------------------------------

export const tts = {
  /**
   * Convert text to speech using ElevenLabs.
   * Returns audio blob, or throws if TTS is not configured.
   */
  async speak(text: string): Promise<Blob> {
    const resp = await fetch(`${BASE}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...elevenLabsHeaders(),
      },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const body = await resp.json();
        detail = body?.detail ?? detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(resp.status, detail);
    }

    return resp.blob();
  },
};
