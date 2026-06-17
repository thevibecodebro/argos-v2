"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ROLEPLAY_CATEGORY_LABELS,
  getRoleplaySessionVoice,
  type RoleplayPersona,
  type RoleplayMessage,
  type RoleplayCategory,
  type RoleplaySession,
} from "@/lib/roleplay/types";
import {
  ForgeChip,
  ForgeErrorState,
  ForgeIcon,
  ForgeStatCard,
  ForgeSegmentedTab,
  ForgeSegmentedTabs,
  ForgeStatusPanel,
} from "./forge";
import { OperationalPreviewDrawer } from "./operational-workspace";

type RoleplayPanelProps = {
  initialPersonas: RoleplayPersona[];
  initialSessions: RoleplaySession[];
  initialSessionId?: string | null;
};

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

function roleplayScoreTone(score: number | null | undefined) {
  if (typeof score !== "number") return "muted";
  if (score >= 80) return "cyan";
  if (score >= 65) return "gold";
  return "danger";
}

function parseRealtimeEvent(rawEvent: string): RoleplayMessage | null {
  try {
    const parsed = JSON.parse(rawEvent) as
      | {
          type?: string;
          transcript?: string;
          delta?: string;
          text?: string;
          item?: {
            role?: "assistant" | "user";
            content?: Array<{ transcript?: string; text?: string }>;
          };
        }
      | string;

    if (typeof parsed === "string") return null;

    const transcript =
      parsed.transcript ??
      parsed.text ??
      parsed.item?.content
        ?.map((p) => p.transcript ?? p.text)
        .filter(Boolean)
        .join(" ");

    if (!transcript?.trim()) return null;

    if (parsed.type?.includes("input_audio"))
      return { role: "user", content: transcript.trim() };
    if (parsed.type?.includes("response") || parsed.item?.role === "assistant")
      return { role: "assistant", content: transcript.trim() };

    return null;
  } catch {
    return null;
  }
}

function mergeSessionIntoList(
  sessions: RoleplaySession[],
  session: RoleplaySession,
) {
  const existingIndex = sessions.findIndex(
    (candidate) => candidate.id === session.id,
  );

  if (existingIndex === -1) {
    return [session, ...sessions];
  }

  return sessions.map((candidate) =>
    candidate.id === session.id ? session : candidate,
  );
}

function formatRoleplayCategoryLabel(slug: string | null) {
  if (!slug) {
    return "All";
  }

  return (
    ROLEPLAY_CATEGORY_LABELS[slug as RoleplayCategory] ??
    slug
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function getSessionLabel(session: RoleplaySession | null) {
  if (!session) {
    return "No active simulation";
  }

  if (session.origin === "generated_from_call") {
    return session.focusMode === "category"
      ? `Generated Roleplay: ${formatRoleplayCategoryLabel(session.focusCategorySlug)}`
      : "Generated Roleplay: All Focus Areas";
  }

  return `Live Simulation: ${session.personaDetails?.objectionType ?? "Objections Handling"}`;
}

function getSessionPersonaLabel(session: RoleplaySession) {
  return (
    session.personaDetails?.name ??
    (session.origin === "generated_from_call"
      ? "Anonymized buyer"
      : (session.persona ?? "Prospect"))
  );
}

function getInitialActiveSession(
  initialSessions: RoleplaySession[],
  initialSessionId: string | null | undefined,
) {
  if (initialSessionId) {
    const requested = initialSessions.find(
      (session) => session.id === initialSessionId,
    );

    if (requested) {
      return requested;
    }
  }

  return initialSessions[0] ?? null;
}

export function isRoleplayVoiceControlDisabled({
  activeSessionStatus,
  isStartingVoice,
  isVoiceActive,
}: {
  activeSessionStatus: RoleplaySession["status"] | undefined;
  isStartingVoice: boolean;
  isVoiceActive: boolean;
}) {
  if (isVoiceActive) {
    return false;
  }

  return (
    isStartingVoice ||
    !activeSessionStatus ||
    activeSessionStatus === "complete"
  );
}

export function RoleplayPanel({
  initialPersonas,
  initialSessions,
  initialSessionId,
}: RoleplayPanelProps) {
  const router = useRouter();
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeTranscriptAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const requestedSessionIdRef = useRef<string | null>(initialSessionId ?? null);
  const initialActiveSession = getInitialActiveSession(
    initialSessions,
    initialSessionId,
  );
  const activeSessionRef = useRef<RoleplaySession | null>(initialActiveSession);
  const pendingVoiceMessagesRef = useRef<RoleplayMessage[]>([]);
  const voicePersistenceQueueRef = useRef(Promise.resolve());

  const [personas] = useState(initialPersonas);
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSession, setActiveSession] = useState<RoleplaySession | null>(
    initialActiveSession,
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    initialActiveSession?.persona ?? initialPersonas[0]?.id ?? "",
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [isStartingVoice, setIsStartingVoice] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [speakingLine, setSpeakingLine] = useState<string | null>(null);
  const displayedTranscript = activeSession?.transcript ?? [];

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    const requestedSessionId =
      initialSessionId ?? requestedSessionIdRef.current;

    if (!requestedSessionId || requestedSessionId === activeSession?.id) {
      return;
    }

    const existing = sessions.find(
      (session) => session.id === requestedSessionId,
    );

    if (existing) {
      setActiveSession(existing);

      if (existing.persona) {
        setSelectedPersonaId(existing.persona);
      }

      requestedSessionIdRef.current = requestedSessionId;
      return;
    }

    requestedSessionIdRef.current = requestedSessionId;
    void loadSession(requestedSessionId);
  }, [activeSession?.id, initialSessionId, sessions]);

  function stopTranscriptAudioPlayback() {
    activeTranscriptAudioRef.current?.pause();
    activeTranscriptAudioRef.current = null;

    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }

    setSpeakingLine(null);
  }

  function stopActiveRoleplayAudio({
    announce = true,
  }: { announce?: boolean } = {}) {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    remoteAudioRef.current?.pause();
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    stopTranscriptAudioPlayback();
    setIsVoiceActive(false);
    setIsStartingVoice(false);

    if (announce) {
      setVoiceStatus("Voice practice stopped.");
    } else {
      setVoiceStatus(null);
    }
  }

  function cleanupVoiceSession() {
    stopActiveRoleplayAudio({ announce: false });
  }

  function commitSession(session: RoleplaySession) {
    activeSessionRef.current = session;
    setActiveSession(session);
    setSessions((cur) => mergeSessionIntoList(cur, session));
  }

  function removeFirstPendingVoiceMessage(message: RoleplayMessage) {
    const index = pendingVoiceMessagesRef.current.findIndex(
      (candidate) =>
        candidate.role === message.role &&
        candidate.content === message.content,
    );

    if (index === -1) {
      return;
    }

    pendingVoiceMessagesRef.current = pendingVoiceMessagesRef.current.filter(
      (_candidate, candidateIndex) => candidateIndex !== index,
    );
  }

  function isDuplicateVoiceMessage(message: RoleplayMessage) {
    const content = message.content.trim();
    const savedLastMessage = activeSessionRef.current?.transcript.at(-1);
    const queuedLastMessage = pendingVoiceMessagesRef.current.at(-1);

    return (
      (savedLastMessage?.role === message.role &&
        savedLastMessage.content === content) ||
      (queuedLastMessage?.role === message.role &&
        queuedLastMessage.content === content)
    );
  }

  function queueVoiceTranscriptPersistence(
    sessionId: string,
    message: RoleplayMessage,
  ) {
    const content = message.content.trim();

    if (!content || isDuplicateVoiceMessage(message)) {
      return;
    }

    const transcriptMessage = {
      role: message.role,
      content,
    } satisfies RoleplayMessage;
    pendingVoiceMessagesRef.current = [
      ...pendingVoiceMessagesRef.current,
      transcriptMessage,
    ];

    voicePersistenceQueueRef.current = voicePersistenceQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const res = await fetch(
          `/api/roleplay/sessions/${sessionId}/transcript`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transcriptMessage),
          },
        );
        const payload = (await res.json().catch(() => null)) as
          | (RoleplaySession & { error?: string })
          | null;
        removeFirstPendingVoiceMessage(transcriptMessage);

        if (!res.ok || !payload) {
          throw new Error(
            payload?.error ?? "Unable to save live voice transcript.",
          );
        }

        if (activeSessionRef.current?.id === sessionId) {
          commitSession(payload);
          return;
        }

        setSessions((cur) => mergeSessionIntoList(cur, payload));
      })
      .catch((err) => {
        removeFirstPendingVoiceMessage(transcriptMessage);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to save live voice transcript.",
        );
      });
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
    if (activeSession.status === "complete") return;
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      const remoteStream = new MediaStream();
      if (remoteAudioRef.current)
        remoteAudioRef.current.srcObject = remoteStream;
      pc.ontrack = (e) =>
        e.streams.forEach((s) =>
          s.getTracks().forEach((t) => remoteStream.addTrack(t)),
        );

      const dc = pc.createDataChannel("argos-realtime-events");
      dataChannelRef.current = dc;
      dc.onopen = () => {
        setVoiceStatus("Voice practice live.");
        setIsVoiceActive(true);
        setIsStartingVoice(false);
      };
      dc.onmessage = (e) => {
        const msg = parseRealtimeEvent(e.data);
        if (msg) {
          queueVoiceTranscriptPersistence(activeSession.id, msg);
        }
      };
      dc.onerror = () =>
        setError(
          "Voice mode lost the realtime event channel. Stop and restart.",
        );

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);

      const res = await fetch(
        `/api/roleplay/sessions/${activeSession.id}/realtime`,
        {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? offer.sdp ?? "",
        },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Unable to start voice practice.");
      }

      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    } catch (err) {
      cleanupVoiceSession();
      const msg =
        err instanceof Error
          ? err.message.includes("Permission")
            ? "Microphone access was denied."
            : err.message
          : "Unable to start voice practice.";
      setVoiceStatus(null);
      setError(msg);
    }
  }

  function stopVoicePractice() {
    stopActiveRoleplayAudio();
  }

  async function flushPendingVoiceTranscriptPersistence() {
    await voicePersistenceQueueRef.current.catch(() => undefined);
  }

  async function playTranscriptLine(text: string) {
    if (!text.trim()) return;
    stopTranscriptAudioPlayback();
    setError(null);
    setSpeakingLine(text);
    try {
      const res = await fetch("/api/roleplay/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: "Speak like a calm, direct buyer in a sales roleplay.",
          text,
          voice: activeSession
            ? getRoleplaySessionVoice(activeSession)
            : undefined,
        }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(p?.error ?? "Unable to synthesize voice.");
      }
      const blob = await res.blob();
      if (activeAudioUrlRef.current)
        URL.revokeObjectURL(activeAudioUrlRef.current);
      const url = URL.createObjectURL(blob);
      activeAudioUrlRef.current = url;
      const audio = new Audio(url);
      activeTranscriptAudioRef.current = audio;
      await audio.play();
      audio.addEventListener(
        "ended",
        () => {
          if (activeTranscriptAudioRef.current === audio) {
            activeTranscriptAudioRef.current = null;
          }
          if (activeAudioUrlRef.current === url) {
            URL.revokeObjectURL(activeAudioUrlRef.current);
            activeAudioUrlRef.current = null;
          }
          setSpeakingLine(null);
        },
        { once: true },
      );
    } catch (err) {
      setSpeakingLine(null);
      setError(
        err instanceof Error ? err.message : "Unable to synthesize voice.",
      );
    }
  }

  async function loadSession(sessionId: string) {
    setError(null);
    setIsMutating(true);
    const res = await fetch(`/api/roleplay/sessions/${sessionId}`, {
      cache: "no-store",
    });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Unable to load session.");
      setIsMutating(false);
      return;
    }
    commitSession(payload);
    if (payload.persona) {
      setSelectedPersonaId(payload.persona);
    }
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
    if (!res.ok) {
      setError(payload.error ?? "Unable to start session.");
      setIsMutating(false);
      return;
    }
    commitSession(payload);
    setDraft("");
    setIsMutating(false);
    startTransition(() => router.refresh());
  }

  async function sendMessage() {
    if (!activeSession || !draft.trim()) return;
    setError(null);
    setIsMutating(true);
    const res = await fetch(
      `/api/roleplay/sessions/${activeSession.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      },
    );
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Unable to send message.");
      setIsMutating(false);
      return;
    }
    commitSession(payload);
    setDraft("");
    setIsMutating(false);
    setTimeout(
      () => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  async function completeSession() {
    if (!activeSession) return;
    const sessionId = activeSession.id;
    setError(null);
    setIsMutating(true);
    stopActiveRoleplayAudio({ announce: false });
    await flushPendingVoiceTranscriptPersistence();
    const res = await fetch(`/api/roleplay/sessions/${sessionId}/complete`, {
      method: "POST",
    });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Unable to score session.");
      setIsMutating(false);
      return;
    }
    commitSession(payload);
    setIsMutating(false);
    startTransition(() => router.refresh());
  }

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) ??
    activeSession?.personaDetails ??
    null;
  const activeScorecard = activeSession?.scorecard ?? null;
  const activeSessionWithScorecard =
    activeSession && activeScorecard ? activeSession : null;
  const isVoiceControlDisabled = isRoleplayVoiceControlDisabled({
    activeSessionStatus: activeSession?.status,
    isStartingVoice,
    isVoiceActive,
  });
  const generatedActiveSession =
    activeSession?.origin === "generated_from_call" ? activeSession : null;

  return (
    <>
      <div className="mb-4 lg:hidden" data-roleplay-mobile-sections="true">
        <ForgeSegmentedTabs
          className="overflow-x-auto"
          label="Roleplay sections"
        >
          <ForgeSegmentedTab href="#roleplay-scenario" icon="tactic">
            Scenario
          </ForgeSegmentedTab>
          <ForgeSegmentedTab href="#roleplay-practice" icon="mic">
            Practice
          </ForgeSegmentedTab>
          <ForgeSegmentedTab href="#roleplay-score" icon="query_stats">
            Score
          </ForgeSegmentedTab>
        </ForgeSegmentedTabs>
      </div>

      <div
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
        data-roleplay-workspace="simple-practice"
      >
        <main className="min-w-0 space-y-3" data-forge-workspace-main="true">
          <section
            aria-label="Scenario"
            className="scroll-mt-24 rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4%,transparent)]"
            data-roleplay-scenario-picker=""
            id="roleplay-scenario"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[var(--forge-gold)]">
                  Scenario
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
                  Target persona
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--forge-muted)]">
                  Choose one buyer profile, then start a focused practice
                  session.
                </p>
              </div>
              <button
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--forge-gold)] px-4 py-2 text-xs font-bold text-[var(--forge-bg)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                data-roleplay-primary-action="start-simulation"
                disabled={!selectedPersonaId || isMutating}
                onClick={() => void createSession()}
                type="button"
              >
                <ForgeIcon name="insights" size={16} />
                {isMutating ? "Starting..." : "Start simulation"}
              </button>
            </div>

            <div
              className="mt-3 divide-y divide-[var(--forge-border)] overflow-hidden rounded-lg border border-[var(--forge-border)]"
              data-roleplay-scenario-list="true"
            >
              {personas.map((persona) => {
                const isSelected = persona.id === selectedPersonaId;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--forge-gold)_9%,transparent)] text-[var(--forge-text)]"
                        : "bg-[color-mix(in_srgb,var(--forge-shadow)_34%,transparent)] hover:bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)]"
                    }`}
                    key={persona.id}
                    onClick={() => setSelectedPersonaId(persona.id)}
                    type="button"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--forge-border)] text-sm font-semibold text-[var(--forge-muted)]">
                      {persona.avatarInitials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--forge-text)]">
                        {persona.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--forge-muted)]">
                        {persona.role}, {persona.company}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--forge-muted)]">
                        {persona.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="roleplay-practice-title"
            className="min-w-0 scroll-mt-24"
            data-roleplay-simulation-stage=""
            id="roleplay-practice"
          >
            <h2 className="sr-only" id="roleplay-practice-title">
              Practice
            </h2>
            <div className="mb-4 flex flex-col gap-3 rounded-xl bg-[var(--forge-surface)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <div className="relative">
                  {activeSession?.status === "active" && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[var(--forge-danger)]" />
                  )}
                  <ForgeIcon
                    className="text-[var(--forge-gold)]"
                    name="psychology"
                    size={20}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--forge-text)]">
                      {getSessionLabel(activeSession)}
                    </span>
                    {generatedActiveSession && (
                      <ForgeChip tone="gold">Generated from call</ForgeChip>
                    )}
                  </div>
                  {generatedActiveSession?.scenarioBrief && (
                    <p className="text-xs text-[var(--forge-muted)]">
                      {generatedActiveSession.scenarioBrief}
                    </p>
                  )}
                </div>
              </div>
              <div
                className="flex w-full flex-col gap-2 rounded-lg bg-[var(--forge-surface-3)] p-2 sm:w-auto"
                data-roleplay-mode-control="true"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    aria-label={
                      isVoiceActive
                        ? "Stop voice practice"
                        : "Start voice practice"
                    }
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      isVoiceActive
                        ? "bg-[var(--forge-danger)]/20 text-[var(--forge-danger)]"
                        : "bg-[var(--forge-gold)] text-[var(--forge-bg)]"
                    }`}
                    disabled={isVoiceControlDisabled}
                    onClick={() =>
                      isVoiceActive
                        ? stopVoicePractice()
                        : void startVoicePractice()
                    }
                    title={
                      isVoiceActive
                        ? "Stop voice practice"
                        : "Start voice practice"
                    }
                    type="button"
                  >
                    <ForgeIcon name="power" size={14} />
                    {isStartingVoice
                      ? "Starting…"
                      : isVoiceActive
                        ? "Stop voice"
                        : "Start voice"}
                  </button>
                </div>
              </div>
            </div>

            {generatedActiveSession?.scenarioSummary && (
              <div className="mb-4 rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_52%,transparent)] px-4 py-4">
                <p className="text-xs font-semibold text-[var(--forge-muted)]">
                  Generated from call · Focus:{" "}
                  {generatedActiveSession.focusMode === "all"
                    ? "All"
                    : formatRoleplayCategoryLabel(
                        generatedActiveSession.focusCategorySlug,
                      )}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--forge-text)]">
                  {generatedActiveSession.scenarioSummary}
                </p>
              </div>
            )}

            {/* Transcript */}
            <div
              className="mb-5 flex min-h-[320px] max-h-[min(64vh,620px)] flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_52%,transparent)] p-4"
              aria-label="Roleplay transcript"
              aria-live="polite"
              aria-relevant="additions text"
              data-roleplay-transcript="simple-log"
              role="log"
              tabIndex={0}
            >
              {activeSession ? (
                displayedTranscript.length > 0 ? (
                  displayedTranscript.map((msg, i) => (
                    <div
                      className={`flex max-w-full items-start gap-3 sm:max-w-[85%] sm:gap-4 ${msg.role === "user" ? "self-end flex-row-reverse" : ""}`}
                      key={`${msg.role}-${i}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                          msg.role === "user"
                            ? "bg-[var(--forge-gold)]/20"
                            : "bg-[var(--forge-surface-3)]"
                        }`}
                      >
                        <ForgeIcon
                          className="text-[var(--forge-gold)]"
                          name={msg.role === "user" ? "person" : "psychology"}
                          size={14}
                        />
                      </div>
                      <div
                        className={`rounded-2xl border p-4 ${
                          msg.role === "user"
                            ? "rounded-tr-none border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/10"
                            : "rounded-tl-none border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface-3)]/60"
                        }`}
                      >
                        <p className="text-sm leading-relaxed text-[var(--forge-text)]">
                          {msg.content}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[var(--forge-muted)]">
                            {msg.role === "user"
                              ? "You"
                              : getSessionPersonaLabel(activeSession)}
                          </span>
                          {msg.role === "assistant" && (
                            <button
                              className="text-xs font-semibold text-[var(--forge-gold)]"
                              onClick={() =>
                                void playTranscriptLine(msg.content)
                              }
                              type="button"
                            >
                              {speakingLine === msg.content
                                ? "Playing..."
                                : "Listen"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1 items-center justify-center text-center">
                    <p className="text-sm text-[var(--forge-muted)]">
                      Session started — the prospect is waiting for you.
                    </p>
                  </div>
                )
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-3)] text-[var(--forge-muted)]">
                    <ForgeIcon name="psychology" size={26} />
                  </div>
                  <p className=" text-lg font-bold text-[var(--forge-text)]">
                    No active simulation
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-[var(--forge-muted)]">
                    Choose a persona in the scenario picker, then start a
                    simulation.
                  </p>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {error ? (
              <ForgeErrorState
                className="mb-4"
                description={error}
                title="Roleplay update failed"
              />
            ) : null}
            {voiceStatus ? (
              <ForgeStatusPanel
                announce="polite"
                className="mb-4"
                description={voiceStatus}
                icon="mic"
                title="Voice practice status"
                tone="gold"
              />
            ) : null}

            {/* Input */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <label
                  className="text-xs font-semibold text-[var(--forge-muted)]"
                  htmlFor="roleplay-response"
                >
                  Roleplay response
                </label>
                <div className="relative">
                  <textarea
                    className="h-20 w-full resize-none rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-depth)] p-4 pr-12 text-sm text-[var(--forge-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--forge-text)_40%,transparent)] focus:border-[var(--forge-gold)]/50 focus:ring-1 focus:ring-[var(--forge-gold)]/20 disabled:opacity-40"
                    disabled={
                      !activeSession ||
                      activeSession.status === "complete" ||
                      isMutating
                    }
                    id="roleplay-response"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Type your response or click the mic to speak..."
                    value={draft}
                  />
                  <button
                    aria-label="Send response"
                    className="absolute bottom-3 right-3 rounded-lg p-1 text-[var(--forge-gold)] transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:text-[var(--forge-muted)] disabled:opacity-35 disabled:hover:scale-100"
                    disabled={
                      !activeSession ||
                      !draft.trim() ||
                      activeSession.status === "complete" ||
                      isMutating
                    }
                    onClick={() => void sendMessage()}
                    title="Send response"
                    type="button"
                  >
                    <ForgeIcon name="send" size={18} />
                  </button>
                </div>
              </div>
              <button
                aria-label="End and score current session"
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-5 font-extrabold text-[var(--forge-bg)] shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-20 sm:w-auto sm:min-w-[7.5rem] sm:flex-col sm:gap-1 sm:px-6"
                disabled={
                  !activeSession ||
                  activeSession.status === "complete" ||
                  isMutating
                }
                onClick={() => void completeSession()}
                title="End and score current session"
                type="button"
              >
                <ForgeIcon name="insights" size={24} />
                <span className="whitespace-nowrap text-[10px] uppercase tracking-normal">
                  End &amp; Score
                </span>
              </button>
            </div>

            <audio
              autoPlay
              className="hidden"
              playsInline
              ref={remoteAudioRef}
            />
          </section>
        </main>

        <OperationalPreviewDrawer
          description="Current scoring, readiness, and post-session guidance."
          eyebrow="Simulation score"
          title="Session Scorecard"
          data-roleplay-score-drawer=""
          id="roleplay-score"
        >
          <div className="space-y-5">
            {activeSessionWithScorecard ? (
              <div className="space-y-4">
                <ForgeStatCard
                  className="px-4 py-4"
                  description={activeScorecard?.summary}
                  label="Overall score"
                  tone={roleplayScoreTone(
                    activeSessionWithScorecard.overallScore,
                  )}
                  value={activeSessionWithScorecard.overallScore ?? "—"}
                />
                {activeScorecard?.rubricName ? (
                  <ForgeChip tone="gold">
                    {activeScorecard.rubricName}
                    {activeScorecard.rubricVersion != null
                      ? ` · v${activeScorecard.rubricVersion}`
                      : ""}
                  </ForgeChip>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <ForgeStatCard
                    className="px-4 py-3"
                    valueSize="compact"
                    label="Confidence"
                    tone="muted"
                    value={activeScorecard?.confidence ?? "—"}
                  />
                  <ForgeStatCard
                    className="px-4 py-3"
                    valueSize="compact"
                    label="Stage"
                    tone="gold"
                    value={
                      activeScorecard
                        ? labelCallStage(activeScorecard.callStageReached)
                        : "—"
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(activeScorecard?.categoryScores ?? {}).map(
                    ([cat, val]) => (
                      <ForgeStatCard
                        className="px-4 py-3"
                        key={cat}
                        label={
                          activeScorecard?.categoryLabels?.[cat] ??
                          ROLEPLAY_CATEGORY_LABELS[
                            cat as keyof typeof ROLEPLAY_CATEGORY_LABELS
                          ] ??
                          cat
                        }
                        tone={roleplayScoreTone(val)}
                        value={val ?? "—"}
                      />
                    ),
                  )}
                </div>

                <div className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4">
                  <p className="text-xs font-semibold text-[var(--forge-success)]">
                    Strengths
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--forge-text)]">
                    {(activeScorecard?.strengths ?? []).map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4">
                  <p className="text-xs font-semibold text-[var(--forge-ember)]">
                    Improve
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--forge-text)]">
                    {(activeScorecard?.improvements ?? []).map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <ForgeStatusPanel
                description={
                  activeSession
                    ? "Complete the current roleplay to generate your performance analytics and improvement tips."
                    : "Start a simulation from the scenario picker. Scoring, readiness, and next actions appear here."
                }
                icon="query_stats"
                title={
                  activeSession
                    ? "Waiting for session completion..."
                    : "Select a scenario to begin scoring."
                }
                tone="muted"
              />
            )}

            <ForgeStatusPanel
              description="When handling time-sensitive objections, acknowledge the constraint immediately before proposing a phased solution. It builds trust faster."
              icon="lightbulb"
              title="Practice tip"
              tone="cyan"
            />
          </div>
        </OperationalPreviewDrawer>
      </div>
    </>
  );
}
