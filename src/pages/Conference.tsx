import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { useConferenceStats } from "@/hooks/useConferenceStats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, PhoneOff, MessageSquare, Users, Settings,
  Send, Crown, Shield, Loader2, X, Check, Volume2,
  Radio, LogIn, Clock, AlertCircle, Minimize2, Maximize2,
  ArrowLeft, Link2, Smile, LayoutGrid, Presentation,
  Wifi, WifiOff, BarChart2, Maximize, Minimize, PictureInPicture2,
  VolumeX, UserCheck, ChevronDown, SlidersHorizontal, Focus,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ParticipantRole = "moderator" | "speaker" | "audience";

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // optionIndex (string) -> count
  voterIds: string[];
  closed: boolean;
  created_by: string;
}

interface SessionSummary {
  duration: string;
  participantCount: number;
  maxParticipants: number;
  messageCount: number;
  startTime: Date;
  endTime: Date;
}

interface DBConference {
  id: string;
  title: string;
  status: "live" | "ended";
  host_id: string;
  host_name: string;
  created_at: string;
  ended_at: string | null;
  guest_allowed?: boolean;
  co_moderator_id?: string | null;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
  x: number; // percent 10-90
}

interface Participant {
  user_id: string;
  user_name: string;
  role: ParticipantRole;
  hand_raised: boolean;
  is_muted: boolean;
  is_video_off: boolean;
  joined_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  role: ParticipantRole;
  type?: "system" | "poll";
  poll?: Poll;
}

// ─────────────────────────────────────────────────────────────────────────────
// WebRTC globals (survive re-renders)
// ─────────────────────────────────────────────────────────────────────────────

// Module-level object so refs can point to it without closure issues
const peers: Record<string, RTCPeerConnection> = {};
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "turn:openrelay.metered.ca:80",   username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443",  username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turns:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Pre-call setup modal (device selection + camera preview)
// ─────────────────────────────────────────────────────────────────────────────

interface PreCallProps {
  confTitle: string;
  isCreate: boolean;
  defaultAudioIn: string;
  defaultAudioOut: string;
  onConfirm: (audioIn: string, audioOut: string) => void;
  onCancel: () => void;
}

function PreCallSetup({ confTitle, isCreate, defaultAudioIn, defaultAudioOut, onConfirm, onCancel }: PreCallProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioIns, setAudioIns] = useState<MediaDeviceInfo[]>([]);
  const [audioOuts, setAudioOuts] = useState<MediaDeviceInfo[]>([]);
  const [videoIns, setVideoIns] = useState<MediaDeviceInfo[]>([]);
  const [selAudioIn, setSelAudioIn] = useState(defaultAudioIn);
  const [selAudioOut, setSelAudioOut] = useState(defaultAudioOut);
  const [selVideoIn, setSelVideoIn] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);

  const startPreview = useCallback(async (videoId?: string) => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); }
    try {
      const constraints: MediaStreamConstraints = {
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: selAudioIn ? { deviceId: { exact: selAudioIn } } : true,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
      setCamOn(true);

      // Mic level meter
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(s);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(100, avg * 2));
          animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
      } catch { /* mic level optional */ }

      // Enumerate devices with labels now available
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioIns(devices.filter((d) => d.kind === "audioinput"));
      setAudioOuts(devices.filter((d) => d.kind === "audiooutput"));
      setVideoIns(devices.filter((d) => d.kind === "videoinput"));
    } catch { setCamOn(false); }
  }, [selAudioIn]);

  useEffect(() => {
    startPreview();
    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleVideoChange = async (deviceId: string) => {
    setSelVideoIn(deviceId);
    await startPreview(deviceId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            {isCreate ? "Démarrer la conférence" : "Rejoindre la conférence"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 truncate">{confTitle}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Camera preview */}
          <div className="relative bg-slate-800 rounded-xl overflow-hidden aspect-video">
            {camOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <VideoOff className="h-10 w-10" />
                <span className="text-sm">Caméra non disponible</span>
              </div>
            )}
            {/* Mic level bar */}
            <div className="absolute bottom-2 left-2 right-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>

          {/* Device selectors */}
          <div className="space-y-3">
            {videoIns.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" /> Caméra
                </label>
                <select
                  value={selVideoIn}
                  onChange={(e) => handleVideoChange(e.target.value)}
                  className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Caméra par défaut</option>
                  {videoIns.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Cam ${d.deviceId.slice(0, 8)}`}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5" /> Microphone
              </label>
              <select
                value={selAudioIn}
                onChange={(e) => setSelAudioIn(e.target.value)}
                className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Microphone par défaut</option>
                {audioIns.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Micro ${d.deviceId.slice(0, 8)}`}</option>)}
              </select>
            </div>
            {audioOuts.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" /> Haut-parleurs
                </label>
                <select
                  value={selAudioOut}
                  onChange={(e) => setSelAudioOut(e.target.value)}
                  className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Haut-parleurs par défaut</option>
                  {audioOuts.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Sortie ${d.deviceId.slice(0, 8)}`}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(selAudioIn, selAudioOut)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            {isCreate ? "Démarrer" : "Rejoindre"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CtrlBtn({
  on, onClick, icon, label, color = "neutral", disabled = false,
}: {
  on: boolean; onClick: () => void; icon: React.ReactNode; label: string;
  color?: "neutral" | "red" | "green" | "amber"; disabled?: boolean;
}) {
  const base =
    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs font-medium select-none";
  const map = {
    neutral: on
      ? "bg-primary text-primary-foreground shadow"
      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
    red: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow",
    green: on
      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
      : "bg-muted text-muted-foreground hover:bg-muted/70",
    amber: on
      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 animate-pulse"
      : "bg-muted text-muted-foreground hover:bg-muted/70",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${map[color]} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function RoleBadge({ role }: { role: ParticipantRole }) {
  if (role === "moderator")
    return (
      <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-xs gap-1">
        <Crown className="h-2.5 w-2.5" />Modérateur
      </Badge>
    );
  if (role === "speaker")
    return (
      <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 text-xs gap-1">
        <Mic className="h-2.5 w-2.5" />Speaker
      </Badge>
    );
  return <Badge variant="outline" className="text-xs text-muted-foreground">Auditeur</Badge>;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ConferencePage() {
  useSEO({ title: "Conférence – Bureau des Lycéens", url: "/conference" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── identity ──
  const [isBDLExec, setIsBDLExec] = useState(false);
  const [userName, setUserName] = useState("Anonyme");
  const [checkingRole, setCheckingRole] = useState(true);

  // ── conference ──
  const [liveConfs, setLiveConfs] = useState<DBConference[]>([]);
  const [activeConf, setActiveConf] = useState<DBConference | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myRole, setMyRole] = useState<ParticipantRole>("audience");
  const [inConference, setInConference] = useState(false);
  const [minimized, setMinimized] = useState(false); // ← navigate while in call

  // ── create form ──
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [guestAllowedForm, setGuestAllowedForm] = useState(false);

  // ── guest ──
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestConf, setGuestConf] = useState<DBConference | null>(null);

  // ── view mode ──
  const [viewMode, setViewMode] = useState<"gallery" | "speaker">("gallery");

  // ── speaking / volume ──
  const peerAnalysers = useRef<Record<string, { analyser: AnalyserNode; data: Uint8Array; ctx: AudioContext }>>({});
  const localAnalyserRef = useRef<{ analyser: AnalyserNode; data: Uint8Array } | null>(null);
  // Volumes stored in refs only — no state to avoid 8 re-renders/sec
  const peerVolumesRef = useRef<Record<string, number>>({});
  const localVolumeRef = useRef(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [speakingSet, setSpeakingSet] = useState<Set<string>>(new Set());

  // ── reactions ──
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // ── polls (displayed in chat) ──
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [myVote, setMyVote] = useState<number | null>(null);

  // ── co-moderator ──
  const [coModId, setCoModId] = useState<string | null>(null);

  // ── session summary ──
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const maxParticipantsRef = useRef(0);
  const messageCountRef = useRef(0);

  // ── view extensions ──
  const [focusMode, setFocusMode] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [noiseSuppressionOn, setNoiseSuppressionOn] = useState(true);
  const [isPiP, setIsPiP] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // ── pre-call ──
  const [showPreCall, setShowPreCall] = useState(false);
  const [preCallConf, setPreCallConf] = useState<DBConference | null>(null);
  const [preCallIsCreate, setPreCallIsCreate] = useState(false);

  // ── timer ──
  const confStartRef = useRef<number | null>(null);
  const [timerStr, setTimerStr] = useState("00:00");

  // ── media state ──
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // ── device lists ──
  const [audioIns, setAudioIns] = useState<MediaDeviceInfo[]>([]);
  const [audioOuts, setAudioOuts] = useState<MediaDeviceInfo[]>([]);
  const [selAudioIn, setSelAudioIn] = useState("");
  const [selAudioOut, setSelAudioOut] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // ── chat ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showPeers, setShowPeers] = useState(false);
  const [unread, setUnread] = useState(0);
  const [handRaised, setHandRaised] = useState(false);

  // ── refs ──
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef(peers); // stable ref pointing to module-level peers object
  const participantsRef = useRef<Participant[]>([]); // always-current for use inside intervals

  // ── network stats hook ──
  const { peerStats, overallQuality, start: startStats, stop: stopStats } = useConferenceStats(peersRef);

  // The single source of truth for local media.
  // Pre-populated with silent/black tracks so WebRTC SDP always contains m=audio + m=video.
  // Real tracks replace these when the user enables mic/cam.
  const localStream = useRef<MediaStream>((() => {
    const s = new MediaStream();

    // Silent audio track
    try {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const silentTrack = dest.stream.getAudioTracks()[0];
      if (silentTrack) { silentTrack.enabled = false; s.addTrack(silentTrack); }
    } catch { /* AudioContext not available (SSR / test env) */ }

    // Black video track (1×1 canvas)
    try {
      const canvas = Object.assign(document.createElement("canvas"), { width: 1, height: 1 });
      canvas.getContext("2d")?.fillRect(0, 0, 1, 1);
      const blackTrack = (canvas as any).captureStream(0).getVideoTracks()[0];
      if (blackTrack) { blackTrack.enabled = false; s.addTrack(blackTrack); }
    } catch { /* captureStream not available */ }

    return s;
  })());

  // Current screen-share track (so we can stop it independently)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // ─── sync localStream → <video> whenever tracks change ───────────────────
  // Always point the <video> at localStream.current directly.
  // For screen sharing we temporarily swap the video track inside the stream.
  const syncLocalVideo = useCallback(() => {
    const vid = localVideoRef.current;
    if (!vid) return;
    // Always use the same stream object — just update its tracks externally
    if (vid.srcObject !== localStream.current) {
      vid.srcObject = localStream.current;
    }
    vid.play().catch(() => {});
  }, []);

  // ─── auth guard — redirect only if no guest-allowed conference is live ────
  useEffect(() => {
    if (loading || user) return;
    // Check if any live conference allows guests before redirecting
    supabase.from("conferences").select("id").eq("status", "live").eq("guest_allowed", true).limit(1)
      .then(({ data }) => { if (!data?.length) navigate("/auth"); });
  }, [user, loading, navigate]);

  // ─── profile + role ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (p) setUserName((p as any).full_name);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const exec = ["administrator", "president", "presidente", "vice_president", "vice_presidente", "secretary_general", "secretary_general2", "communication_manager", "communication_manager2"];
      setIsBDLExec(r?.some((x) => exec.includes(x.role)) ?? false);
      setCheckingRole(false);
    })();
  }, [user]);

  // ─── enumerate devices ────────────────────────────────────────────────────
  const refreshDevices = async () => {
    // Need at least one active stream to get labels
    const devices = await navigator.mediaDevices.enumerateDevices();
    setAudioIns(devices.filter((d) => d.kind === "audioinput"));
    setAudioOuts(devices.filter((d) => d.kind === "audiooutput"));
  };

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, []);

  // ─── fetch live conferences ───────────────────────────────────────────────
  const fetchConfs = useCallback(async () => {
    const { data } = await supabase
      .from("conferences")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false });
    if (data) setLiveConfs(data as DBConference[]);
  }, []);

  useEffect(() => {
    fetchConfs();
    const t = setInterval(fetchConfs, 5000);
    return () => clearInterval(t);
  }, [fetchConfs]);

  // Keep participantsRef current for use inside setInterval callbacks (avoids stale closures)
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  // ─── chat scroll ──────────────────────────────────────────────────────────
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (showChat) setUnread(0); }, [showChat]);

  // ─── apply audio output device to all remote <video> elements ─────────────
  const applyAudioOutput = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    for (const vid of Object.values(remoteVideoRefs.current)) {
      if (vid && "setSinkId" in vid) {
        try { await (vid as any).setSinkId(deviceId); } catch { /* permission */ }
      }
    }
  }, []);

  useEffect(() => { if (selAudioOut) applyAudioOutput(selAudioOut); }, [selAudioOut, applyAudioOutput]);

  // ─── WebRTC helpers ───────────────────────────────────────────────────────

  const getOrCreatePeer = useCallback(
    (peerId: string, ch: ReturnType<typeof supabase.channel>): RTCPeerConnection => {
      if (peers[peerId]) return peers[peerId];

      const pc = new RTCPeerConnection(ICE);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && user) {
          ch.send({
            type: "broadcast", event: "ice",
            payload: { from: user.id, to: peerId, candidate: candidate.toJSON() },
          });
        }
      };

      // Auto-reconnect: ICE restart on "failed" state
      let reconnectAttempts = 0;
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" && reconnectAttempts < 3) {
          reconnectAttempts++;
          console.warn(`[WebRTC] ${peerId} failed — ICE restart attempt ${reconnectAttempts}`);
          pc.restartIce();
          pc.createOffer({ iceRestart: true }).then(async (offer) => {
            await pc.setLocalDescription(offer);
            ch.send({
              type: "broadcast", event: "offer",
              payload: { from: user!.id, to: peerId, sdp: offer },
            });
          }).catch(() => {});
        }
        if (pc.connectionState === "connected") {
          reconnectAttempts = 0;
        }
      };

      pc.ontrack = ({ streams }) => {
        if (!streams[0]) return;
        const attach = () => {
          const vid = remoteVideoRefs.current[peerId];
          if (vid) {
            vid.srcObject = streams[0];
            vid.play().catch(() => {});
            if (selAudioOut) (vid as any).setSinkId?.(selAudioOut).catch(() => {});
          } else {
            setTimeout(attach, 100);
          }
        };
        attach();
        // Web Audio analyser for speaking detection
        try {
          const audioTracks = streams[0].getAudioTracks();
          if (audioTracks.length) {
            const ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(streams[0]);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            peerAnalysers.current[peerId] = { analyser, data, ctx };
          }
        } catch { /* optional */ }
      };

      // ⚠️ Add tracks ONLY if the stream already has them.
      // If not yet (mic/cam not started), they'll be pushed via replaceTrackInAllPeers later.
      localStream.current.getTracks().forEach((t) => {
        pc.addTrack(t, localStream.current);
      });

      peers[peerId] = pc;
      return pc;
    },
    [user, selAudioOut]
  );

  // Send an offer to a specific peer (called when someone joins)
  const initiateOffer = useCallback(
    async (peerId: string, ch: ReturnType<typeof supabase.channel>) => {
      if (!user || peerId === user.id) return;
      const pc = getOrCreatePeer(peerId, ch);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ch.send({
          type: "broadcast", event: "offer",
          payload: { from: user.id, to: peerId, sdp: offer },
        });
      } catch (e) {
        console.error("initiateOffer error", e);
      }
    },
    [user, getOrCreatePeer]
  );

  // Replace/add a track in all existing peers and renegotiate if needed
  const replaceTrackInAllPeers = useCallback(
    (track: MediaStreamTrack | null, kind: "audio" | "video") => {
      const ch = channelRef.current;
      for (const [peerId, pc] of Object.entries(peers)) {
        // Find the sender for this kind via transceivers (works even when track is null)
        const transceiver = pc.getTransceivers().find(
          (t) => t.sender.track?.kind === kind ||
            (t.sender.track === null && t.receiver.track?.kind === kind)
        );
        const matchedSender = transceiver?.sender
          ?? pc.getSenders().find((s) => s.track?.kind === kind);

        if (matchedSender) {
          // replaceTrack never needs renegotiation — perfect for enable/disable
          matchedSender.replaceTrack(track).catch((e) => console.error("replaceTrack", peerId, e));
        } else if (track) {
          // No sender exists for this kind yet → addTrack + renegotiate
          pc.addTrack(track, localStream.current);
          if (ch && user) {
            pc.createOffer().then(async (offer) => {
              await pc.setLocalDescription(offer);
              ch.send({
                type: "broadcast", event: "offer",
                payload: { from: user.id, to: peerId, sdp: offer },
              });
            }).catch((e) => console.error("renegotiate", peerId, e));
          }
        }
      }
    },
    [user]
  );

  // ─── Realtime channel ─────────────────────────────────────────────────────

  const setupChannel = useCallback(
    (confId: string, role: ParticipantRole) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const ch = supabase.channel(`conf:${confId}`, {
        config: { broadcast: { self: false }, presence: { key: user!.id } },
      });

      ch.on("broadcast", { event: "chat" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatMessage]);
        setUnread((u) => u + 1);
      });
      ch.on("broadcast", { event: "reaction" }, ({ payload }) => {
        const r: FloatingReaction = {
          id: payload.id, emoji: payload.emoji,
          userName: payload.userName, x: 10 + Math.random() * 80,
        };
        setFloatingReactions((prev) => [...prev, r]);
        setTimeout(() => setFloatingReactions((prev) => prev.filter((f) => f.id !== r.id)), 3000);
      });
      ch.on("broadcast", { event: "hand" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) => p.user_id === payload.user_id ? { ...p, hand_raised: payload.raised } : p)
        );
      });
      ch.on("broadcast", { event: "role_change" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) => p.user_id === payload.user_id ? { ...p, role: payload.role, hand_raised: false } : p)
        );
        if (payload.user_id === user!.id) {
          setMyRole(payload.role);
          if (payload.role === "speaker") toast.success("🎙️ Vous êtes maintenant speaker !");
          else if (payload.role === "audience") toast.info("Vous repassez en auditeur.");
        }
      });
      ch.on("broadcast", { event: "mute_change" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) => p.user_id === payload.user_id ? { ...p, is_muted: payload.muted } : p)
        );
      });
      ch.on("broadcast", { event: "video_change" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) => p.user_id === payload.user_id ? { ...p, is_video_off: payload.video_off } : p)
        );
      });
      ch.on("broadcast", { event: "force_mute" }, ({ payload }) => {
        if (payload.user_id !== user!.id) return;
        // Disable audio tracks without stopping them (keeps the sender alive)
        localStream.current.getAudioTracks().forEach((t) => { t.enabled = false; });
        setMicOn(false);
        broadcastMuteChange(true);
        toast.warning("Le modérateur vous a coupé le micro.");
      });
      ch.on("broadcast", { event: "conf_end" }, () => {
        toast.info("La conférence est terminée.");
        doCleanup(false);
        setInConference(false);
        setMinimized(false);
        setActiveConf(null);
        fetchConfs();
      });

      // ── Force mute all ──
      ch.on("broadcast", { event: "force_mute_all" }, ({ payload }) => {
        if (payload.user_id === user!.id) return; // moderator not muted
        localStream.current.getAudioTracks().forEach((t) => { t.enabled = false; });
        setMicOn(false);
        broadcastMuteChange(true);
        toast.warning("Le modérateur a coupé tous les micros.");
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), user_id: "system", user_name: "Système",
          message: "🔇 Le modérateur a coupé tous les micros.",
          created_at: new Date().toISOString(), role: "audience" as ParticipantRole, type: "system" as const,
        }]);
      });

      // ── Co-moderator grant/revoke ──
      ch.on("broadcast", { event: "co_mod_grant" }, ({ payload }) => {
        setCoModId(payload.user_id);
        const msg = `🛡️ ${payload.user_name} est maintenant co-modérateur.`;
        if (payload.user_id === user!.id) toast.success("🛡️ Vous êtes maintenant co-modérateur !");
        else toast.info(msg);
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), user_id: "system", user_name: "Système",
          message: msg, created_at: new Date().toISOString(),
          role: "audience" as ParticipantRole, type: "system" as const,
        }]);
      });
      ch.on("broadcast", { event: "co_mod_revoke" }, ({ payload }) => {
        setCoModId(null);
        if (payload.user_id === user!.id) toast.info("Vos droits de co-modérateur ont été retirés.");
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), user_id: "system", user_name: "Système",
          message: "🛡️ Le co-modérateur a été révoqué.",
          created_at: new Date().toISOString(), role: "audience" as ParticipantRole, type: "system" as const,
        }]);
      });

      // ── Pass the floor ──
      ch.on("broadcast", { event: "pass_floor" }, ({ payload }) => {
        if (payload.user_id === user!.id) toast.success("🎙️ La parole vous a été passée !");
        setParticipants((prev) =>
          prev.map((p) => p.user_id === payload.user_id ? { ...p, role: "speaker" as ParticipantRole, hand_raised: false } : p)
        );
        if (payload.user_id === user!.id) setMyRole("speaker");
        const name = participantsRef.current.find(p => p.user_id === payload.user_id)?.user_name ?? "Quelqu'un";
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), user_id: "system", user_name: "Système",
          message: `🎙️ La parole a été passée à ${name}.`,
          created_at: new Date().toISOString(), role: "audience" as ParticipantRole, type: "system" as const,
        }]);
      });

      // ── Poll events (displayed in chat) ──
      ch.on("broadcast", { event: "poll_create" }, ({ payload }) => {
        const poll = payload as Poll;
        setActivePoll(poll);
        setMyVote(null);
        // Inject poll as a special chat message
        setMessages((prev) => [...prev, {
          id: poll.id, user_id: "system", user_name: "Sondage",
          message: poll.question, created_at: new Date().toISOString(),
          role: "audience" as ParticipantRole, type: "poll" as const, poll,
        }]);
        setShowChat(true);
        toast.info("📊 Un sondage a été lancé !");
      });
      ch.on("broadcast", { event: "poll_vote" }, ({ payload }) => {
        setActivePoll((prev) => {
          if (!prev || prev.id !== payload.poll_id) return prev;
          const newVotes = { ...prev.votes };
          const key = String(payload.option);
          newVotes[key] = (newVotes[key] ?? 0) + 1;
          const updated = { ...prev, votes: newVotes, voterIds: [...prev.voterIds, payload.voter_id] };
          // Update poll inside the chat message
          setMessages((msgs) => msgs.map((m) =>
            m.type === "poll" && m.poll?.id === payload.poll_id ? { ...m, poll: updated } : m
          ));
          return updated;
        });
      });
      ch.on("broadcast", { event: "poll_close" }, ({ payload }) => {
        setActivePoll((prev) => {
          if (!prev || prev.id !== payload.poll_id) return prev;
          const updated = { ...prev, closed: true };
          setMessages((msgs) => msgs.map((m) =>
            m.type === "poll" && m.poll?.id === payload.poll_id ? { ...m, poll: updated } : m
          ));
          return updated;
        });
        toast.info("📊 Le sondage est terminé.");
      });

      // ── WebRTC signaling ──
      ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = getOrCreatePeer(payload.from, ch);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({ type: "broadcast", event: "answer", payload: { from: user!.id, to: payload.from, sdp: answer } });
        } catch (e) { console.error("offer", e); }
      });
      ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        try { await peers[payload.from]?.setRemoteDescription(new RTCSessionDescription(payload.sdp)); }
        catch (e) { console.error("answer", e); }
      });
      ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        try { await peers[payload.from]?.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
        catch (e) { console.error("ice", e); }
      });

      // ── Presence ──
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const list: Participant[] = Object.values(state).flat().map((p: any) => ({
          user_id: p.user_id, user_name: p.user_name,
          role: p.role ?? "audience", hand_raised: p.hand_raised ?? false,
          is_muted: p.is_muted ?? true, is_video_off: p.is_video_off ?? true,
          joined_at: p.joined_at ?? "",
        }));
        setParticipants(list);
      });
      ch.on("presence", { event: "join" }, ({ newPresences }) => {
        const incoming = newPresences as any[];
        setParticipants((prev) => {
          const ids = new Set(prev.map((p) => p.user_id));
          const added = incoming.filter((p) => !ids.has(p.user_id)).map((p) => ({
            user_id: p.user_id, user_name: p.user_name,
            role: p.role ?? "audience", hand_raised: false,
            is_muted: true, is_video_off: true, joined_at: p.joined_at ?? "",
          }));
          const next = [...prev, ...added];
          maxParticipantsRef.current = Math.max(maxParticipantsRef.current, next.length);
          return next;
        });
        // Announce join (not self)
        incoming.forEach((p) => {
          if (p.user_id !== user!.id) {
            toast(`👋 ${p.user_name} a rejoint la conférence`, { duration: 3000 });
            setTimeout(() => initiateOffer(p.user_id, ch), 300);
          }
        });
      });
      ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
        const gone = new Set((leftPresences as any[]).map((p) => p.user_id));
        const goneList = leftPresences as any[];
        setParticipants((prev) => prev.filter((p) => !gone.has(p.user_id)));
        gone.forEach((id) => {
          peers[id]?.close(); delete peers[id]; cleanupPeerAnalyser(id);
        });
        goneList.forEach((p) => {
          if (p.user_id !== user!.id) {
            toast(`${p.user_name} a quitté la conférence`, { duration: 2500 });
          }
        });
      });

      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            user_id: user!.id, user_name: userName, role,
            hand_raised: false, is_muted: true, joined_at: new Date().toISOString(),
          });
        }
      });

      channelRef.current = ch;
    },
    [user, userName, getOrCreatePeer, initiateOffer, fetchConfs]
  );

  // ─── Media controls ───────────────────────────────────────────────────────

  const toggleMic = async () => {
    if (micOn) {
      // Mute: disable the track (keeps the RTCRtpSender alive, avoids renegotiation)
      localStream.current.getAudioTracks().forEach((t) => { t.enabled = false; });
      setMicOn(false);
      broadcastMuteChange(true);
      return;
    }

    try {
      const audioBase: MediaTrackConstraints = {
        noiseSuppression: noiseSuppressionOn,
        echoCancellation: true,
        autoGainControl: true,
        ...(selAudioIn ? { deviceId: { exact: selAudioIn } } : {}),
      };
      const audioConstraints: MediaStreamConstraints = { audio: audioBase };

      const got = await navigator.mediaDevices.getUserMedia(audioConstraints);
      await refreshDevices(); // labels now available after permission granted

      const newTrack = got.getAudioTracks()[0];
      newTrack.enabled = true;

      // Remove & stop old audio tracks from localStream
      const old = localStream.current.getAudioTracks();
      old.forEach((t) => { t.stop(); localStream.current.removeTrack(t); });

      localStream.current.addTrack(newTrack);

      // Push track into every existing peer connection
      replaceTrackInAllPeers(newTrack, "audio");

      setMicOn(true);
      broadcastMuteChange(false);
    } catch (err: any) {
      console.error("mic error", err);
      toast.error("Micro inaccessible : " + (err?.name ?? err?.message ?? String(err)));
    }
  };

  const toggleCam = async () => {
    if (camOn) {
      localStream.current.getVideoTracks().forEach((t) => {
        t.stop();
        localStream.current.removeTrack(t);
      });
      replaceTrackInAllPeers(null, "video");
      setCamOn(false);
      syncLocalVideo();
      broadcastVideoOff(true);
      return;
    }

    try {
      // ⚠️ Do NOT pass audio:false — pass only video constraints
      const got = await navigator.mediaDevices.getUserMedia({ video: true });
      await refreshDevices();

      const newTrack = got.getVideoTracks()[0];
      localStream.current.getVideoTracks().forEach((t) => {
        t.stop();
        localStream.current.removeTrack(t);
      });
      localStream.current.addTrack(newTrack);

      replaceTrackInAllPeers(newTrack, "video");
      setCamOn(true);
      syncLocalVideo();
      broadcastVideoOff(false);
    } catch (err: any) {
      console.error("cam error", err);
      toast.error("Caméra inaccessible : " + (err?.name ?? err?.message ?? String(err)));
    }
  };

  const toggleScreen = async () => {
    if (screenOn) { stopScreen(); return; }

    try {
      const got = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = got.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;

      // Swap video track inside localStream so srcObject auto-updates
      localStream.current.getVideoTracks().forEach((t) => localStream.current.removeTrack(t));
      localStream.current.addTrack(screenTrack);

      replaceTrackInAllPeers(screenTrack, "video");
      setScreenOn(true);
      syncLocalVideo();

      screenTrack.onended = stopScreen;
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        toast.error("Partage d'écran : " + (err?.message ?? String(err)));
      }
    }
  };

  const stopScreen = () => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    // Remove screen track from localStream
    localStream.current.getVideoTracks().forEach((t) => {
      t.stop();
      localStream.current.removeTrack(t);
    });

    if (camOn) {
      // Re-acquire camera
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        const camTrack = s.getVideoTracks()[0];
        localStream.current.addTrack(camTrack);
        replaceTrackInAllPeers(camTrack, "video");
        syncLocalVideo();
      }).catch(() => { replaceTrackInAllPeers(null, "video"); syncLocalVideo(); });
    } else {
      replaceTrackInAllPeers(null, "video");
      syncLocalVideo();
    }
    setScreenOn(false);
  };

  // ─── System message helper (local only, not broadcast) ──────────────────
  const addSystemMsg = useCallback((message: string) => {
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(), user_id: "system", user_name: "Système",
      message, created_at: new Date().toISOString(),
      role: "audience" as ParticipantRole, type: "system" as const,
    }]);
  }, []);

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  const broadcastMuteChange = (muted: boolean) => {
    channelRef.current?.send({
      type: "broadcast", event: "mute_change",
      payload: { user_id: user!.id, muted },
    });
  };

  const broadcastVideoOff = (off: boolean) => {
    channelRef.current?.send({
      type: "broadcast", event: "video_change",
      payload: { user_id: user!.id, video_off: off },
    });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(), user_id: user!.id, user_name: userName,
      message: chatInput.trim(), created_at: new Date().toISOString(), role: myRole,
    };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setMessages((prev) => [...prev, msg]);
    setChatInput("");
  };

  const sendReaction = (emoji: string) => {
    const r = { id: crypto.randomUUID(), emoji, userName };
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: r });
    // Also show locally
    const local: FloatingReaction = { ...r, x: 10 + Math.random() * 80 };
    setFloatingReactions((prev) => [...prev, local]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((f) => f.id !== local.id)), 3000);
  };

  const toggleHand = () => {
    const raised = !handRaised;
    setHandRaised(raised);
    channelRef.current?.send({
      type: "broadcast", event: "hand",
      payload: { user_id: user!.id, raised },
    });
  };

  const promoteToSpeaker = (targetId: string) => {
    channelRef.current?.send({
      type: "broadcast", event: "role_change",
      payload: { user_id: targetId, role: "speaker" },
    });
    setParticipants((prev) =>
      prev.map((p) => p.user_id === targetId ? { ...p, role: "speaker", hand_raised: false } : p)
    );
    toast.success("Speaker promu !");
  };

  const demoteToAudience = (targetId: string) => {
    channelRef.current?.send({
      type: "broadcast", event: "role_change",
      payload: { user_id: targetId, role: "audience" },
    });
    setParticipants((prev) => prev.map((p) => p.user_id === targetId ? { ...p, role: "audience" } : p));
  };

  const forceMute = (targetId: string) => {
    channelRef.current?.send({ type: "broadcast", event: "force_mute", payload: { user_id: targetId } });
    setParticipants((prev) => prev.map((p) => p.user_id === targetId ? { ...p, is_muted: true } : p));
  };

  const globalMuteAll = () => {
    channelRef.current?.send({
      type: "broadcast", event: "force_mute_all",
      payload: { user_id: user!.id }, // moderator's own id → excluded from mute
    });
    // Mute all other speakers/moderators locally
    setParticipants((prev) =>
      prev.map((p) => p.user_id !== user!.id ? { ...p, is_muted: true } : p)
    );
    toast.success("Tous les micros ont été coupés.");
  };

  const grantCoMod = (targetId: string, targetName: string) => {
    channelRef.current?.send({
      type: "broadcast", event: "co_mod_grant",
      payload: { user_id: targetId, user_name: targetName },
    });
    setCoModId(targetId);
  };

  const revokeCoMod = () => {
    channelRef.current?.send({
      type: "broadcast", event: "co_mod_revoke",
      payload: { user_id: coModId },
    });
    setCoModId(null);
  };

  const passFloor = (targetId: string) => {
    channelRef.current?.send({
      type: "broadcast", event: "pass_floor",
      payload: { user_id: targetId },
    });
    setParticipants((prev) =>
      prev.map((p) => p.user_id === targetId ? { ...p, role: "speaker" as ParticipantRole, hand_raised: false } : p)
    );
    toast.success("Parole passée !");
  };

  // ── Polls ──
  const launchPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) return;
    const poll: Poll = {
      id: crypto.randomUUID(),
      question: pollQuestion.trim(),
      options: pollOptions.filter((o) => o.trim()),
      votes: {},
      voterIds: [],
      closed: false,
      created_by: user!.id,
    };
    channelRef.current?.send({ type: "broadcast", event: "poll_create", payload: poll });
    setActivePoll(poll);
    setMyVote(null);
    // Inject poll into own chat (others get it via broadcast handler)
    setMessages((prev) => [...prev, {
      id: poll.id, user_id: "system", user_name: "Sondage",
      message: poll.question, created_at: new Date().toISOString(),
      role: "audience" as ParticipantRole, type: "poll" as const, poll,
    }]);
    setShowPollCreator(false);
    setShowChat(true);
    setPollQuestion("");
    setPollOptions(["", ""]);
    toast.success("📊 Sondage lancé !");
  };

  const votePoll = (optionIndex: number) => {
    if (!activePoll || activePoll.closed || myVote !== null) return;
    const userId = user?.id ?? "guest";
    if (activePoll.voterIds.includes(userId)) return;
    channelRef.current?.send({
      type: "broadcast", event: "poll_vote",
      payload: { poll_id: activePoll.id, option: optionIndex, voter_id: userId },
    });
    setActivePoll((prev) => {
      if (!prev) return prev;
      const newVotes = { ...prev.votes };
      const key = String(optionIndex);
      newVotes[key] = (newVotes[key] ?? 0) + 1;
      const updated = { ...prev, votes: newVotes, voterIds: [...prev.voterIds, userId] };
      setMessages((msgs) => msgs.map((m) =>
        m.type === "poll" && m.poll?.id === prev.id ? { ...m, poll: updated } : m
      ));
      return updated;
    });
    setMyVote(optionIndex);
  };

  const closePoll = () => {
    if (!activePoll) return;
    channelRef.current?.send({
      type: "broadcast", event: "poll_close",
      payload: { poll_id: activePoll.id },
    });
    setActivePoll((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, closed: true };
      setMessages((msgs) => msgs.map((m) =>
        m.type === "poll" && m.poll?.id === prev.id ? { ...m, poll: updated } : m
      ));
      return updated;
    });
  };

  // ── Fullscreen ──
  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await fullscreenContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch { toast.error("Plein écran non supporté."); }
  };

  // ── Picture-in-Picture ──
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
        return;
      }
      // Find best video element: active speaker or local
      const activeVideoEl = activeSpeakerId
        ? remoteVideoRefs.current[activeSpeakerId]
        : localVideoRef.current;
      const el = activeVideoEl ?? localVideoRef.current;
      if (!el) return;
      if (!("requestPictureInPicture" in el)) {
        toast.error("Picture-in-Picture non supporté par ce navigateur.");
        return;
      }
      await (el as HTMLVideoElement).requestPictureInPicture();
      setIsPiP(true);
      el.addEventListener("leavepictureinpicture", () => setIsPiP(false), { once: true });
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") toast.error("PiP non disponible.");
    }
  };

  // ── Low bandwidth: pause remote video tracks ──
  const toggleLowBandwidth = () => {
    const next = !lowBandwidth;
    setLowBandwidth(next);
    // Disable/enable video on all remote <video> elements (doesn't stop the track, just pauses rendering)
    Object.values(remoteVideoRefs.current).forEach((vid) => {
      if (vid) {
        if (next) vid.pause();
        else vid.play().catch(() => {});
      }
    });
    toast.info(next ? "Mode bande passante réduite activé" : "Vidéo réactivée");
  };

  // ─── Conference lifecycle ─────────────────────────────────────────────────

  const handleCreateClick = () => {
    if (!newTitle.trim()) return;
    setPreCallConf(null);
    setPreCallIsCreate(true);
    setShowPreCall(true);
  };

  const createConference = async (audioIn: string, audioOut: string) => {
    setShowPreCall(false);
    setSelAudioIn(audioIn);
    setSelAudioOut(audioOut);
    setCreating(true);
    const id = crypto.randomUUID();
    const conf: DBConference = {
      id, title: newTitle.trim(), status: "live",
      host_id: user!.id, host_name: userName,
      created_at: new Date().toISOString(), ended_at: null,
      guest_allowed: guestAllowedForm,
    };
    await supabase.from("conferences").insert({
      id, title: conf.title, status: "live", host_id: user!.id, host_name: userName,
      guest_allowed: guestAllowedForm,
    }).then(({ error }) => { if (error) console.warn("conferences table:", error.message); });

    setActiveConf(conf);
    setMyRole("moderator");
    setInConference(true);
    setMinimized(false);
    setupChannel(id, "moderator");
    setCreating(false);
    setNewTitle("");
    toast.success("🎙️ Conférence démarrée !");
  };

  const handleJoinClick = (conf: DBConference) => {
    if (!user) {
      // Non-authenticated → guest dialog (only reachable if conf.guest_allowed)
      setGuestConf(conf);
      setShowGuestDialog(true);
      return;
    }
    setPreCallConf(conf);
    setPreCallIsCreate(false);
    setShowPreCall(true);
  };

  const joinConference = (conf: DBConference, audioIn: string, audioOut: string) => {
    setShowPreCall(false);
    setSelAudioIn(audioIn);
    setSelAudioOut(audioOut);
    const role: ParticipantRole = isBDLExec ? "moderator" : "audience";
    setActiveConf(conf);
    setMyRole(role);
    setInConference(true);
    setMinimized(false);
    setupChannel(conf.id, role);
    toast.success("Conférence rejointe !");
  };

  const joinAsGuest = (conf: DBConference, name: string) => {
    setShowGuestDialog(false);
    setGuestConf(null);
    // Use a random guest ID for presence (no Supabase auth)
    const guestId = "guest-" + crypto.randomUUID().slice(0, 8);
    const role: ParticipantRole = "audience";
    setActiveConf(conf);
    setMyRole(role);
    setInConference(true);
    setMinimized(false);
    // Override userName for this session
    setUserName(name || "Invité");
    // Build a minimal "user" substitute via presence only
    const ch = supabase.channel(`conf:${conf.id}`, {
      config: { broadcast: { self: false }, presence: { key: guestId } },
    });
    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      setMessages((prev) => [...prev, payload as ChatMessage]);
      setUnread((u) => u + 1);
    });
    ch.on("broadcast", { event: "reaction" }, ({ payload }) => {
      const r: FloatingReaction = { id: payload.id, emoji: payload.emoji, userName: payload.userName, x: 10 + Math.random() * 80 };
      setFloatingReactions((prev) => [...prev, r]);
      setTimeout(() => setFloatingReactions((prev) => prev.filter((f) => f.id !== r.id)), 3000);
    });
    ch.on("broadcast", { event: "conf_end" }, () => {
      toast.info("La conférence est terminée.");
      doCleanup(false);
      setInConference(false);
      setMinimized(false);
      setActiveConf(null);
      fetchConfs();
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const list: Participant[] = Object.values(state).flat().map((p: any) => ({
        user_id: p.user_id, user_name: p.user_name,
        role: p.role ?? "audience", hand_raised: p.hand_raised ?? false,
        is_muted: p.is_muted ?? true, is_video_off: p.is_video_off ?? true,
        joined_at: p.joined_at ?? "",
      }));
      setParticipants(list);
    });
    ch.on("presence", { event: "join" }, ({ newPresences }) => {
      const incoming = newPresences as any[];
      setParticipants((prev) => {
        const ids = new Set(prev.map((p) => p.user_id));
        return [...prev, ...incoming.filter((p) => !ids.has(p.user_id)).map((p) => ({
          user_id: p.user_id, user_name: p.user_name, role: p.role ?? "audience",
          hand_raised: false, is_muted: true, is_video_off: true, joined_at: "",
        }))];
      });
    });
    ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
      const gone = new Set((leftPresences as any[]).map((p) => p.user_id));
      setParticipants((prev) => prev.filter((p) => !gone.has(p.user_id)));
      gone.forEach((id) => { peers[id]?.close(); delete peers[id]; cleanupPeerAnalyser(id); });
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: guestId, user_name: name || "Invité", role, hand_raised: false, is_muted: true, joined_at: new Date().toISOString() });
      }
    });
    channelRef.current = ch;
    toast.success("Conférence rejointe en tant qu'invité !");
  };

  const buildSummary = (): SessionSummary => {
    const now = new Date();
    const startMs = confStartRef.current ?? now.getTime();
    const totalSec = Math.floor((now.getTime() - startMs) / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return {
      duration: `${mm}:${ss}`,
      participantCount: participants.length,
      maxParticipants: maxParticipantsRef.current,
      messageCount: messageCountRef.current,
      startTime: new Date(startMs),
      endTime: now,
    };
  };

  const endConference = async () => {
    const summary = buildSummary();
    channelRef.current?.send({ type: "broadcast", event: "conf_end", payload: {} });
    if (activeConf) {
      await supabase.from("conferences")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", activeConf.id);
    }
    doCleanup(true);
    setInConference(false);
    setMinimized(false);
    setActiveConf(null);
    setSessionSummary(summary);
    setShowSummary(true);
    fetchConfs();
  };

  const leaveConference = () => {
    const summary = buildSummary();
    doCleanup(true);
    setInConference(false);
    setMinimized(false);
    setActiveConf(null);
    setSessionSummary(summary);
    setShowSummary(true);
    toast.info("Vous avez quitté la conférence.");
  };

  const doCleanup = (removeChannel: boolean) => {
    localStream.current.getTracks().forEach((t) => t.stop());
    // Reset the stream object for reuse
    localStream.current.getTracks().forEach((t) => localStream.current.removeTrack(t));
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    setMicOn(false); setCamOn(false); setScreenOn(false);
    setHandRaised(false); setMessages([]); setParticipants([]); setUnread(0);

    Object.values(peers).forEach((pc) => pc.close());
    Object.keys(peers).forEach((k) => delete peers[k]);

    if (removeChannel && channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  useEffect(() => () => doCleanup(true), []);

  // ── Start/stop stats with conference ──────────────────────────────────────
  useEffect(() => {
    if (inConference) startStats();
    else stopStats();
  }, [inConference, startStats, stopStats]);

  // ── Max participants tracker ──────────────────────────────────────────────
  useEffect(() => {
    maxParticipantsRef.current = Math.max(maxParticipantsRef.current, participants.length);
  }, [participants.length]);

  // ── Message count tracker ─────────────────────────────────────────────────
  useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages.length]);

  // ── Fullscreen change listener ────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── URL ?join=confId — auto-open pre-call for shared links ────────────────
  useEffect(() => {
    const joinId = searchParams.get("join");
    if (!joinId || inConference) return;
    (async () => {
      const { data } = await supabase
        .from("conferences")
        .select("*")
        .eq("id", joinId)
        .eq("status", "live")
        .maybeSingle();
      if (!data) { toast.error("Cette conférence n'existe pas ou est terminée."); return; }
      const conf = data as DBConference;
      if (!user && !conf.guest_allowed) { navigate("/auth"); return; }
      if (!user && conf.guest_allowed) { setGuestConf(conf); setShowGuestDialog(true); return; }
      setPreCallConf(conf); setPreCallIsCreate(false); setShowPreCall(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Volume polling (speaking detection) ─────────────────────────────────
  // Volumes go to refs only — state is only updated when the speaking set actually changes
  // This eliminates the 8 re-renders/sec that caused the conference to freeze.
  useEffect(() => {
    if (!inConference) return;
    const THRESHOLD = 8;
    const interval = setInterval(() => {
      const vols: Record<string, number> = {};
      for (const [id, { analyser, data }] of Object.entries(peerAnalysers.current)) {
        analyser.getByteFrequencyData(data);
        vols[id] = data.reduce((a, b) => a + b, 0) / data.length;
      }
      peerVolumesRef.current = vols;

      if (localAnalyserRef.current) {
        const { analyser, data } = localAnalyserRef.current;
        analyser.getByteFrequencyData(data);
        localVolumeRef.current = data.reduce((a, b) => a + b, 0) / data.length;
      }

      // Compute new speaking set
      const curParts = participantsRef.current;
      const newSpeaking = new Set<string>();
      if (localVolumeRef.current > THRESHOLD) newSpeaking.add("__local__");
      for (const [id, vol] of Object.entries(vols)) {
        const p = curParts.find((pp) => pp.user_id === id);
        if (vol > THRESHOLD && (!p || !p.is_muted)) newSpeaking.add(id);
      }

      // Only setState if set actually changed (avoids re-renders when nobody is speaking)
      setSpeakingSet((prev) => {
        if (prev.size === newSpeaking.size && [...newSpeaking].every((id) => prev.has(id))) return prev;
        return newSpeaking;
      });

      // Active speaker: highest-volume non-muted remote peer
      let maxVol = THRESHOLD;
      let bestId: string | null = null;
      for (const [id, vol] of Object.entries(vols)) {
        const p = curParts.find((pp) => pp.user_id === id);
        if (vol > maxVol && (!p || !p.is_muted)) { maxVol = vol; bestId = id; }
      }
      setActiveSpeakerId((prev) => (prev !== bestId ? bestId : prev));
    }, 250);
    return () => clearInterval(interval);
  }, [inConference]);

  // Attach local analyser when mic turns on
  useEffect(() => {
    if (!micOn) { localAnalyserRef.current = null; setLocalVolume(0); return; }
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(localStream.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      localAnalyserRef.current = { analyser, data };
    } catch { /* optional */ }
  }, [micOn]);

  // Cleanup peer analysers when peer leaves
  const cleanupPeerAnalyser = (peerId: string) => {
    const a = peerAnalysers.current[peerId];
    if (a) { try { a.ctx.close(); } catch {} delete peerAnalysers.current[peerId]; }
  };

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inConference) { confStartRef.current = null; setTimerStr("00:00"); return; }
    if (!confStartRef.current) confStartRef.current = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - confStartRef.current!) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setTimerStr(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(t);
  }, [inConference]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    if (!inConference) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") toggleMic();
      if (e.key === "c" || e.key === "C") toggleCam();
      if (e.key === "h" || e.key === "H") toggleHand();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inConference, toggleMic, toggleCam, toggleHand]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const isModerator = myRole === "moderator";
  const isSpeaker = myRole === "speaker" || myRole === "moderator";
  const raisedHands = participants.filter(
    (p) => p.hand_raised && p.role === "audience" && p.user_id !== user?.id
  );

  // ─── Loading gate ─────────────────────────────────────────────────────────

  // activeSpeakerId is now a useState, computed inside the volume polling interval (above)

  const isSpeaking = (userId: string) => {
    if (userId === user?.id || userId === "") return speakingSet.has("__local__");
    return speakingSet.has(userId);
  };

  if (showGuestDialog && guestConf) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />Rejoindre en tant qu'invité
            </h2>
            <p className="text-sm text-muted-foreground mt-1 truncate">{guestConf.title}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Votre prénom</label>
              <Input
                placeholder="Ex: Marie"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && guestName.trim() && joinAsGuest(guestConf, guestName.trim())}
                autoFocus
                maxLength={40}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Vous rejoignez en tant qu'auditeur. Pas besoin de compte BDL.
            </p>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={() => { setShowGuestDialog(false); setGuestConf(null); }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Annuler
            </button>
            <button
              onClick={() => guestName.trim() && joinAsGuest(guestConf, guestName.trim())}
              disabled={!guestName.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />Rejoindre
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPreCall) {
    return (
      <PreCallSetup
        confTitle={preCallIsCreate ? newTitle : (preCallConf?.title ?? "")}
        isCreate={preCallIsCreate}
        defaultAudioIn={selAudioIn}
        defaultAudioOut={selAudioOut}
        onConfirm={(audioIn, audioOut) => {
          if (preCallIsCreate) createConference(audioIn, audioOut);
          else if (preCallConf) joinConference(preCallConf, audioIn, audioOut);
        }}
        onCancel={() => setShowPreCall(false)}
      />
    );
  }

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINIMIZED PILL — shown when navigating away while in a call
  // ═══════════════════════════════════════════════════════════════════════════

  const MinimizedPill = () => (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full shadow-2xl px-4 py-2.5 cursor-pointer hover:bg-primary/90 transition-all group"
      onClick={() => { navigate("/conference"); setMinimized(false); }}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-400" />
      </span>
      <Radio className="h-4 w-4" />
      <span className="text-sm font-medium max-w-[160px] truncate">{activeConf?.title}</span>
      <Maximize2 className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
      <button
        onClick={(e) => { e.stopPropagation(); leaveConference(); }}
        className="ml-1 text-primary-foreground/70 hover:text-primary-foreground"
        title="Quitter"
      >
        <PhoneOff className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ═══════════════════════════════════════════════════════════════════════════

  if (!inConference || (inConference && minimized)) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />

        {inConference && minimized && <MinimizedPill />}

        {/* Hero */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-sm font-medium">
              <Radio className="h-4 w-4" />
              Système de Visioconférence BDL
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Salle de Conférence</h1>
            <p className="text-xl text-white/80 max-w-xl mx-auto">
              Réunions en direct pour le Bureau des Lycéens et les membres de l'établissement.
            </p>
          </div>
        </section>

        <section className="py-12 flex-1">
          <div className="container mx-auto px-4 max-w-5xl space-y-8">

            {/* Re-open active call */}
            {inConference && minimized && (
              <Card className="shadow-card border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{activeConf?.title}</p>
                      <p className="text-sm text-muted-foreground">Vous êtes toujours en conférence</p>
                    </div>
                  </div>
                  <Button onClick={() => setMinimized(false)}>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Reprendre
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Create (BDL exec only, not if minimized in a call) */}
            {isBDLExec && !minimized && (
              <Card className="shadow-card border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Démarrer une nouvelle conférence
                  </CardTitle>
                  <CardDescription>
                    En tant que membre de l'exécutif, vous pouvez lancer et modérer une conférence.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Thème de la réunion…"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateClick()}
                      className="flex-1"
                    />
                    <Button onClick={handleCreateClick} disabled={creating || !newTitle.trim()}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
                      Lancer
                    </Button>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={guestAllowedForm}
                      onChange={(e) => setGuestAllowedForm(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      Autoriser les invités sans compte BDL
                    </span>
                  </label>
                </CardContent>
              </Card>
            )}

            {/* Live conferences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Conférences en cours</h2>
                <Button variant="ghost" size="sm" onClick={fetchConfs}>Actualiser</Button>
              </div>

              {liveConfs.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-16 text-center space-y-3">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">Aucune conférence en cours.</p>
                    <p className="text-sm text-muted-foreground">
                      {isBDLExec
                        ? "Lancez une conférence pour rassembler les membres."
                        : "Les conférences actives apparaîtront ici automatiquement."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {liveConfs.map((conf) => (
                    <Card key={conf.id} className="shadow-card border-2 border-green-100 hover:border-green-200 transition-colors">
                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                            </span>
                            <span className="text-xs text-green-600 font-bold uppercase tracking-wide">EN DIRECT</span>
                          </div>
                          <h3 className="font-bold text-lg">{conf.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-amber-500" />{conf.host_name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {new Date(conf.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {user ? (
                          <Button className="w-full" onClick={() => handleJoinClick(conf)}>
                            <LogIn className="h-4 w-4 mr-2" />Rejoindre
                          </Button>
                        ) : conf.guest_allowed ? (
                          <Button variant="outline" className="w-full" onClick={() => handleJoinClick(conf)}>
                            <LogIn className="h-4 w-4 mr-2" />Rejoindre en invité
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full opacity-50" disabled>
                            Connexion requise
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <Card className="bg-muted/40 border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Comment ça fonctionne ?</p>
                  <p>
                    Les membres de l'exécutif BDL peuvent démarrer une conférence. Les auditeurs peuvent réagir
                    via le chat ou lever la main pour prendre la parole. Vous pouvez minimiser la conférence
                    pour naviguer sur le site sans être déconnecté.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IN-CONFERENCE VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div ref={fullscreenContainerRef} className="h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-red-600 text-xs font-bold uppercase tracking-wider flex-shrink-0">EN DIRECT</span>
          <span className="text-foreground font-semibold truncate">{activeConf?.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono text-muted-foreground tabular-nums">{timerStr}</span>
          <Badge variant="outline" className="text-xs gap-1">
            <Users className="h-3 w-3" />{participants.length}
          </Badge>

          {/* Network quality indicator */}
          <div
            title={`Qualité réseau: ${overallQuality === "good" ? "Bonne" : overallQuality === "medium" ? "Moyenne" : overallQuality === "bad" ? "Mauvaise" : "Inconnue"}`}
            className="flex items-center gap-0.5 cursor-default"
          >
            {overallQuality === "good" && <Wifi className="h-4 w-4 text-green-500" />}
            {overallQuality === "medium" && <Wifi className="h-4 w-4 text-amber-500" />}
            {overallQuality === "bad" && <WifiOff className="h-4 w-4 text-red-500" />}
            {overallQuality === "unknown" && <Wifi className="h-4 w-4 text-muted-foreground/40" />}
          </div>

          <RoleBadge role={myRole} />
          {coModId === user?.id && (
            <Badge className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200">Co-mod</Badge>
          )}

          {/* View toggle */}
          <button
            onClick={() => setViewMode((v) => v === "gallery" ? "speaker" : "gallery")}
            title={viewMode === "gallery" ? "Vue speaker" : "Vue grille"}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {viewMode === "gallery" ? <Presentation className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </button>

          {/* Focus mode */}
          <button
            onClick={() => setFocusMode((v) => !v)}
            title={focusMode ? "Quitter le mode focus" : "Mode focus (un seul speaker)"}
            className={`p-1.5 rounded-lg transition-colors ${focusMode ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Focus className="h-4 w-4" />
          </button>

          {/* PiP */}
          <button
            onClick={togglePiP}
            title={isPiP ? "Quitter PiP" : "Picture-in-Picture"}
            className={`p-1.5 rounded-lg transition-colors ${isPiP ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <PictureInPicture2 className="h-4 w-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/conference?join=${activeConf?.id}`;
              try { await navigator.clipboard.writeText(url); toast.success("Lien d'invitation copié !"); } catch {}
            }}
            title="Copier le lien d'invitation"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Link2 className="h-4 w-4" />
          </button>
          {/* Minimize button */}
          <button
            onClick={() => setMinimized(true)}
            title="Naviguer sur le site (reste en conférence)"
            className="ml-1 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Floating reactions overlay ───────────────────────────────────── */}
        {floatingReactions.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                className="absolute bottom-24 animate-bounce"
                style={{ left: `${r.x}%`, animation: "floatUp 3s ease-out forwards" }}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-3xl drop-shadow-lg select-none">{r.emoji}</span>
                  <span className="text-white text-xs font-medium bg-black/40 rounded-full px-2 py-0.5 backdrop-blur-sm">{r.userName.split(" ")[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Video grid ────────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 relative ${focusMode ? "bg-black" : "bg-slate-100 dark:bg-slate-900/50"}`}>

          {/* Focus mode — single large tile */}
          {focusMode && (() => {
            const fId = activeSpeakerId ?? user?.id ?? "local";
            const isLocal = fId === user?.id;
            const focusPart = isLocal ? null : participants.find((p) => p.user_id === fId);
            return (
              <div className="flex-1 relative bg-black flex items-center justify-center">
                {isLocal ? (
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center text-white text-5xl font-bold">{initials(focusPart?.user_name ?? "?")}</div>
                    </div>
                    <video ref={(el) => { if (fId) remoteVideoRefs.current[fId] = el; }} autoPlay playsInline className="w-full h-full object-contain absolute inset-0" />
                  </>
                )}
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-lg font-semibold">{isLocal ? `${userName} (Vous)` : (focusPart?.user_name ?? "")}</span>
                  {isSpeaking(fId) && <span className="ml-2 text-green-400 text-sm">● parle</span>}
                </div>
                <button onClick={() => setFocusMode(false)} className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })()}

          {/* Gallery view */}
          {!focusMode && viewMode === "gallery" && (
          <div className="flex-1 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 content-start overflow-auto">

            {/* Local tile */}
            <div className={`relative bg-slate-800 rounded-2xl overflow-hidden aspect-video group shadow-md transition-all duration-300 ${isSpeaking(user?.id ?? "") ? "ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900" : "border border-slate-700"} ${activeSpeakerId === null && isSpeaking(user?.id ?? "") ? "scale-[1.01]" : ""}`}>
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {!camOn && !screenOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full gradient-institutional flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {initials(userName)}
                  </div>
                </div>
              )}
              {screenOn && (
                <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur rounded-full px-2 py-0.5 text-xs text-white flex items-center gap-1">
                  <Monitor className="h-3 w-3" />Partage d'écran
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-center gap-1.5">
                {micOn ? <Mic className="h-3 w-3 text-green-400 flex-shrink-0" /> : <MicOff className="h-3 w-3 text-red-400 flex-shrink-0" />}
                <span className="text-white text-xs font-medium truncate">{userName} <span className="opacity-60">(Vous)</span></span>
                {myRole === "moderator" && <Crown className="h-3 w-3 text-amber-400" />}
              </div>
            </div>

            {/* Remote tiles (speakers + moderators) */}
            {participants.filter((p) => p.user_id !== user?.id && (p.role === "speaker" || p.role === "moderator")).map((p) => (
              <div key={p.user_id} className={`relative bg-slate-800 rounded-2xl overflow-hidden aspect-video shadow-md group transition-all duration-300 ${isSpeaking(p.user_id) ? "ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900" : "border border-slate-700"} ${activeSpeakerId === p.user_id ? "scale-[1.01]" : ""}`}>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-0">
                  <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-white text-2xl font-bold">{initials(p.user_name)}</div>
                </div>
                <video ref={(el) => { remoteVideoRefs.current[p.user_id] = el; }} autoPlay playsInline className="w-full h-full object-cover absolute inset-0 z-10" />
                {isModerator && p.user_id !== user?.id && (
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 z-20">
                    {!p.is_muted && <button onClick={() => forceMute(p.user_id)} className="bg-background/90 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 rounded-full p-1.5 shadow"><MicOff className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => demoteToAudience(p.user_id)} className="bg-background/90 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600 rounded-full p-1.5 shadow"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-center gap-1.5 z-10">
                  {p.is_muted ? <MicOff className="h-3 w-3 text-red-400 flex-shrink-0" /> : <Mic className="h-3 w-3 text-green-400 flex-shrink-0" />}
                  <span className="text-white text-xs font-medium truncate">{p.user_name}</span>
                  {p.role === "moderator" && <Crown className="h-3 w-3 text-amber-400" />}
                  {isSpeaking(p.user_id) && <span className="ml-auto text-xs text-green-300 font-medium flex items-center gap-0.5">● parle</span>}
                </div>
              </div>
            ))}

            {/* Audience tiles */}
            {participants.filter((p) => p.user_id !== user?.id && p.role === "audience").map((p) => (
              <div key={p.user_id} className="relative bg-slate-50 dark:bg-slate-800/60 rounded-2xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-600 mx-auto flex items-center justify-center text-slate-600 dark:text-slate-200 font-bold text-lg">{initials(p.user_name)}</div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs px-2 truncate">{p.user_name}</p>
                  {p.hand_raised && <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium animate-bounce"><Hand className="h-3.5 w-3.5" />Lève la main</div>}
                </div>
                {isModerator && p.hand_raised && (
                  <button onClick={() => promoteToSpeaker(p.user_id)} className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-500 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1 shadow transition-colors">
                    <Check className="h-3 w-3" />Accepter
                  </button>
                )}
              </div>
            ))}
          </div>
          )}

          {/* Speaker view */}
          {!focusMode && viewMode === "speaker" && (() => {
            const speakerId = activeSpeakerId ?? (participants.find((p) => p.role === "moderator" || p.role === "speaker")?.user_id ?? "local");
            const isLocal = speakerId === "local" || speakerId === user?.id;
            const others = participants.filter((p) => p.user_id !== (isLocal ? user?.id ?? "local" : speakerId));
            return (
              <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
                {/* Main large tile */}
                <div className={`relative bg-slate-800 rounded-2xl overflow-hidden flex-1 min-h-0 shadow-xl ${isSpeaking(isLocal ? user?.id ?? "" : speakerId) ? "ring-2 ring-green-400" : ""}`}>
                  {isLocal ? (
                    <>
                      <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      {!camOn && !screenOn && <div className="absolute inset-0 flex items-center justify-center"><div className="w-28 h-28 rounded-full gradient-institutional flex items-center justify-center text-white text-4xl font-bold shadow-lg">{initials(userName)}</div></div>}
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><div className="w-28 h-28 rounded-full bg-slate-600 flex items-center justify-center text-white text-4xl font-bold">{initials(participants.find((p) => p.user_id === speakerId)?.user_name ?? "?")}</div></div>
                      <video ref={(el) => { remoteVideoRefs.current[speakerId] = el; }} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />
                    </>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <span className="text-white font-semibold">{isLocal ? `${userName} (Vous)` : (participants.find((p) => p.user_id === speakerId)?.user_name ?? "")}</span>
                    {isSpeaking(isLocal ? user?.id ?? "" : speakerId) && <span className="ml-2 text-green-300 text-sm">● parle</span>}
                  </div>
                </div>
                {/* Thumbnail strip */}
                {others.length > 0 && (
                  <div className="flex gap-2 h-24 overflow-x-auto flex-shrink-0">
                    {others.map((p) => (
                      <div key={p.user_id} onClick={() => {/* clicking a thumb doesn't switch speaker — active speaker auto-switches */}}
                        className={`relative bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 aspect-video h-full cursor-pointer group ${isSpeaking(p.user_id) ? "ring-2 ring-green-400" : "border border-slate-700"}`}>
                        <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold">{initials(p.user_name)}</div></div>
                        <video ref={(el) => { remoteVideoRefs.current[p.user_id] = el; }} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                          <span className="text-white text-[10px] truncate block">{p.user_name.split(" ")[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Controls bar ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-background border-t border-border px-4 py-3 space-y-2 shadow-sm">

            {/* Raised-hand alert */}
            {isModerator && raisedHands.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <Hand className="h-4 w-4 text-amber-600 flex-shrink-0 animate-bounce" />
                <span className="text-amber-700 text-sm flex-1 font-medium">
                  {raisedHands.length} personne{raisedHands.length > 1 ? "s" : ""} lève{raisedHands.length > 1 ? "nt" : ""} la main
                </span>
                <div className="flex gap-1 flex-wrap">
                  {raisedHands.slice(0, 3).map((p) => (
                    <button key={p.user_id} onClick={() => promoteToSpeaker(p.user_id)}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg px-2 py-0.5 flex items-center gap-1 transition-colors">
                      <Check className="h-3 w-3" />{p.user_name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">

              <CtrlBtn on={micOn} onClick={toggleMic}
                icon={micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                label={micOn ? "Micro" : "Micro off"}
                color={micOn ? "neutral" : "neutral"}
              />

              <CtrlBtn on={camOn} onClick={toggleCam}
                icon={camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                label="Caméra"
              />

              <CtrlBtn on={screenOn} onClick={toggleScreen}
                icon={screenOn ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                label={screenOn ? "Arrêter" : "Écran"}
                color={screenOn ? "green" : "neutral"}
              />

              {/* Moderator tools */}
              {(isModerator || coModId === user?.id) && (
                <>
                  <CtrlBtn on={false} onClick={globalMuteAll}
                    icon={<VolumeX className="h-5 w-5" />}
                    label="Mute tous"
                    color="neutral"
                  />
                  <CtrlBtn on={showPollCreator} onClick={() => { setShowPollCreator((v) => !v); setShowChat(true); setShowPeers(false); }}
                    icon={<BarChart2 className="h-5 w-5" />}
                    label="Sondage"
                    color="neutral"
                  />
                </>
              )}

              {/* Low bandwidth */}
              <CtrlBtn on={lowBandwidth} onClick={toggleLowBandwidth}
                icon={lowBandwidth ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
                label={lowBandwidth ? "Éco bande" : "Bande passante"}
                color={lowBandwidth ? "amber" : "neutral"}
              />

              {/* Quick reactions */}
              <div className="flex items-center gap-1 bg-muted/60 rounded-xl px-2 py-1.5 border border-border/40">
                {(["👍", "❤️", "🎉", "🙌"] as const).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="text-xl hover:scale-125 transition-transform active:scale-110 leading-none p-0.5 rounded"
                    title={`Réaction ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {myRole === "audience" && (
                <CtrlBtn on={handRaised} onClick={toggleHand}
                  icon={<Hand className="h-5 w-5" />}
                  label={handRaised ? "Main levée" : "Lever main"}
                  color="amber"
                />
              )}

              <div className="relative">
                <CtrlBtn on={showChat} onClick={() => { setShowChat((v) => !v); setShowPeers(false); }}
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Chat"
                />
                {unread > 0 && !showChat && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>

              <CtrlBtn on={showPeers} onClick={() => { setShowPeers((v) => !v); setShowChat(false); }}
                icon={<Users className="h-5 w-5" />}
                label={`Membres (${participants.length})`}
              />

              <CtrlBtn on={showSettings} onClick={() => setShowSettings(true)}
                icon={<Settings className="h-5 w-5" />}
                label="Paramètres"
              />

              {/* Minimize */}
              <button
                onClick={() => setMinimized(true)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all text-xs font-medium"
                title="Naviguer sur le site sans quitter la conférence"
              >
                <Minimize2 className="h-5 w-5" />
                <span>Minimiser</span>
              </button>

              {/* End / Leave */}
              <button
                onClick={isModerator ? endConference : leaveConference}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors ml-2"
              >
                <PhoneOff className="h-5 w-5" />
                <span className="text-xs">{isModerator ? "Terminer" : "Quitter"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Side panel ────────────────────────────────────────────────────── */}
        {(showChat || showPeers) && (
          <div className="w-80 flex-shrink-0 bg-background border-l border-border flex flex-col min-h-0 shadow-sm">

            {/* Chat */}
            {showChat && (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted/30">
                  <span className="text-foreground font-semibold text-sm">Chat de la conférence</span>
                  <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs mt-10 leading-relaxed">
                      Aucun message pour le moment.<br />Soyez le premier à écrire !
                    </p>
                  ) : (
                    messages.map((m) => {
                      // ── System announcement ──
                      if (m.type === "system") {
                        return (
                          <div key={m.id} className="flex items-center justify-center">
                            <span className="text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1 text-center">{m.message}</span>
                          </div>
                        );
                      }

                      // ── Poll card ──
                      if (m.type === "poll" && m.poll) {
                        const poll = m.poll;
                        const total = Object.values(poll.votes).reduce((a, b) => a + b, 0);
                        const userId = user?.id ?? "guest";
                        const hasVoted = myVote !== null || poll.voterIds.includes(userId);
                        return (
                          <div key={m.id} className="rounded-2xl border border-border bg-muted/40 p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <BarChart2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span className="text-xs font-semibold text-primary">{poll.closed ? "Sondage terminé" : "Sondage en cours"}</span>
                            </div>
                            <p className="text-sm font-medium">{poll.question}</p>
                            <div className="space-y-1.5">
                              {poll.options.map((opt, i) => {
                                const count = poll.votes[String(i)] ?? 0;
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                const voted = myVote === i;
                                return (
                                  <button key={i} onClick={() => votePoll(i)}
                                    disabled={hasVoted || poll.closed}
                                    className={`w-full text-left text-xs rounded-xl px-3 py-1.5 border transition-all ${voted ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/40 hover:bg-muted"} disabled:cursor-default`}>
                                    <div className="flex justify-between mb-1">
                                      <span>{opt}</span>
                                      <span className="text-muted-foreground tabular-nums">{hasVoted ? `${count} (${pct}%)` : ""}</span>
                                    </div>
                                    {hasVoted && (
                                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${voted ? "bg-primary" : "bg-muted-foreground/30"}`} style={{ width: `${pct}%` }} />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-xs text-muted-foreground">{total} vote(s)</span>
                              {isModerator && !poll.closed && (
                                <button onClick={closePoll} className="text-xs text-destructive hover:underline">Fermer</button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // ── Regular chat message ──
                      const isMe = m.user_id === user?.id;
                      return (
                        <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-muted">{initials(m.user_name)}</AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-xs text-muted-foreground truncate">{m.user_name.split(" ")[0]}</span>
                              {m.role === "moderator" && <Crown className="h-2.5 w-2.5 text-amber-500" />}
                              {m.role === "speaker" && <Mic className="h-2.5 w-2.5 text-green-500" />}
                            </div>
                            <div className={`rounded-2xl px-3 py-2 text-sm leading-snug ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                              {m.message}
                            </div>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>
                {/* Inline poll creator for moderators */}
                {showPollCreator && (isModerator || coModId === user?.id) && (
                  <div className="p-3 border-t border-border space-y-2 bg-muted/20 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-1"><BarChart2 className="h-3.5 w-3.5" />Nouveau sondage</span>
                      <button onClick={() => setShowPollCreator(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <Input placeholder="Question..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} maxLength={200} className="text-xs h-8" />
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-1.5">
                        <Input placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => setPollOptions((prev) => prev.map((o, j) => j === i ? e.target.value : o))} maxLength={100} className="text-xs h-7" />
                        {pollOptions.length > 2 && (
                          <button onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      {pollOptions.length < 5 && (
                        <button onClick={() => setPollOptions((prev) => [...prev, ""])} className="text-xs text-primary hover:underline">+ Option</button>
                      )}
                      <Button size="sm" className="ml-auto h-7 text-xs" onClick={launchPoll}
                        disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}>
                        Lancer
                      </Button>
                    </div>
                  </div>
                )}
                <div className="p-3 border-t border-border flex gap-2 flex-shrink-0">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                    placeholder="Message…"
                    className="text-sm"
                  />
                  <Button size="icon" onClick={sendChat} disabled={!chatInput.trim()} className="flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Participants */}
            {showPeers && (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted/30">
                  <span className="text-foreground font-semibold text-sm">Participants ({participants.length})</span>
                  <button onClick={() => setShowPeers(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
                  {(["moderator", "speaker", "audience"] as ParticipantRole[]).map((role) => {
                    const group = participants.filter((p) => p.role === role);
                    if (!group.length) return null;
                    return (
                      <div key={role}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-medium">
                          {role === "moderator" ? `Modérateurs (${group.length})` : role === "speaker" ? `Speakers (${group.length})` : `Auditeurs (${group.length})`}
                        </p>
                        {group.map((p) => (
                          <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/50 group/item transition-colors">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-muted">{initials(p.user_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">
                                {p.user_name}
                                {p.user_id === user?.id && <span className="text-muted-foreground text-xs ml-1 font-normal">(Vous)</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {p.is_muted ? <MicOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Mic className="h-3.5 w-3.5 text-green-500" />}
                              {p.hand_raised && <Hand className="h-3 w-3 text-amber-500 animate-bounce" />}
                              {/* Network latency badge */}
                              {peerStats[p.user_id]?.rtt != null && (
                                <span className={`text-[10px] font-mono ${(peerStats[p.user_id].rtt ?? 999) <= 150 ? "text-green-500" : (peerStats[p.user_id].rtt ?? 999) <= 400 ? "text-amber-500" : "text-red-500"}`}>
                                  {peerStats[p.user_id].rtt}ms
                                </span>
                              )}
                              {isModerator && p.user_id !== user?.id && (
                                <div className="hidden group-hover/item:flex gap-0.5">
                                  {p.role === "audience" && (
                                    <button onClick={() => promoteToSpeaker(p.user_id)} className="text-green-600 hover:text-green-700 p-0.5 rounded" title="Inviter à parler">
                                      <Mic className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {p.role === "speaker" && (
                                    <>
                                      {!p.is_muted && (
                                        <button onClick={() => forceMute(p.user_id)} className="text-orange-500 hover:text-orange-600 p-0.5 rounded" title="Couper micro">
                                          <MicOff className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <button onClick={() => passFloor(p.user_id)} className="text-blue-500 hover:text-blue-600 p-0.5 rounded" title="Passer la parole">
                                        <UserCheck className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => demoteToAudience(p.user_id)} className="text-destructive hover:text-destructive/80 p-0.5 rounded" title="Rétrograder">
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {/* Co-moderator management */}
                                  {coModId !== p.user_id ? (
                                    <button onClick={() => grantCoMod(p.user_id, p.user_name)} className="text-purple-500 hover:text-purple-600 p-0.5 rounded" title="Nommer co-modérateur">
                                      <Shield className="h-3.5 w-3.5" />
                                    </button>
                                  ) : (
                                    <button onClick={revokeCoMod} className="text-purple-700 hover:text-purple-800 p-0.5 rounded" title="Retirer co-modérateur">
                                      <Shield className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Settings modal ───────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />Paramètres audio
                </CardTitle>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Mic input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />Microphone (entrée)
                </label>
                <select
                  value={selAudioIn}
                  onChange={async (e) => {
                    setSelAudioIn(e.target.value);
                    // If mic is on, restart with new device
                    if (micOn) {
                      localStream.current.getAudioTracks().forEach((t) => { t.stop(); localStream.current.removeTrack(t); });
                      setMicOn(false);
                      toast.info("Réactivez le micro pour utiliser ce périphérique.");
                    }
                  }}
                  className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Microphone par défaut</option>
                  {audioIns.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Micro ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio output */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />Haut-parleurs (sortie)
                </label>
                <select
                  value={selAudioOut}
                  onChange={(e) => setSelAudioOut(e.target.value)}
                  className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Haut-parleurs par défaut</option>
                  {audioOuts.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Sortie ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Appliqué en temps réel via <code className="bg-muted px-1 rounded">setSinkId</code>.
                  Nécessite Chrome/Edge.
                </p>
              </div>

              {/* Noise suppression toggle */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />Traitement audio
                </label>
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                  <span className="text-sm text-muted-foreground">Suppression de bruit <span className="text-xs">(navigateur)</span></span>
                  <button
                    role="switch"
                    aria-checked={noiseSuppressionOn}
                    onClick={() => {
                      setNoiseSuppressionOn((v) => !v);
                      if (micOn) toast.info("Réactivez le micro pour appliquer.");
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${noiseSuppressionOn ? "bg-primary" : "bg-muted-foreground/40"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${noiseSuppressionOn ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>
                <p className="text-xs text-muted-foreground">Active noiseSuppression + echoCancellation natifs du navigateur.</p>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                La sélection du micro prend effet à la prochaine activation.
                La sortie audio est appliquée immédiatement.
              </div>

              <Button onClick={() => setShowSettings(false)} className="w-full">Fermer</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Poll creator and poll display are now inline in the chat panel */}

      {/* ── Session summary ──────────────────────────────────────────────────── */}
      {showSummary && sessionSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                📊 Récapitulatif
              </CardTitle>
              <CardDescription>Résumé de la conférence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Durée", value: sessionSummary.duration },
                  { label: "Participants max", value: String(sessionSummary.maxParticipants) },
                  { label: "Messages", value: String(sessionSummary.messageCount) },
                  { label: "Début", value: sessionSummary.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => setShowSummary(false)}>Fermer</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}