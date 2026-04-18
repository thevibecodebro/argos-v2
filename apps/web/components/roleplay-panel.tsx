"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ROLEPLAY_CATEGORY_LABELS,
  type RoleplayPersona,
  type RoleplayMessage,
  type RoleplaySession,
} from "@/lib/roleplay/types";

type RoleplayPanelProps = {
  initialPersonas: RoleplayPersona[];
  initialSessions: RoleplaySession[];
  voiceAvailable: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatDuration(seconds: number | null | undefined) {
  if (typeof seconds !== "number" || seconds < 0) {
    return "—";
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function labelCallStage(value: string | undefined) {
  switch (value) {
    case "commitment": return "Commitment";
    case "objection_handling": return "Objection Handling";
    case "solution": return "Solution";
    case "discovery": return "Discovery";
    default: return "Opening";
  }
}

function difficultyBadge(difficulty: string) {
  if (difficulty === "advanced") return "bg-[#ff716c]/10 text-[#ff716c]";
  if (difficulty === "intermediate") return "bg-[#74b1ff]/10 text-[#74b1ff]";
  return "bg-[#6dddff]/10 text-[#6dddff]";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-[#6dddff]";
  if (score >= 65) return "text-[#74b1ff]";
  return "text-[#ff716c]";
}

function scoreBarColor(score: number) {
  if (score >= 80) return "bg-[#6dddff]";
  if (score >= 65) return "bg-[#74b1ff]";
  return "bg-[#ff716c]";
}

function parseRealtimeEvent(rawEvent: string): RoleplayMessage | null {
  try {
    const parsed = JSON.parse(rawEvent) as {
      type?: string;
      transcript?: string;
      delta?: string;
      text?: string;
      item?: { role?: "assistant" | "user"; content?: Array<{ transcript?: string; text?: string }> };
    } | string;

    if (typeof parsed === "string") return null;

    const transcript =
      parsed.transcript ??
      parsed.text ??
      parsed.item?.content?.map((p) => p.transcript ?? p.text).filter(Boolean).join(" ");

    if (!transcript?.trim()) return null;

    if (parsed.type?.includes("input_audio")) return { role: "user", content: transcript.trim() };
    if (parsed.type?.includes("response") || parsed.item?.role === "assistant")
      return { role: "assistant", content: transcript.trim() };

    return null;
  } catch {
    return null;
  }
}

export function RoleplayPanel({ initialPersonas, initialSessions, voiceAvailable }: RoleplayPanelProps) {
  const router = useRouter();
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const [personas] = useState(initialPersonas);
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSession, setActiveSession] = useState<RoleplaySession | null>(
    initialSessions[0] ?? null,
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    initialSessions[0]?.persona ?? initialPersonas[0]?.id ?? "",
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [isStartingVoice, setIsStartingVoice] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState<RoleplayMessage[]>([]);
  const [speakingLine, setSpeakingLine] = useState<string | null>(null);

  const displayedTranscript = useMemo(
    () => (activeSession ? [...activeSession.transcript, ...liveVoiceTranscript] : []),
    [activeSession, liveVoiceTranscript],
  );

  function cleanupVoiceSession() {
    if (dataChannelRef.current) {
      dataChannelRef.current.onclose = null;
      dataChannelRef.current.onerror = null;
      dataChannelRef.current.onmessage = null;
      dataChannelRef.current.close();
    }
    dataChannelRef.current = null;
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIsVoiceActive(false);
    setIsStartingVoice(false);
  }

  async function waitForIceGatheringComplete(pc: RTCPeerConnection) {
    if (pc.iceGatheringState === "complete") return;
    await new Promise<void>((resolve) => {
      const handler = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", handler);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", handler);
    });
  }

  async function startVoicePractice() {
    if (!activeSession) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setError("This browser does not support live voice practice.");
      return;
    }

    setError(null);
    setVoiceStatus("Requesting microphone access…");
    setIsStartingVoice(true);
    setLiveVoiceTranscript([]);

    try {
      const sessionId = activeSession.id;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      const remoteStream = new MediaStream();
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
      pc.ontrack = (e) => e.streams.forEach((s) => s.getTracks().forEach((t) => remoteStream.addTrack(t)));

      const dc = pc.createDataChannel("argos-realtime-events");
      dataChannelRef.current = dc;
      dc.onopen = () => { setVoiceStatus("Voice practice live."); setIsVoiceActive(true); setIsStartingVoice(false); };
      dc.onmessage = (e) => {
        const msg = parseRealtimeEvent(e.data);
        if (msg) setLiveVoiceTranscript((cur) => [...cur, msg]);
      };
      dc.onerror = () => setError("Voice mode lost the realtime event channel. Stop and restart.");
      dc.onclose = () => {
        void closeSession(sessionId);
        cleanupVoiceSession();
        setVoiceStatus("Voice practice stopped.");
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "closed" || pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          void closeSession(sessionId);
          cleanupVoiceSession();
          setVoiceStatus("Voice practice disconnected.");
        }
      };

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);

      const res = await fetch(`/api/roleplay/sessions/${activeSession.id}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription?.sdp ?? offer.sdp ?? "",
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to start voice practice.");
      }

      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    } catch (err) {
      cleanupVoiceSession();
      const msg = err instanceof Error
        ? err.message.includes("Permission") ? "Microphone access was denied." : err.message
        : "Unable to start voice practice.";
      setVoiceStatus(null);
      setError(msg);
    }
  }

  function stopVoicePractice() {
    if (activeSession) {
      void closeSession(activeSession.id);
    }
    cleanupVoiceSession();
    setVoiceStatus("Voice practice stopped.");
  }

  async function closeSession(sessionId: string) {
    try {
      const res = await fetch(`/api/roleplay/sessions/${sessionId}/close`, {
        method: "POST",
      });

      if (!res.ok) {
        return;
      }

      const payload = (await res.json()) as RoleplaySession;
      setActiveSession((current) => (current?.id === payload.id ? payload : current));
      setSessions((current) => current.map((session) => (session.id === payload.id ? payload : session)));
    } catch {
      // Best-effort timing persistence should not block local voice teardown.
    }
  }

  async function playTranscriptLine(text: string) {
    if (!text.trim()) return;
    setError(null);
    setSpeakingLine(text);
    try {
      const res = await fetch("/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: "Speak like a calm, direct buyer in a sales roleplay.", text }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(p?.error ?? "Unable to synthesize voice.");
      }
      const blob = await res.blob();
      if (activeAudioUrlRef.current) URL.revokeObjectURL(activeAudioUrlRef.current);
      const url = URL.createObjectURL(blob);
      activeAudioUrlRef.current = url;
      const audio = new Audio(url);
      await audio.play();
      audio.addEventListener("ended", () => {
        if (activeAudioUrlRef.current) { URL.revokeObjectURL(activeAudioUrlRef.current); activeAudioUrlRef.current = null; }
        setSpeakingLine(null);
      }, { once: true });
    } catch (err) {
      setSpeakingLine(null);
      setError(err instanceof Error ? err.message : "Unable to synthesize voice.");
    }
  }

  async function loadSession(sessionId: string) {
    setError(null);
    setIsMutating(true);
    const res = await fetch(`/api/roleplay/sessions/${sessionId}`, { cache: "no-store" });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) { setError(payload.error ?? "Unable to load session."); setIsMutating(false); return; }
    setActiveSession(payload);
    setSelectedPersonaId(payload.persona ?? selectedPersonaId);
    setIsMutating(false);
  }

  async function createSession() {
    if (!selectedPersonaId) return;
    setError(null);
    setIsMutating(true);
    const res = await fetch("/api/roleplay/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: selectedPersonaId }),
    });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) { setError(payload.error ?? "Unable to start session."); setIsMutating(false); return; }
    setSessions((cur) => [payload, ...cur.filter((s) => s.id !== payload.id)]);
    setActiveSession(payload);
    setDraft("");
    setIsMutating(false);
    startTransition(() => router.refresh());
  }

  async function sendMessage() {
    if (!activeSession || !draft.trim()) return;
    setError(null);
    setIsMutating(true);
    const res = await fetch(`/api/roleplay/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.trim() }),
    });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) { setError(payload.error ?? "Unable to send message."); setIsMutating(false); return; }
    setActiveSession(payload);
    setSessions((cur) => cur.map((s) => (s.id === payload.id ? payload : s)));
    setDraft("");
    setIsMutating(false);
    setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function completeSession() {
    if (!activeSession) return;
    setError(null);
    setIsMutating(true);
    const res = await fetch(`/api/roleplay/sessions/${activeSession.id}/complete`, { method: "POST" });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) { setError(payload.error ?? "Unable to score session."); setIsMutating(false); return; }
    setActiveSession(payload);
    setSessions((cur) => cur.map((s) => (s.id === payload.id ? payload : s)));
    setIsMutating(false);
    startTransition(() => router.refresh());
  }

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) ?? activeSession?.personaDetails ?? null;
  const completedSessions = sessions.filter((s) => s.status === "complete");

  return (
    <>
      {/* Persona Selection Grid */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-['Space_Grotesk'] text-3xl font-bold text-[#ecedf6]">Target Personas</h2>
            <p className="mt-1 text-sm text-[#a9abb3]">Select an AI agent to begin your simulation scenario.</p>
          </div>
          <button
            className="flex items-center gap-2 font-medium text-[#74b1ff] hover:underline"
            disabled={!selectedPersonaId || isMutating}
            onClick={() => void createSession()}
            type="button"
          >
            {isMutating ? "Starting..." : "Start simulation"}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {personas.map((persona) => {
            const isSelected = persona.id === selectedPersonaId;
            return (
              <button
                className={`group rounded-xl p-5 text-left transition-all ${
                  isSelected
                    ? "border border-[#74b1ff]/30 bg-[#1c2028]/50 ring-1 ring-[#74b1ff]/20"
                    : "border border-[#45484f]/20 bg-[#22262f]/40 backdrop-blur-sm hover:bg-[#22262f]/60"
                }`}
                key={persona.id}
                onClick={() => setSelectedPersonaId(persona.id)}
                style={{ backdropFilter: "blur(12px)" }}
                type="button"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold ${
                    isSelected ? "border-2 border-[#74b1ff] bg-[#74b1ff]/10 text-[#74b1ff]" : "bg-[#22262f] text-[#a9abb3]"
                  }`}>
                    {persona.avatarInitials}
                  </div>
                  <span className={`rounded-full px-2 py-1 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider ${difficultyBadge(persona.difficulty)}`}>
                    {persona.difficulty}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#ecedf6]">{persona.name}</h3>
                <p className="mb-3 text-xs text-[#74b1ff]">{persona.role}, {persona.company}</p>
                <p className="line-clamp-3 text-sm text-[#a9abb3]">{persona.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Live Simulation + Scorecard */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Chat Panel */}
        <div className="flex flex-col lg:col-span-2">
          {/* Session bar */}
          <div className="mb-4 flex items-center justify-between rounded-xl bg-[#10131a] p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {activeSession?.status === "active" && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#ff716c]" />
                )}
                <span className="material-symbols-outlined text-[#74b1ff]">videocam</span>
              </div>
              <span className="font-['Space_Grotesk'] text-sm uppercase tracking-widest text-[#ecedf6]">
                {activeSession
                  ? `Live Simulation: ${activeSession.personaDetails?.objectionType ?? "Objections Handling"}`
                  : "No active simulation"}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#22262f] p-1">
              {voiceAvailable ? (
                <button
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                    isVoiceActive ? "bg-[#ff716c]/20 text-[#ff716c]" : "bg-[#74b1ff] text-[#002345]"
                  }`}
                  disabled={isStartingVoice || !activeSession}
                  onClick={() => isVoiceActive ? stopVoicePractice() : void startVoicePractice()}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">mic</span>
                  {isStartingVoice ? "Starting…" : isVoiceActive ? "Stop" : "Voice"}
                </button>
              ) : (
                <span className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-amber-200">
                  <span className="material-symbols-outlined text-sm">mic_off</span>
                  Voice setup required
                </span>
              )}
              <span className="px-3 py-1.5 text-xs font-bold text-[#a9abb3]">Text</span>
            </div>
          </div>

          {!voiceAvailable && (
            <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Voice playback and live voice practice are unavailable in this environment. Ask an
              Argos admin to finish AI voice setup, then refresh this page.
            </div>
          )}

          {/* Transcript */}
          <div
            className="mb-6 flex h-[480px] flex-col gap-6 overflow-y-auto rounded-2xl border border-[#45484f]/20 p-6"
            style={{ background: "rgba(34,38,47,0.4)", backdropFilter: "blur(12px)", scrollbarWidth: "none" }}
          >
            {activeSession ? (
              displayedTranscript.length > 0 ? (
                displayedTranscript.map((msg, i) => (
                  <div
                    className={`flex max-w-[85%] items-start gap-4 ${msg.role === "user" ? "self-end flex-row-reverse" : ""}`}
                    key={`${msg.role}-${i}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                      msg.role === "user" ? "bg-[#74b1ff]/20" : "bg-[#22262f]"
                    }`}>
                      <span className="material-symbols-outlined text-sm text-[#74b1ff]">
                        {msg.role === "user" ? "person" : "smart_toy"}
                      </span>
                    </div>
                    <div className={`rounded-2xl border p-4 ${
                      msg.role === "user"
                        ? "rounded-tr-none border-[#74b1ff]/20 bg-[#74b1ff]/10"
                        : "rounded-tl-none border-[#45484f]/10 bg-[#1c2028]/60"
                    }`}>
                      <p className="text-sm leading-relaxed text-[#ecedf6]">{msg.content}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest text-[#a9abb3]">
                          {msg.role === "user" ? "You" : (activeSession.personaDetails?.name ?? "Prospect")}
                        </span>
                        {msg.role === "assistant" && voiceAvailable && (
                          <button
                            className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest text-[#74b1ff]"
                            onClick={() => void playTranscriptLine(msg.content)}
                            type="button"
                          >
                            {speakingLine === msg.content ? "Playing..." : "Listen"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center text-center">
                  <p className="text-sm text-[#a9abb3]">Session started — the prospect is waiting for you.</p>
                </div>
              )
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined mb-4 text-4xl text-[#a9abb3]">record_voice_over</span>
                <p className="font-['Space_Grotesk'] text-lg font-bold text-[#ecedf6]">Start a roleplay to practice the hard conversations</p>
                <p className="mt-2 max-w-sm text-sm text-[#a9abb3]">
                  Choose a persona above, then click &ldquo;Start simulation&rdquo; to begin.
                </p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}
          {voiceStatus && (
            <div className="mb-4 text-sm text-[#74b1ff]">{voiceStatus}</div>
          )}

          {/* Input */}
          <div className="flex items-end gap-4">
            <div className="relative flex-1">
              <textarea
                className="h-20 w-full resize-none rounded-xl border border-[#45484f]/20 bg-[#000000] p-4 pr-12 text-sm text-[#ecedf6] outline-none placeholder:text-[#a9abb3]/40 focus:border-[#74b1ff]/50 focus:ring-1 focus:ring-[#74b1ff]/20 disabled:opacity-40"
                disabled={!activeSession || activeSession.status === "complete" || isMutating}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                placeholder={
                  voiceAvailable
                    ? "Type your response or click the mic to speak..."
                    : "Type your response to continue the roleplay..."
                }
                value={draft}
              />
              <button
                className="absolute bottom-3 right-3 text-[#74b1ff] transition-transform hover:scale-110 active:scale-95 disabled:opacity-30"
                disabled={!activeSession || !draft.trim() || activeSession.status === "complete" || isMutating}
                onClick={() => void sendMessage()}
                type="button"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <button
              className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-[#74b1ff] to-[#54a3ff] px-6 font-extrabold text-[#002345] shadow-lg transition active:scale-95 disabled:opacity-40"
              disabled={!activeSession || activeSession.status === "complete" || isMutating}
              onClick={() => void completeSession()}
              type="button"
            >
              <span className="material-symbols-outlined text-2xl">insights</span>
              <span className="text-[10px] uppercase tracking-tighter">End &amp; Score</span>
            </button>
          </div>

          <audio autoPlay className="hidden" playsInline ref={remoteAudioRef} />
        </div>

        {/* Scorecard sidebar */}
        <aside className="space-y-6">
          <div
            className="flex min-h-[400px] flex-col rounded-2xl border border-[#45484f]/20 p-6"
            style={{ background: "rgba(34,38,47,0.4)", backdropFilter: "blur(12px)" }}
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#74b1ff]">leaderboard</span>
              <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#ecedf6]">Session Scorecard</h3>
            </div>

            {activeSession?.scorecard ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4">
                  <p className="font-['Space_Grotesk'] text-3xl font-bold text-[#ecedf6]">
                    {activeSession.overallScore ?? "—"}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#a9abb3]">{activeSession.scorecard.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3">
                    <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-widest text-[#a9abb3]">Confidence</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#ecedf6]">{activeSession.scorecard.confidence}</p>
                  </div>
                  <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3">
                    <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-widest text-[#a9abb3]">Stage</p>
                    <p className="mt-1 text-sm font-semibold text-[#ecedf6]">{labelCallStage(activeSession.scorecard.callStageReached)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(activeSession.scorecard.categoryScores).map(([cat, val]) => (
                    <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3" key={cat}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#a9abb3]">
                        {ROLEPLAY_CATEGORY_LABELS[cat as keyof typeof ROLEPLAY_CATEGORY_LABELS]}
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#ecedf6]">{val ?? "—"}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4">
                  <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-widest text-emerald-300">Strengths</p>
                  <ul className="mt-2 space-y-1 text-sm text-[#ecedf6]">
                    {activeSession.scorecard.strengths.map((s) => <li key={s}>• {s}</li>)}
                  </ul>
                </div>

                <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4">
                  <p className="font-['Space_Grotesk'] text-[10px] font-black uppercase tracking-widest text-amber-300">Improve</p>
                  <ul className="mt-2 space-y-1 text-sm text-[#ecedf6]">
                    {activeSession.scorecard.improvements.map((s) => <li key={s}>• {s}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#45484f]/20 bg-[#22262f]">
                  <span className="material-symbols-outlined text-3xl text-[#a9abb3]">query_stats</span>
                </div>
                <p className="font-bold text-[#ecedf6]">Waiting for session completion...</p>
                <p className="mt-2 max-w-[200px] text-xs text-[#a9abb3]">
                  Complete the current roleplay to generate your performance analytics and improvement tips.
                </p>
                <div className="mt-8 w-full space-y-4">
                  <div className="h-12 w-full animate-pulse rounded-lg bg-[#10131a]" />
                  <div className="h-24 w-full animate-pulse rounded-lg bg-[#10131a]" />
                  <div className="h-24 w-full animate-pulse rounded-lg bg-[#10131a]" />
                </div>
              </div>
            )}
          </div>

          {/* Pro tip */}
          <div className="rounded-2xl border border-[#c4dcfd]/20 bg-gradient-to-br from-[#314863]/20 to-[#161a21] p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#c4dcfd]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
              <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest text-[#c4dcfd]">Pro Tip</span>
            </div>
            <p className="text-xs italic leading-relaxed text-[#a9abb3]">
              &ldquo;When handling time-sensitive objections, acknowledge the constraint immediately before proposing a phased solution. It builds trust faster.&rdquo;
            </p>
          </div>
        </aside>
      </div>

      {/* Recent History Table */}
      {completedSessions.length > 0 && (
        <section className="space-y-6 pb-12">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#a9abb3]">history</span>
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-[#ecedf6]">Recent History</h2>
          </div>
          <div
            className="overflow-hidden rounded-2xl border border-[#45484f]/20"
            style={{ background: "rgba(34,38,47,0.4)", backdropFilter: "blur(12px)" }}
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#1c2028]/50 font-['Space_Grotesk'] text-[10px] uppercase tracking-[0.2em] text-[#a9abb3]/70">
                  <th className="px-6 py-4">Scenario</th>
                  <th className="px-6 py-4">Persona</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#45484f]/10">
                {completedSessions.map((session) => {
                  const score = session.overallScore ?? 0;
                  return (
                    <tr
                      className="cursor-pointer transition-colors hover:bg-[#22262f]/30"
                      key={session.id}
                      onClick={() => void loadSession(session.id)}
                    >
                      <td className="px-6 py-4 font-bold text-[#ecedf6]">
                        {session.personaDetails?.objectionType ?? "Practice Session"}
                      </td>
                      <td className="px-6 py-4 text-[#a9abb3]">{session.personaDetails?.name ?? session.persona}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#22262f]">
                            <div className={`h-full ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
                          </div>
                          <span className={`font-bold ${scoreColor(score)}`}>{score}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#a9abb3]">{formatDuration(session.durationSeconds)}</td>
                      <td className="px-6 py-4 text-[#a9abb3]">{formatDate(session.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="font-medium text-[#74b1ff] underline hover:text-[#74b1ff]/80" type="button">
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
