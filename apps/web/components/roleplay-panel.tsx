"use client";

import { VoiceLifecycle } from "@/lib/roleplay/voice-lifecycle";
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
  ForgeStatusPanel,
} from "./forge";
import styles from "./roleplay-practice.module.css";
import { VoiceBalanceCard } from "./billing/voice-balance-card";

type RoleplayPanelProps = {
  initialPersonas: RoleplayPersona[];
  initialSessions: RoleplaySession[];
  initialSessionId?: string | null;
  voiceEnabled: boolean;
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
    return "No active roleplay";
  }

  const statusLabel = session.status === "complete"
    ? "Completed practice"
    : session.status === "evaluating"
      ? "Scoring practice"
      : null;
  if (session.origin === "generated_from_call") {
    const focus = session.focusMode === "category"
      ? formatRoleplayCategoryLabel(session.focusCategorySlug)
      : "All Focus Areas";
    return `${statusLabel ?? "Generated Roleplay"}: ${focus}`;
  }

  return `${statusLabel ?? "Live Simulation"}: ${session.personaDetails?.objectionType ?? "Objections Handling"}`;
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

export function getRoleplaySessionSelection({
  lastConsumedSessionId,
  requestedSessionId,
  activeSessionId,
  sessions,
}: {
  lastConsumedSessionId: string | null | undefined;
  requestedSessionId: string | null | undefined;
  activeSessionId: string | undefined;
  sessions: RoleplaySession[];
}): { type: "none" } | { type: "select"; session: RoleplaySession } | { type: "load"; sessionId: string } {
  const requestedId = requestedSessionId ?? null;
  if (lastConsumedSessionId === requestedId || !requestedId || requestedId === activeSessionId) {
    return { type: "none" };
  }
  const session = sessions.find((candidate) => candidate.id === requestedId);
  return session ? { type: "select", session } : { type: "load", sessionId: requestedId };
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
  voiceEnabled,
}: RoleplayPanelProps) {
  const router = useRouter();
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeTranscriptAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const playbackGenerationRef = useRef(0);
  const voiceLifecycleRef = useRef<VoiceLifecycle | null>(null);
  const voiceStopPromiseRef = useRef(Promise.resolve());
  if (!voiceLifecycleRef.current) {
    voiceLifecycleRef.current = new VoiceLifecycle(async (run) => {
      const stopped = fetch(`/api/roleplay/sessions/${run.sessionId}/voice`, {
        method: "POST", keepalive: true, signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", segmentId: run.segmentId }),
      }).then((response) => { if (!response.ok) throw new Error("Unable to settle voice usage. End & Score retries settlement."); });
      voiceStopPromiseRef.current = stopped.catch(() => undefined);
      try { await stopped; } catch (error) {
        if (mountedRef.current) setError(error instanceof Error ? error.message : "Unable to stop voice session.");
      }
    });
  }
  const requestedSessionIdRef = useRef<string | null | undefined>(undefined);
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
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const displayedTranscript = activeSession?.transcript ?? [];

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    // Route selection is consumed once per route change. Local updates (including
    // a new practice session) must not reapply an earlier review request.
    const selection = getRoleplaySessionSelection({
      lastConsumedSessionId: requestedSessionIdRef.current,
      requestedSessionId: initialSessionId,
      activeSessionId: activeSession?.id,
      sessions,
    });
    requestedSessionIdRef.current = initialSessionId ?? null;
    if (selection.type === "select") {
      stopActiveRoleplayAudio({ announce: false });
      setActiveSession(selection.session);
      if (selection.session.persona) setSelectedPersonaId(selection.session.persona);
    } else if (selection.type === "load") {
      void loadSession(selection.sessionId);
    }
  }, [activeSession?.id, initialSessionId, sessions]);

  useEffect(() => {
    mountedRef.current = true;
    const onPageHide = () => stopActiveRoleplayAudio({ announce: false });
    window.addEventListener("pagehide", onPageHide);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("pagehide", onPageHide);
      stopActiveRoleplayAudio({ announce: false });
    };
  }, []);

  function stopTranscriptAudioPlayback() {
    playbackGenerationRef.current += 1;
    activeTranscriptAudioRef.current?.pause();
    activeTranscriptAudioRef.current = null;

    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }

    if (mountedRef.current) setSpeakingLine(null);
  }

  function stopActiveRoleplayAudio({
    announce = true,
  }: { announce?: boolean } = {}) {
    void voiceLifecycleRef.current?.stop();
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    remoteAudioRef.current?.pause();
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    stopTranscriptAudioPlayback();
    if (!mountedRef.current) return;
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
    if (activeSessionRef.current?.id !== session.id) stopActiveRoleplayAudio({ announce: false });
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

  async function waitForIceGatheringComplete(pc: RTCPeerConnection, signal: AbortSignal) {
    if (pc.iceGatheringState === "complete") return;
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new Error("Voice start cancelled")); return; }
      const abort = () => { pc.removeEventListener("icegatheringstatechange", handler); reject(new Error("Voice start cancelled")); };
      signal.addEventListener("abort", abort, { once: true });
      const handler = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", handler);
          signal.removeEventListener("abort", abort);
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

    const lifecycle = voiceLifecycleRef.current!;
    const run = lifecycle.begin(activeSession.id, crypto.randomUUID());
    const abortController = new AbortController();
    lifecycle.adopt(run, () => abortController.abort());
    setError(null);
    setVoiceStatus("Requesting microphone access…");
    setIsStartingVoice(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!lifecycle.adopt(run, () => stream.getTracks().forEach((track) => track.stop()))) return;
      mediaStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      lifecycle.adopt(run, () => pc.close());
      peerConnectionRef.current = pc;
      pc.onconnectionstatechange = () => {
        if (lifecycle.isCurrent(run) && ["disconnected", "failed", "closed"].includes(pc.connectionState)) stopVoicePractice();
      };

      const remoteStream = new MediaStream();
      if (remoteAudioRef.current)
        remoteAudioRef.current.srcObject = remoteStream;
      pc.ontrack = (e) =>
        e.streams.forEach((s) =>
          s.getTracks().forEach((t) => remoteStream.addTrack(t)),
        );

      const dc = pc.createDataChannel("argos-realtime-events");
      lifecycle.adopt(run, () => dc.close());
      dataChannelRef.current = dc;
      dc.onopen = () => {
        if (!lifecycle.isCurrent(run)) return;
        const heartbeat = setInterval(() => {
          void fetch(`/api/roleplay/sessions/${run.sessionId}/voice`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "heartbeat", segmentId: run.segmentId }),
            signal: AbortSignal.timeout(10_000),
          }).then((response) => { if (!response.ok) throw new Error("Voice connection expired"); })
            .catch(() => { if (lifecycle.isCurrent(run)) stopVoicePractice(); });
        }, 10_000);
        lifecycle.adopt(run, () => clearInterval(heartbeat));
        setVoiceStatus("Voice practice live.");
        setIsVoiceActive(true);
        setIsStartingVoice(false);
      };
      dc.onmessage = (e) => {
        if (!lifecycle.isCurrent(run)) return;
        const msg = parseRealtimeEvent(e.data);
        if (msg) {
          queueVoiceTranscriptPersistence(activeSession.id, msg);
        }
      };
      dc.onerror = () => { if (lifecycle.isCurrent(run)) stopVoicePractice(); };

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      if (!lifecycle.isCurrent(run)) return;
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc, abortController.signal);
      if (!lifecycle.isCurrent(run)) return;

      const res = await fetch(
        `/api/roleplay/sessions/${activeSession.id}/realtime`,
        {
          method: "POST",
          headers: { "Content-Type": "application/sdp", "X-Roleplay-Voice-Segment": run.segmentId },
          signal: abortController.signal,
          body: pc.localDescription?.sdp ?? offer.sdp ?? "",
        },
      );

      if (!res.ok) {
        if (res.status === 402) setBalanceRefreshKey((value) => value + 1);
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Unable to start voice practice.");
      }

      const answer = await res.text();
      if (!lifecycle.isCurrent(run)) return;
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
      if (!lifecycle.isCurrent(run)) return;
      setBalanceRefreshKey((value) => value + 1);
    } catch (err) {
      if (!lifecycle.isCurrent(run)) return;
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
    setBalanceRefreshKey((value) => value + 1);
  }

  async function flushPendingVoiceTranscriptPersistence() {
    await voicePersistenceQueueRef.current.catch(() => undefined);
  }

  async function playTranscriptLine(text: string) {
    if (!text.trim()) return;
    stopTranscriptAudioPlayback();
    const generation = playbackGenerationRef.current;
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
        if (res.status === 402) setBalanceRefreshKey((value) => value + 1);
        const p = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(p?.error ?? "Unable to synthesize voice.");
      }
      const blob = await res.blob();
      if (!mountedRef.current || generation !== playbackGenerationRef.current) return;
      setBalanceRefreshKey((value) => value + 1);
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
    stopActiveRoleplayAudio({ announce: false });
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

  async function createSession(personaId = selectedPersonaId) {
    if (!personas.some((persona) => persona.id === personaId)) return;
    stopActiveRoleplayAudio({ announce: false });
    setError(null);
    setIsMutating(true);
    const res = await fetch("/api/roleplay/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId }),
    });
    const payload = (await res.json()) as RoleplaySession & { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Unable to start session.");
      setIsMutating(false);
      return;
    }
    commitSession(payload);
    setSelectedPersonaId(personaId);
    setDraft("");
    setIsMutating(false);
    startTransition(() => router.replace(`/roleplay?sessionId=${encodeURIComponent(payload.id)}`));
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
    await voiceStopPromiseRef.current;
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
    personas.find((p) => p.id === selectedPersonaId) ?? null;
  const activeScorecard = activeSession?.scorecard ?? null;
  const baseVoiceControlDisabled = isRoleplayVoiceControlDisabled({
    activeSessionStatus: activeSession?.status,
    isStartingVoice,
    isVoiceActive,
  });
  const isVoiceControlDisabled = isVoiceActive
    ? false
    : !voiceEnabled || baseVoiceControlDisabled || voiceAvailable !== true;
  const generatedActiveSession =
    activeSession?.origin === "generated_from_call" ? activeSession : null;

  const isComplete = activeSession?.status === "complete";
  const isEvaluating = activeSession?.status === "evaluating";
  const sessionPersona = activeSession?.personaDetails;
  const repeatPersonaId = personas.find((persona) => persona.id === activeSession?.persona)?.id;

  const buyerSetup = (
    <div className={styles.setup}>
      <div className={styles.setupHeading}>
        <div className={styles.avatar} aria-hidden="true">{selectedPersona?.avatarInitials ?? <ForgeIcon name="person" size={20} />}</div>
        <div>
          <h2>{selectedPersona ? `Practice with ${selectedPersona.name}` : "Choose a buyer"}</h2>
          {selectedPersona && <p className={styles.muted}>{selectedPersona.role} · {selectedPersona.company}</p>}
        </div>
      </div>
      {selectedPersona ? <>
        <p className={styles.description}>{selectedPersona.description}</p>
        <dl className={styles.facts}>
          <div><dt>Challenge</dt><dd>{selectedPersona.objectionType}</dd></div>
          <div><dt>Difficulty</dt><dd className={styles.capitalize}>{selectedPersona.difficulty}</dd></div>
        </dl>
      </> : <p className={styles.muted}>{personas.length ? "Choose an available buyer below to start practice." : "No buyers are available. Reload the page to check again."}</p>}
      {personas.length > 0 && <details className={styles.buyerDisclosure} open={!selectedPersona || undefined}>
        <summary>Change buyer ({personas.length})</summary>
        <div className={styles.buyerList} data-roleplay-scenario-list="true">
          {personas.map((persona) => (
            <button aria-pressed={persona.id === selectedPersonaId} className={styles.buyerOption} key={persona.id} onClick={() => setSelectedPersonaId(persona.id)} type="button">
              <span className={styles.smallAvatar} aria-hidden="true">{persona.avatarInitials}</span>
              <span><strong>{persona.name}</strong><span>{persona.role} · {persona.company}</span><span>{persona.description}</span></span>
              {persona.id === selectedPersonaId && <ForgeIcon name="check" size={18} />}
            </button>
          ))}
        </div>
      </details>}
      <div className={styles.startRow}>
        <button className={styles.primaryButton} data-roleplay-primary-action="start-simulation" disabled={!selectedPersona || isMutating || isVoiceActive || isStartingVoice || isEvaluating} onClick={() => void createSession()} type="button">
          <ForgeIcon name="insights" size={18} />{isMutating ? "Starting…" : "Start simulation"}
        </button>
        {!activeSession && <p className={styles.muted}>Practice the conversation. End it when you’re ready for feedback.</p>}
      </div>
    </div>
  );

  return (
    <div className={styles.workspace} data-roleplay-workspace="simple-practice" data-roleplay-state={activeSession ? isComplete ? "complete" : "active" : "ready"}>
      {voiceEnabled && <div className={styles.voiceBalance} data-roleplay-voice-balance="full-width"><VoiceBalanceCard onVoiceAvailabilityChange={setVoiceAvailable} refreshKey={balanceRefreshKey} returnTo="/roleplay" /></div>}
      {error && <ForgeErrorState description={error} title="Roleplay update failed" />}
      {voiceEnabled && voiceStatus && <ForgeStatusPanel announce="polite" description={voiceStatus} icon="mic" title="Voice practice status" tone="gold" />}

      {!activeSession ? (
        <section aria-label="Scenario" className={styles.ready} data-roleplay-scenario-picker="" id="roleplay-scenario">
          {buyerSetup}
        </section>
      ) : <>
        {isComplete && (
          <section aria-labelledby="roleplay-score-title" className={styles.scorecard} data-roleplay-scorecard="visible" id="roleplay-score" tabIndex={-1}>
            <div className={styles.scoreHeading}>
              <h2 id="roleplay-score-title">Session Scorecard</h2>
              <div className={styles.scoreHeadingActions}><span className={styles.muted}>Practice complete</span>
                <button className={styles.primaryButton} data-roleplay-primary-action="practice-again" disabled={!repeatPersonaId || isMutating || isVoiceActive || isStartingVoice || isEvaluating} onClick={() => { if (repeatPersonaId) void createSession(repeatPersonaId); }} title={repeatPersonaId ? "Practice again with the same buyer" : "Choose an available buyer below to start another simulation"} type="button">Practice again</button>
                {!repeatPersonaId && <a className={styles.chooseBuyerLink} href="#roleplay-scenario">Choose another buyer</a>}
              </div>
            </div>
            {activeScorecard ? <>
              <div className={styles.scoreSummary}>
                <p className={styles.overallScore}><strong>{activeSession.overallScore ?? "—"}</strong><span>Overall score{activeSession.overallScore != null ? " / 100" : " unavailable"}</span></p>
                <div><p>{activeScorecard.summary}</p><p className={styles.scoreMeta}>Confidence: <span className={styles.capitalize}>{activeScorecard.confidence}</span> · Stage: {labelCallStage(activeScorecard.callStageReached)}</p>
                  {activeScorecard.rubricName && <p className={styles.muted}>{activeScorecard.rubricName}{activeScorecard.rubricVersion != null ? ` · v${activeScorecard.rubricVersion}` : ""}</p>}
                </div>
              </div>
              <div className={styles.feedbackGrid}>
                <dl className={styles.categoryRows} aria-label="Category scores">
                  {Object.entries(activeScorecard.categoryScores).map(([category, value]) => (
                    <div key={category}><dt>{activeScorecard.categoryLabels?.[category] ?? ROLEPLAY_CATEGORY_LABELS[category as RoleplayCategory] ?? formatRoleplayCategoryLabel(category)}</dt><dd>{value ?? "—"}<span className={styles.srOnly}>{value != null ? " out of 100" : " score unavailable"}</span></dd></div>
                  ))}
                </dl>
                <div className={styles.coaching}>
                  <h3>Strengths</h3>
                  {activeScorecard.strengths.length ? <ul>{activeScorecard.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.muted}>No strengths recorded.</p>}
                  <h3>Improve</h3>
                  {activeScorecard.improvements.length ? <ul>{activeScorecard.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.muted}>No improvements recorded.</p>}
                </div>
              </div>
            </> : <p className={styles.muted}>This session is complete. A scorecard is not available.</p>}
          </section>
        )}
        <div className={styles.sessionLayout}>
          <section aria-labelledby="roleplay-practice-title" className={styles.conversation} data-roleplay-simulation-stage="" id="roleplay-practice">
            <header className={styles.conversationHeading}>
              <div><h2 id="roleplay-practice-title">{isComplete ? "Session transcript" : `Conversation with ${getSessionPersonaLabel(activeSession)}`}</h2><p className={styles.muted}>{getSessionLabel(activeSession)}</p></div>
              {voiceEnabled && <div data-roleplay-mode-control="true"><button aria-label={isVoiceActive ? "Stop voice practice" : "Start voice practice"} className={styles.secondaryButton} disabled={isVoiceControlDisabled || (!isVoiceActive && (isMutating || isEvaluating))} onClick={() => isVoiceActive ? stopVoicePractice() : void startVoicePractice()} type="button"><ForgeIcon name="mic" size={16} />{isStartingVoice ? "Starting…" : isVoiceActive ? "Stop voice" : "Start voice"}</button></div>}
            </header>
            <div className={styles.transcript} aria-label="Roleplay transcript" aria-live="polite" aria-relevant="additions text" data-roleplay-transcript="simple-log" role="log" tabIndex={0}>
              {displayedTranscript.length ? displayedTranscript.map((message, index) => (
                <div className={styles.message} data-speaker={message.role} key={`${message.role}-${index}`}>
                  <div className={styles.messageLabel}><strong>{message.role === "user" ? "You" : getSessionPersonaLabel(activeSession)}</strong>
                    {voiceEnabled && message.role === "assistant" && <button className={styles.listenButton} onClick={() => void playTranscriptLine(message.content)} type="button">{speakingLine === message.content ? "Playing…" : "Listen"}</button>}
                  </div>
                  <p>{message.content}</p>
                </div>
              )) : <p className={styles.emptyTranscript}>Session started — the prospect is waiting for you.</p>}
              <div ref={transcriptEndRef} />
            </div>
            {!isComplete && <div className={styles.composer}>
              <label htmlFor="roleplay-response">Roleplay response</label>
              <textarea className={styles.response} disabled={isMutating || isEvaluating} id="roleplay-response" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !isMutating && !isEvaluating) { event.preventDefault(); void sendMessage(); } }} placeholder="Type your response…" value={draft} />
              <div className={styles.composerActions}>
                <button aria-label="Send response" className={styles.primaryButton} disabled={!draft.trim() || isMutating || isEvaluating} onClick={() => void sendMessage()} title="Send response" type="button"><ForgeIcon name="send" size={16} />{isMutating ? "Working…" : "Send response"}</button>
                <button aria-label="End and score current session" className={styles.secondaryButton} disabled={isMutating || isEvaluating} onClick={() => void completeSession()} title="End and score current session" type="button"><ForgeIcon name="insights" size={16} />{isEvaluating ? "Scoring…" : "End & score"}</button>
              </div>
            </div>}
          </section>
          <aside className={styles.scenario} aria-label="Scenario" data-roleplay-scenario-picker="" id="roleplay-scenario">
            <h2>Scenario</h2>
            {generatedActiveSession ? <>
              <ForgeChip tone="muted">Generated from call</ForgeChip>
              <p className={styles.focus}>Focus: {generatedActiveSession.focusMode === "all" ? "All" : formatRoleplayCategoryLabel(generatedActiveSession.focusCategorySlug)}</p>
              {generatedActiveSession.scenarioBrief && <p>{generatedActiveSession.scenarioBrief}</p>}
              {generatedActiveSession.scenarioSummary && <p>{generatedActiveSession.scenarioSummary}</p>}
            </> : <>
              <h3>{getSessionPersonaLabel(activeSession)}</h3>
              {sessionPersona && <><p className={styles.muted}>{sessionPersona.role} · {sessionPersona.company}</p><p>{sessionPersona.description}</p></>}
              <dl className={styles.facts}><div><dt>Challenge</dt><dd>{sessionPersona?.objectionType ?? "Objection handling"}</dd></div><div><dt>Difficulty</dt><dd className={styles.capitalize}>{activeSession.difficulty}</dd></div></dl>
            </>}
            {!isComplete && <p className={styles.scoringNote} id="roleplay-score">End the conversation to see your score and coaching feedback.</p>}
            <details className={styles.nextPractice}><summary>Start another simulation</summary>{buyerSetup}</details>
          </aside>
        </div>
      </>}
      <audio autoPlay className="hidden" playsInline ref={remoteAudioRef} />
    </div>
  );
}
