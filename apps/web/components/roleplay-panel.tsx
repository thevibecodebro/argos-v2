"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ROLEPLAY_CATEGORY_LABELS,
  type RoleplayPersona,
  type RoleplayMessage,
  type RoleplaySession,
} from "@/lib/roleplay/service";

type RoleplayPanelProps = {
  initialPersonas: RoleplayPersona[];
  initialSessions: RoleplaySession[];
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function labelCallStage(value: string | undefined) {
  switch (value) {
    case "commitment":
      return "Commitment";
    case "objection_handling":
      return "Objection Handling";
    case "solution":
      return "Solution";
    case "discovery":
      return "Discovery";
    default:
      return "Opening";
  }
}

function parseRealtimeEvent(rawEvent: string): RoleplayMessage | null {
  try {
    const parsed = JSON.parse(rawEvent) as
      | {
          type?: string;
          transcript?: string;
          delta?: string;
          text?: string;
          item?: { role?: "assistant" | "user"; content?: Array<{ transcript?: string; text?: string }> };
        }
      | string;

    if (typeof parsed === "string") {
      return null;
    }

    const transcript =
      parsed.transcript ??
      parsed.text ??
      parsed.item?.content?.map((part) => part.transcript ?? part.text).filter(Boolean).join(" ");

    if (!transcript?.trim()) {
      return null;
    }

    if (parsed.type?.includes("input_audio")) {
      return { role: "user", content: transcript.trim() };
    }

    if (parsed.type?.includes("response") || parsed.item?.role === "assistant") {
      return { role: "assistant", content: transcript.trim() };
    }

    return null;
  } catch {
    return null;
  }
}

export function RoleplayPanel({
  initialPersonas,
  initialSessions,
}: RoleplayPanelProps) {
  const router = useRouter();
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
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
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setIsVoiceActive(false);
    setIsStartingVoice(false);
  }

  async function waitForIceGatheringComplete(peerConnection: RTCPeerConnection) {
    if (peerConnection.iceGatheringState === "complete") {
      return;
    }

    await new Promise<void>((resolve) => {
      const handler = () => {
        if (peerConnection.iceGatheringState === "complete") {
          peerConnection.removeEventListener("icegatheringstatechange", handler);
          resolve();
        }
      };
      peerConnection.addEventListener("icegatheringstatechange", handler);
    });
  }

  async function startVoicePractice() {
    if (!activeSession) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof RTCPeerConnection === "undefined"
    ) {
      setError("This browser does not support live voice practice.");
      return;
    }

    setError(null);
    setVoiceStatus("Requesting microphone access…");
    setIsStartingVoice(true);
    setLiveVoiceTranscript([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaStreamRef.current = stream;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      const remoteStream = new MediaStream();
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }

      peerConnection.ontrack = (event) => {
        event.streams.forEach((remote) => {
          remote.getTracks().forEach((track) => remoteStream.addTrack(track));
        });
      };

      const dataChannel = peerConnection.createDataChannel("argos-realtime-events");
      dataChannelRef.current = dataChannel;
      dataChannel.onopen = () => {
        setVoiceStatus("Voice practice live.");
        setIsVoiceActive(true);
        setIsStartingVoice(false);
      };
      dataChannel.onmessage = (event) => {
        const transcriptEvent = parseRealtimeEvent(event.data);

        if (!transcriptEvent) {
          return;
        }

        setLiveVoiceTranscript((current) => [...current, transcriptEvent]);
      };
      dataChannel.onerror = () => {
        setError("Voice mode lost the realtime event channel. Stop and restart the session.");
      };

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await waitForIceGatheringComplete(peerConnection);

      const response = await fetch(`/api/roleplay/sessions/${activeSession.id}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: peerConnection.localDescription?.sdp ?? offer.sdp ?? "",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to start voice practice.");
      }

      const answerSdp = await response.text();
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
    } catch (voiceError) {
      cleanupVoiceSession();
      const message =
        voiceError instanceof Error
          ? voiceError.message.includes("Permission")
            ? "Microphone access was denied. Allow microphone access and try again."
            : voiceError.message
          : "Unable to start voice practice.";
      setVoiceStatus(null);
      setError(message);
    }
  }

  function stopVoicePractice() {
    cleanupVoiceSession();
    setVoiceStatus("Voice practice stopped.");
  }

  async function playTranscriptLine(text: string) {
    if (!text.trim()) {
      return;
    }

    setError(null);
    setSpeakingLine(text);

    try {
      const response = await fetch("/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: "Speak like a calm, direct buyer in a sales roleplay.",
          text,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to synthesize voice playback.");
      }

      const audioBlob = await response.blob();
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      activeAudioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      await audio.play();
      audio.addEventListener(
        "ended",
        () => {
          if (activeAudioUrlRef.current) {
            URL.revokeObjectURL(activeAudioUrlRef.current);
            activeAudioUrlRef.current = null;
          }
          setSpeakingLine(null);
        },
        { once: true },
      );
    } catch (playbackError) {
      setSpeakingLine(null);
      setError(
        playbackError instanceof Error ? playbackError.message : "Unable to synthesize voice playback.",
      );
    }
  }

  async function loadSession(sessionId: string) {
    setError(null);
    setIsMutating(true);

    const response = await fetch(`/api/roleplay/sessions/${sessionId}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as RoleplaySession & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to load the roleplay session.");
      setIsMutating(false);
      return;
    }

    setActiveSession(payload);
    setSelectedPersonaId(payload.persona ?? selectedPersonaId);
    setIsMutating(false);
  }

  async function createSession() {
    if (!selectedPersonaId) {
      return;
    }

    setError(null);
    setIsMutating(true);

    const response = await fetch("/api/roleplay/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: selectedPersonaId }),
    });
    const payload = (await response.json()) as RoleplaySession & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to start the roleplay session.");
      setIsMutating(false);
      return;
    }

    setSessions((current) => [payload, ...current.filter((session) => session.id !== payload.id)]);
    setActiveSession(payload);
    setDraft("");
    setIsMutating(false);
    startTransition(() => router.refresh());
  }

  async function sendMessage() {
    if (!activeSession || !draft.trim()) {
      return;
    }

    setError(null);
    setIsMutating(true);

    const response = await fetch(`/api/roleplay/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.trim() }),
    });
    const payload = (await response.json()) as RoleplaySession & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to send your message.");
      setIsMutating(false);
      return;
    }

    setActiveSession(payload);
    setSessions((current) => current.map((session) => (session.id === payload.id ? payload : session)));
    setDraft("");
    setIsMutating(false);
  }

  async function completeSession() {
    if (!activeSession) {
      return;
    }

    setError(null);
    setIsMutating(true);

    const response = await fetch(`/api/roleplay/sessions/${activeSession.id}/complete`, {
      method: "POST",
    });
    const payload = (await response.json()) as RoleplaySession & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to score the roleplay session.");
      setIsMutating(false);
      return;
    }

    setActiveSession(payload);
    setSessions((current) => current.map((session) => (session.id === payload.id ? payload : session)));
    setIsMutating(false);
    startTransition(() => router.refresh());
  }

  const selectedPersona =
    personas.find((persona) => persona.id === selectedPersonaId) ??
    activeSession?.personaDetails ??
    null;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.55fr_1fr]">
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Personas</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Choose a buyer profile</h3>
          </div>
          <button
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            disabled={!selectedPersonaId || isMutating}
            onClick={() => {
              void createSession();
            }}
            type="button"
          >
            {isMutating ? "Working..." : "Start session"}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {personas.map((persona) => {
            const isSelected = persona.id === selectedPersonaId;

            return (
              <button
                className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                  isSelected
                    ? "border-blue-500/35 bg-blue-600/10"
                    : "border-slate-800/70 bg-slate-950/25 hover:border-slate-700"
                }`}
                key={persona.id}
                onClick={() => setSelectedPersonaId(persona.id)}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/15 text-sm font-semibold text-blue-200">
                    {persona.avatarInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{persona.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {persona.role} · {persona.company}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{persona.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-700/70 px-2 py-1">
                        {persona.industry}
                      </span>
                      <span className="rounded-full border border-slate-700/70 px-2 py-1 capitalize">
                        {persona.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live Simulation</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {activeSession?.personaDetails?.name ?? selectedPersona?.name ?? "Start a session"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {activeSession?.personaDetails?.role ?? selectedPersona?.role ?? "Choose a persona"} ·{" "}
              {activeSession?.personaDetails?.company ?? selectedPersona?.company ?? "Argos roleplay"}
            </p>
          </div>
          {activeSession ? (
            <button
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              disabled={activeSession.status === "complete" || isMutating}
              onClick={() => {
                void completeSession();
              }}
              type="button"
            >
              {activeSession.status === "complete" ? "Scored" : "Score session"}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-[1.2rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 min-h-[26rem] space-y-3 rounded-[1.5rem] border border-slate-800/70 bg-slate-950/20 p-4">
          {activeSession ? (
            displayedTranscript.map((message, index) => (
              <div
                className={`rounded-[1.2rem] px-4 py-3 ${
                  message.role === "assistant"
                    ? "mr-8 border border-slate-800/70 bg-slate-950/35"
                    : "ml-8 border border-blue-500/20 bg-blue-600/10"
                }`}
                key={`${message.role}-${index}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {message.role === "assistant" ? activeSession.personaDetails?.name ?? "Prospect" : "You"}
                  </p>
                  {message.role === "assistant" ? (
                    <button
                      className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300 transition hover:text-blue-200"
                      onClick={() => {
                        void playTranscriptLine(message.content);
                      }}
                      type="button"
                    >
                      {speakingLine === message.content ? "Playing..." : "Listen"}
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-200">{message.content}</p>
              </div>
            ))
          ) : (
            <div className="flex h-full min-h-[22rem] items-center justify-center rounded-[1.2rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-6 text-center">
              <div>
                <p className="text-lg font-medium text-slate-200">Start a roleplay to practice the hard conversations</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Choose a persona on the left, launch a session, and the buyer will respond based on the objection style from the archived simulator.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Voice Mode</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Use OpenAI realtime voice to practice objections live, then disclose that the buyer voice is AI-generated.
              </p>
            </div>
            <button
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                isVoiceActive
                  ? "border border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
              disabled={isStartingVoice || !activeSession}
              onClick={() => {
                if (isVoiceActive) {
                  stopVoicePractice();
                  return;
                }

                void startVoicePractice();
              }}
              type="button"
            >
              {isStartingVoice
                ? "Starting..."
                : isVoiceActive
                  ? "Stop voice practice"
                  : "Start voice practice"}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            AI-generated voice disclosure: tell buyers and trainees when they are hearing an AI-generated voice instead of a human speaker.
          </p>
          {voiceStatus ? <p className="mt-3 text-sm text-blue-200">{voiceStatus}</p> : null}
          <audio autoPlay className="hidden" playsInline ref={remoteAudioRef} />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <textarea
            className="min-h-28 flex-1 rounded-[1.2rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            disabled={!activeSession || activeSession.status === "complete" || isMutating}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              activeSession
                ? "Respond as the rep. Land pain, proof, and a clear next step."
                : "Start a session to begin the conversation."
            }
            value={draft}
          />
          <button
            className="rounded-[1.2rem] bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 sm:self-end"
            disabled={!activeSession || !draft.trim() || activeSession.status === "complete" || isMutating}
            onClick={() => {
              void sendMessage();
            }}
            type="button"
          >
            Send response
          </button>
        </div>
      </section>

      <section className="space-y-5">
        <div className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Session Scorecard</p>
          {activeSession?.scorecard ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
                <p className="text-3xl font-semibold text-white">{activeSession.overallScore ?? "—"}</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">{activeSession.scorecard.summary}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Confidence</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-white">
                    {activeSession.scorecard.confidence}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Call Stage</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {labelCallStage(activeSession.scorecard.callStageReached)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(activeSession.scorecard.categoryScores).map(([category, value]) => (
                  <div
                    className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4"
                    key={category}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {ROLEPLAY_CATEGORY_LABELS[category as keyof typeof ROLEPLAY_CATEGORY_LABELS]}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{value ?? "—"}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Strengths</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {activeSession.scorecard.strengths.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Areas to Improve</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {activeSession.scorecard.improvements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Recommended Drills</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {activeSession.scorecard.recommendedDrills.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                {activeSession.scorecard.moments.map((moment) => (
                  <div
                    className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/25 px-4 py-4"
                    key={`${moment.category}-${moment.observation}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {moment.severity}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {ROLEPLAY_CATEGORY_LABELS[moment.category]}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{moment.observation}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-500">{moment.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-4 py-6 text-sm leading-7 text-slate-500">
              Finish a session to generate a coaching scorecard with strengths, improvements, and recommended drills.
            </div>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent Sessions</p>
          <div className="mt-4 space-y-3">
            {sessions.length ? (
              sessions.map((session) => (
                <button
                  className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    activeSession?.id === session.id
                      ? "border-blue-500/35 bg-blue-600/10"
                      : "border-slate-800/70 bg-slate-950/25 hover:border-slate-700"
                  }`}
                  key={session.id}
                  onClick={() => {
                    void loadSession(session.id);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {session.personaDetails?.name ?? session.persona ?? "Saved session"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {session.status} · {session.difficulty ?? "practice"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{session.overallScore ?? "—"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatTimestamp(session.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-4 py-6 text-sm leading-7 text-slate-500">
                No roleplay sessions yet. Start with a price objection or stalling persona and practice the next-step close.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
