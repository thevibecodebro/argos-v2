// @vitest-environment jsdom
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { RoleplayPanel } from '@/components/roleplay-panel';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/billing/voice-balance-card', () => ({ VoiceBalanceCard: ({ onVoiceAvailabilityChange }: any) => { useEffect(() => { onVoiceAvailabilityChange(true); }, [onVoiceAvailabilityChange]); return null; } }));
const persona = { id: 'buyer', name: 'Buyer', role: 'CFO', company: 'Acme', industry: 'SaaS', difficulty: 'intermediate', objectionType: 'Budget', description: 'Buyer', avatarInitials: 'B', voice: 'marin' };
const session = { id: 's1', repId: 'r1', orgId: 'o1', persona: 'buyer', personaDetails: persona, industry: 'SaaS', difficulty: 'intermediate', status: 'active', createdAt: '2026-09-09T00:00:00Z', transcript: [], scorecard: null, overallScore: null, origin: 'manual', sourceCallId: null, rubricId: null, focusMode: 'all', focusCategorySlug: null, scenarioSummary: null, scenarioBrief: null };
let root: Root | null;
let container: HTMLElement;
let fetchMock: any;
let tracksStop: any;
let peers: any[];
class FakePeer {
    iceGatheringState = 'complete';
    connectionState = 'connected';
    localDescription = { sdp: 'offer' };
    dc: any = { close: vi.fn() };
    close = vi.fn();
    addTrack = vi.fn();
    createDataChannel = () => this.dc;
    createOffer = async () => ({ sdp: 'offer' });
    setLocalDescription = async () => { };
    setRemoteDescription = vi.fn(async () => this.dc.onopen?.());
    constructor() { peers.push(this); }
}
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    peers = [];
    tracksStop = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: tracksStop }] })) }, configurable: true });
    vi.stubGlobal('RTCPeerConnection', FakePeer);
    vi.stubGlobal('MediaStream', class {
        addTrack() { }
    });
    fetchMock = vi.fn(async (url: any) => String(url).endsWith('/realtime') ? new Response('answer') : String(url) === '/api/roleplay/sessions' ? Response.json({ ...session, id: 's2' }) : Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
});
afterEach(async () => { if (root)
    await act(async () => root!.unmount()); root = null; container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function mount() { await act(async () => root!.render(createElement(RoleplayPanel, { initialPersonas: [persona], initialSessions: [session], initialSessionId: 's1', voiceEnabled: true } as any))); }
async function start() { await act(async () => { const b = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Start voice')); expect(b).toBeTruthy(); expect(b!.disabled).toBe(false); b!.click(); await new Promise(setImmediate); }); }
it('unmount releases a microphone that resolves after leaving', async () => {
    let resolve: any;
    (navigator.mediaDevices.getUserMedia as any).mockImplementation(() => new Promise(r => resolve = r));
    await mount();
    await start();
    await act(async () => root!.unmount());
    root = null;
    await act(async () => resolve({ getTracks: () => [{ stop: tracksStop }] }));
    expect(tracksStop).toHaveBeenCalledOnce();
    expect(peers).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith('/api/roleplay/sessions/s1/voice', expect.objectContaining({ keepalive: true }));
});
it('changing simulations closes live media and ignores the old data channel', async () => {
    await mount();
    await start();
    expect(peers).toHaveLength(1);
    await act(async () => { (container.querySelector('[data-roleplay-primary-action="start-simulation"]') as HTMLButtonElement).click(); await new Promise(setImmediate); });
    expect(tracksStop).toHaveBeenCalled();
    expect(peers[0].close).toHaveBeenCalled();
    expect(peers[0].dc.close).toHaveBeenCalled();
    const before = fetchMock.mock.calls.length;
    peers[0].dc.onmessage({ data: JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'old voice' }) });
    expect(fetchMock.mock.calls.length).toBe(before);
});
it('late SDP cannot reattach a connection after unmount', async () => {
    let resolve: any;
    fetchMock.mockImplementation((url: any) => String(url).endsWith('/realtime') ? new Promise(r => resolve = r) : Promise.resolve(Response.json({ ok: true })));
    await mount();
    await start();
    await act(async () => root!.unmount());
    root = null;
    await act(async () => resolve(new Response('late answer')));
    expect(peers[0].setRemoteDescription).not.toHaveBeenCalled();
    expect(tracksStop).toHaveBeenCalled();
    expect(peers[0].close).toHaveBeenCalled();
});
