import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, PhoneOff, MessageSquare, Users, Settings,
  Send, Crown, Shield, Loader2, X, Check, Volume2,
  Radio, LogIn, Clock, AlertCircle, Minimize2, Maximize2,
  ArrowLeft,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ParticipantRole = "moderator" | "speaker" | "audience";

interface DBConference {
  id: string;
  title: string;
  status: "live" | "ended";
  host_id: string;
  host_name: string;
  created_at: string;
  ended_at: string | null;
}

interface Participant {
  user_id: string;
  user_name: string;
  role: ParticipantRole;
  hand_raised: boolean;
  is_muted: boolean;
  joined_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  role: ParticipantRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// WebRTC globals (survive re-renders)
// ─────────────────────────────────────────────────────────────────────────────

const peers: Record<string, RTCPeerConnection> = {};
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

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
      ? "bg-green-100 text-green-700 border border-green-200"
      : "bg-muted text-muted-foreground hover:bg-muted/70",
    amber: on
      ? "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
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
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
        <Crown className="h-2.5 w-2.5" />Modérateur
      </Badge>
    );
  if (role === "speaker")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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

  // The single source of truth for local media.
  // We keep ONE MediaStream object and add/remove tracks on it.
  const localStream = useRef<MediaStream>(new MediaStream());

  // Current screen-share track (so we can stop it independently)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // ─── sync localStream → <video> whenever tracks change ───────────────────
  const syncLocalVideo = useCallback(() => {
    const vid = localVideoRef.current;
    if (!vid) return;
    // If screen is on, show screen track; else show camera track
    const screenTrack = screenTrackRef.current;
    if (screenTrack && !screenTrack.readyState.includes("ended")) {
      const display = new MediaStream([screenTrack]);
      vid.srcObject = display;
    } else {
      const camTracks = localStream.current.getVideoTracks();
      if (camTracks.length > 0) {
        vid.srcObject = new MediaStream([camTracks[0]]);
      } else {
        vid.srcObject = null;
      }
    }
    vid.play().catch(() => {});
  }, []);

  // ─── auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // ─── profile + role ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (p) setUserName((p as any).full_name);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const exec = ["president", "vice_president", "secretary_general", "communication_manager"];
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
      .from("conferences" as any)
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

      pc.ontrack = ({ streams }) => {
        if (!streams[0]) return;
        // Retry until the ref is mounted
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
      };

      // Add ALL current local tracks to the new peer
      localStream.current.getTracks().forEach((t) => {
        pc.addTrack(t, localStream.current);
      });
      if (screenTrackRef.current) {
        // Replace video sender with screen track
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrackRef.current).catch(() => {});
      }

      peers[peerId] = pc;
      return pc;
    },
    [user, selAudioOut]
  );

  // Replace a track kind across all peer senders
  const replaceTrackInAllPeers = (track: MediaStreamTrack | null, kind: "audio" | "video") => {
    for (const pc of Object.values(peers)) {
      const sender = pc.getSenders().find((s) => s.track?.kind === kind);
      if (sender) {
        sender.replaceTrack(track).catch(() => {});
      } else if (track) {
        pc.addTrack(track, localStream.current);
      }
    }
  };

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
          is_muted: p.is_muted ?? true, joined_at: p.joined_at ?? "",
        }));
        setParticipants(list);
      });
      ch.on("presence", { event: "join" }, ({ newPresences }) => {
        setParticipants((prev) => {
          const ids = new Set(prev.map((p) => p.user_id));
          return [
            ...prev,
            ...(newPresences as any[]).filter((p) => !ids.has(p.user_id)).map((p) => ({
              user_id: p.user_id, user_name: p.user_name,
              role: p.role ?? "audience", hand_raised: false,
              is_muted: true, joined_at: "",
            })),
          ];
        });
      });
      ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
        const gone = new Set((leftPresences as any[]).map((p) => p.user_id));
        setParticipants((prev) => prev.filter((p) => !gone.has(p.user_id)));
        gone.forEach((id) => { peers[id]?.close(); delete peers[id]; });
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
    [user, userName, getOrCreatePeer, fetchConfs]
  );

  // ─── Media controls ───────────────────────────────────────────────────────

  const toggleMic = async () => {
    if (micOn) {
      // Disable track (keep it alive so the sender stays valid)
      localStream.current.getAudioTracks().forEach((t) => { t.enabled = false; });
      setMicOn(false);
      broadcastMuteChange(true);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: selAudioIn ? { deviceId: { exact: selAudioIn } } : true,
        video: false,
      };
      const got = await navigator.mediaDevices.getUserMedia(constraints);
      await refreshDevices(); // now labels are available

      const newTrack = got.getAudioTracks()[0];
      newTrack.enabled = true;

      // Remove old audio tracks from localStream
      localStream.current.getAudioTracks().forEach((t) => {
        t.stop();
        localStream.current.removeTrack(t);
      });
      localStream.current.addTrack(newTrack);

      // Push to peers
      replaceTrackInAllPeers(newTrack, "audio");

      setMicOn(true);
      broadcastMuteChange(false);
    } catch (err: any) {
      console.error("mic error", err);
      toast.error("Micro inaccessible : " + (err?.message ?? err));
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
      return;
    }

    try {
      const got = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
    } catch (err: any) {
      console.error("cam error", err);
      toast.error("Caméra inaccessible : " + (err?.message ?? err));
    }
  };

  const toggleScreen = async () => {
    if (screenOn) {
      stopScreen();
      return;
    }

    try {
      const got = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = got.getVideoTracks()[0];
      screenTrackRef.current = track;

      // Replace video sender in all peers with screen track
      replaceTrackInAllPeers(track, "video");
      setScreenOn(true);
      syncLocalVideo();

      track.onended = stopScreen; // user clicked "Stop sharing" in browser UI
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        toast.error("Partage d'écran : " + (err?.message ?? err));
      }
    }
  };

  const stopScreen = () => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    // Restore camera track (if cam is on) or null
    const camTrack = localStream.current.getVideoTracks()[0] ?? null;
    replaceTrackInAllPeers(camTrack, "video");

    setScreenOn(false);
    syncLocalVideo();
  };

  // ─── Broadcast helpers ────────────────────────────────────────────────────

  const broadcastMuteChange = (muted: boolean) => {
    channelRef.current?.send({
      type: "broadcast", event: "mute_change",
      payload: { user_id: user!.id, muted },
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

  // ─── Conference lifecycle ─────────────────────────────────────────────────

  const createConference = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const id = crypto.randomUUID();
    const conf: DBConference = {
      id, title: newTitle.trim(), status: "live",
      host_id: user!.id, host_name: userName,
      created_at: new Date().toISOString(), ended_at: null,
    };
    await supabase.from("conferences" as any).insert({
      id, title: conf.title, status: "live", host_id: user!.id, host_name: userName,
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

  const joinConference = (conf: DBConference) => {
    const role: ParticipantRole = isBDLExec ? "moderator" : "audience";
    setActiveConf(conf);
    setMyRole(role);
    setInConference(true);
    setMinimized(false);
    setupChannel(conf.id, role);
    toast.success("Conférence rejointe !");
  };

  const endConference = async () => {
    channelRef.current?.send({ type: "broadcast", event: "conf_end", payload: {} });
    if (activeConf) {
      await supabase.from("conferences" as any)
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", activeConf.id);
    }
    doCleanup(true);
    setInConference(false);
    setMinimized(false);
    setActiveConf(null);
    fetchConfs();
    toast.info("Conférence terminée.");
  };

  const leaveConference = () => {
    doCleanup(true);
    setInConference(false);
    setMinimized(false);
    setActiveConf(null);
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

  // ─── Derived values ───────────────────────────────────────────────────────

  const isModerator = myRole === "moderator";
  const isSpeaker = myRole === "speaker" || myRole === "moderator";
  const raisedHands = participants.filter(
    (p) => p.hand_raised && p.role === "audience" && p.user_id !== user?.id
  );

  // ─── Loading gate ─────────────────────────────────────────────────────────

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
            <h1 className="text-5xl font-bold">Salle de Conférence</h1>
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
                <CardContent className="flex gap-3">
                  <Input
                    placeholder="Thème de la réunion…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createConference()}
                    className="flex-1"
                  />
                  <Button onClick={createConference} disabled={creating || !newTitle.trim()}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
                    Lancer
                  </Button>
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
                        <Button className="w-full" onClick={() => joinConference(conf)}>
                          <LogIn className="h-4 w-4 mr-2" />Rejoindre
                        </Button>
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-red-600 text-xs font-bold uppercase tracking-wider flex-shrink-0">EN DIRECT</span>
          <span className="text-foreground font-semibold truncate">{activeConf?.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs gap-1">
            <Users className="h-3 w-3" />{participants.length}
          </Badge>
          <RoleBadge role={myRole} />
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

        {/* ── Video grid ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
          <div className="flex-1 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 content-start overflow-auto">

            {/* Local tile */}
            <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video group border border-slate-700 shadow-md">
              <video
                ref={localVideoRef}
                autoPlay muted playsInline
                className="w-full h-full object-cover"
              />
              {/* Avatar shown when no video */}
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
                {micOn
                  ? <Mic className="h-3 w-3 text-green-400 flex-shrink-0" />
                  : <MicOff className="h-3 w-3 text-red-400 flex-shrink-0" />}
                <span className="text-white text-xs font-medium truncate">{userName} <span className="opacity-60">(Vous)</span></span>
                {myRole === "moderator" && <Crown className="h-3 w-3 text-amber-400" />}
                {myRole === "speaker" && <Mic className="h-3 w-3 text-green-400" />}
              </div>
            </div>

            {/* Remote speakers/moderators */}
            {participants
              .filter((p) => p.user_id !== user?.id && (p.role === "speaker" || p.role === "moderator"))
              .map((p) => (
                <div key={p.user_id} className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video border border-slate-700 shadow-md group">
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-0">
                    <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-white text-2xl font-bold">
                      {initials(p.user_name)}
                    </div>
                  </div>
                  <video
                    ref={(el) => { remoteVideoRefs.current[p.user_id] = el; }}
                    autoPlay playsInline
                    className="w-full h-full object-cover absolute inset-0 z-10"
                  />
                  {isModerator && p.user_id !== user?.id && (
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 z-20">
                      {!p.is_muted && (
                        <button onClick={() => forceMute(p.user_id)} className="bg-white/90 hover:bg-red-100 text-red-600 rounded-full p-1.5 shadow" title="Couper micro">
                          <MicOff className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => demoteToAudience(p.user_id)} className="bg-white/90 hover:bg-orange-100 text-orange-600 rounded-full p-1.5 shadow" title="Rétrograder">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-center gap-1.5 z-10">
                    {p.is_muted
                      ? <MicOff className="h-3 w-3 text-red-400 flex-shrink-0" />
                      : <Mic className="h-3 w-3 text-green-400 flex-shrink-0" />}
                    <span className="text-white text-xs font-medium truncate">{p.user_name}</span>
                    {p.role === "moderator" && <Crown className="h-3 w-3 text-amber-400" />}
                  </div>
                </div>
              ))}

            {/* Audience tiles */}
            {participants
              .filter((p) => p.user_id !== user?.id && p.role === "audience")
              .map((p) => (
                <div key={p.user_id} className="relative bg-slate-50 rounded-2xl overflow-hidden aspect-video border border-slate-200 shadow-sm flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-full bg-slate-200 mx-auto flex items-center justify-center text-slate-600 font-bold text-lg">
                      {initials(p.user_name)}
                    </div>
                    <p className="text-slate-500 text-xs px-2 truncate">{p.user_name}</p>
                    {p.hand_raised && (
                      <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium animate-bounce">
                        <Hand className="h-3.5 w-3.5" />Lève la main
                      </div>
                    )}
                  </div>
                  {isModerator && p.hand_raised && (
                    <button
                      onClick={() => promoteToSpeaker(p.user_id)}
                      className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-500 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1 shadow transition-colors"
                    >
                      <Check className="h-3 w-3" />Accepter
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* ── Controls bar ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-white border-t border-border px-4 py-3 space-y-2 shadow-sm">

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

              {isSpeaker && (
                <CtrlBtn on={screenOn} onClick={toggleScreen}
                  icon={screenOn ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  label={screenOn ? "Arrêter" : "Écran"}
                  color={screenOn ? "green" : "neutral"}
                />
              )}

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
          <div className="w-80 flex-shrink-0 bg-white border-l border-border flex flex-col min-h-0 shadow-sm">

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
                                      <button onClick={() => demoteToAudience(p.user_id)} className="text-destructive hover:text-destructive/80 p-0.5 rounded" title="Rétrograder">
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </>
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

              <div className="pt-2 border-t text-xs text-muted-foreground">
                La sélection du micro prend effet à la prochaine activation.
                La sortie audio est appliquée immédiatement.
              </div>

              <Button onClick={() => setShowSettings(false)} className="w-full">Fermer</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}