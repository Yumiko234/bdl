import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, PhoneOff, MessageSquare, Users, Settings,
  Send, Crown, Shield, Loader2, X,
  Check, Volume2, Radio
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConferenceStatus = "lobby" | "live" | "ended";
type ParticipantRole = "moderator" | "speaker" | "audience";

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
}

interface Conference {
  id: string;
  title: string;
  status: ConferenceStatus;
  host_id: string;
  created_at: string;
}

// ─── Global peer connections store ───────────────────────────────────────────

const peerConnections: Record<string, RTCPeerConnection> = {};
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConferencePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // ── Auth & role ──────────────────────────────────────────────────────────────
  const [isBDLExecutive, setIsBDLExecutive] = useState(false);
  const [userFullName, setUserFullName] = useState("Anonyme");
  const [checkingRole, setCheckingRole] = useState(true);

  // ── Conference state ─────────────────────────────────────────────────────────
  const [conference, setConference] = useState<Conference | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myRole, setMyRole] = useState<ParticipantRole>("audience");
  const [phase, setPhase] = useState<"pre" | "in">("pre");

  // ── Create-conference form ────────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Media ────────────────────────────────────────────────────────────────────
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioIn, setSelectedAudioIn] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [unread, setUnread] = useState(0);

  // ── Hand raise ───────────────────────────────────────────────────────────────
  const [handRaised, setHandRaised] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Record<string, HTMLVideoElement | null>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // keep ref in sync with state (needed inside callbacks)
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // ─── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // ─── Load profile + role ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) setUserFullName(profile.full_name);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const execRoles = ["president", "vice_president", "secretary_general", "communication_manager"];
      setIsBDLExecutive(roles?.some((r) => execRoles.includes(r.role)) ?? false);
      setCheckingRole(false);
    })();
  }, [user]);

  // ─── Enumerate audio devices ──────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
      setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
    });
  }, []);

  // ─── WebRTC helpers ───────────────────────────────────────────────────────────

  const getOrCreatePC = useCallback(
    (peerId: string, ch: ReturnType<typeof supabase.channel>): RTCPeerConnection => {
      if (peerConnections[peerId]) return peerConnections[peerId];

      const pc = new RTCPeerConnection(ICE_CONFIG);

      pc.onicecandidate = (e) => {
        if (e.candidate && user) {
          ch.send({
            type: "broadcast",
            event: "ice",
            payload: { from: user.id, to: peerId, candidate: e.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (e) => {
        // Defer to next tick so the ref has time to be assigned
        setTimeout(() => {
          const vid = remoteVideosRef.current[peerId];
          if (vid && e.streams[0]) {
            vid.srcObject = e.streams[0];
            vid.play().catch(() => {});
          }
        }, 50);
      };

      // Add existing local tracks
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => {
          pc.addTrack(t, stream);
        });
      }

      peerConnections[peerId] = pc;
      return pc;
    },
    [user]
  );

  // ─── Realtime Supabase channel ────────────────────────────────────────────────

  const setupChannel = useCallback(
    (confId: string, initialRole: ParticipantRole) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const ch = supabase.channel(`conference:${confId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user!.id },
        },
      });

      // ── Chat ──
      ch.on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatMessages((prev) => [...prev, payload as ChatMessage]);
        setUnread((u) => u + 1);
      });

      // ── Hand raise ──
      ch.on("broadcast", { event: "hand" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === payload.user_id ? { ...p, hand_raised: payload.raised } : p
          )
        );
      });

      // ── Role change ──
      ch.on("broadcast", { event: "role_change" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === payload.user_id
              ? { ...p, role: payload.role, hand_raised: false }
              : p
          )
        );
        if (payload.user_id === user!.id) {
          setMyRole(payload.role);
          if (payload.role === "speaker") {
            toast.success("🎙️ Vous êtes maintenant speaker !");
          } else if (payload.role === "audience") {
            toast.info("Vous êtes maintenant auditeur.");
          }
        }
      });

      // ── Mute change ──
      ch.on("broadcast", { event: "mute_change" }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.user_id === payload.user_id ? { ...p, is_muted: payload.muted } : p
          )
        );
      });

      // ── Forced mute by moderator ──
      ch.on("broadcast", { event: "force_mute" }, ({ payload }) => {
        if (payload.user_id === user!.id) {
          localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
          setMicOn(false);
          toast.warning("Le modérateur vous a coupé le micro.");
        }
      });

      // ── Conference ended ──
      ch.on("broadcast", { event: "conference_end" }, () => {
        toast.info("La conférence est terminée.");
        cleanup(false);
        setPhase("pre");
        setConference(null);
      });

      // ── WebRTC: offer ──
      ch.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = getOrCreatePC(payload.from, ch);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({
            type: "broadcast",
            event: "answer",
            payload: { from: user!.id, to: payload.from, sdp: answer },
          });
        } catch (err) {
          console.error("offer handling error", err);
        }
      });

      // ── WebRTC: answer ──
      ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = peerConnections[payload.from];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } catch (err) {
            console.error("answer handling error", err);
          }
        }
      });

      // ── WebRTC: ICE ──
      ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.to !== user!.id) return;
        const pc = peerConnections[payload.from];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (err) {
            console.error("ice candidate error", err);
          }
        }
      });

      // ── Presence sync ──
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const parts: Participant[] = Object.values(state)
          .flat()
          .map((p: any) => ({
            user_id: p.user_id,
            user_name: p.user_name,
            role: p.role ?? "audience",
            hand_raised: p.hand_raised ?? false,
            is_muted: p.is_muted ?? true,
            is_video_off: p.is_video_off ?? true,
            joined_at: p.joined_at ?? new Date().toISOString(),
          }));
        setParticipants(parts);
      });

      ch.on("presence", { event: "join" }, ({ newPresences }) => {
        setParticipants((prev) => {
          const ids = new Set(prev.map((p) => p.user_id));
          const toAdd = (newPresences as any[])
            .filter((p) => !ids.has(p.user_id))
            .map((p) => ({
              user_id: p.user_id,
              user_name: p.user_name,
              role: p.role ?? "audience",
              hand_raised: false,
              is_muted: true,
              is_video_off: true,
              joined_at: p.joined_at ?? new Date().toISOString(),
            }));
          return [...prev, ...toAdd];
        });
      });

      ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
        const leaving = new Set((leftPresences as any[]).map((p) => p.user_id));
        setParticipants((prev) => prev.filter((p) => !leaving.has(p.user_id)));
        leaving.forEach((id) => {
          peerConnections[id]?.close();
          delete peerConnections[id];
        });
      });

      // ── Subscribe and track self ──
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            user_id: user!.id,
            user_name: userFullName,
            role: initialRole,
            hand_raised: false,
            is_muted: true,
            is_video_off: true,
            joined_at: new Date().toISOString(),
          });
        }
      });

      channelRef.current = ch;
    },
    [user, userFullName, getOrCreatePC]
  );

  // ─── Media controls ───────────────────────────────────────────────────────────

  const toggleMic = async () => {
    if (!micOn) {
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioIn
            ? { deviceId: { exact: selectedAudioIn } }
            : true,
        };
        const audioStream = await navigator.mediaDevices.getUserMedia(constraints);
        const track = audioStream.getAudioTracks()[0];

        // Add to existing stream or create new
        let stream = localStreamRef.current;
        if (!stream) {
          stream = new MediaStream();
          setLocalStream(stream);
        }
        // Remove old audio tracks
        stream.getAudioTracks().forEach((t) => { t.stop(); stream!.removeTrack(t); });
        stream.addTrack(track);

        // Push track to all peer connections
        Object.values(peerConnections).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) sender.replaceTrack(track);
          else pc.addTrack(track, stream!);
        });

        setMicOn(true);
        broadcastMuteState(false);
      } catch {
        toast.error("Impossible d'activer le micro. Vérifiez les permissions.");
      }
    } else {
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.stop(); });
      setMicOn(false);
      broadcastMuteState(true);
    }
  };

  const toggleCam = async () => {
    if (!camOn) {
      try {
        const vidStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = vidStream.getVideoTracks()[0];

        let stream = localStreamRef.current;
        if (!stream) {
          stream = new MediaStream();
          setLocalStream(stream);
        }
        stream.getVideoTracks().forEach((t) => { t.stop(); stream!.removeTrack(t); });
        stream.addTrack(track);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        Object.values(peerConnections).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(track);
          else pc.addTrack(track, stream!);
        });

        setCamOn(true);
      } catch {
        toast.error("Impossible d'activer la caméra.");
      }
    } else {
      localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      setCamOn(false);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    }
  };

  const toggleScreen = async () => {
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 },
          audio: false,
        });
        setScreenStream(stream);
        setScreenSharing(true);

        const track = stream.getVideoTracks()[0];

        // Replace camera track with screen track in all PCs
        Object.values(peerConnections).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(track);
        });

        // Show screen in local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        track.onended = () => stopScreenShare();
      } catch {
        toast.error("Partage d'écran annulé ou refusé.");
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setScreenSharing(false);

    // Restore camera track if cam is on
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      Object.values(peerConnections).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // ─── Broadcast helpers ────────────────────────────────────────────────────────

  const broadcastMuteState = (muted: boolean) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "mute_change",
      payload: { user_id: user!.id, muted },
    });
  };

  const sendChat = () => {
    if (!chatInput.trim() || !conference) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user!.id,
      user_name: userFullName,
      message: chatInput.trim(),
      created_at: new Date().toISOString(),
      role: myRole,
    };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  };

  const toggleHand = () => {
    const raised = !handRaised;
    setHandRaised(raised);
    channelRef.current?.send({
      type: "broadcast",
      event: "hand",
      payload: { user_id: user!.id, raised },
    });
  };

  const promoteToSpeaker = (targetId: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "role_change",
      payload: { user_id: targetId, role: "speaker" },
    });
    setParticipants((prev) =>
      prev.map((p) =>
        p.user_id === targetId ? { ...p, role: "speaker", hand_raised: false } : p
      )
    );
    toast.success("Speaker promu !");
  };

  const demoteToAudience = (targetId: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "role_change",
      payload: { user_id: targetId, role: "audience" },
    });
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === targetId ? { ...p, role: "audience" } : p))
    );
  };

  const forceMute = (targetId: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "force_mute",
      payload: { user_id: targetId },
    });
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === targetId ? { ...p, is_muted: true } : p))
    );
  };

  // ─── Conference lifecycle ─────────────────────────────────────────────────────

  const createConference = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const conf: Conference = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      status: "live",
      host_id: user!.id,
      created_at: new Date().toISOString(),
    };
    setConference(conf);
    setMyRole("moderator");
    setPhase("in");
    setupChannel(conf.id, "moderator");
    setCreating(false);
    toast.success("🎙️ Conférence démarrée !");
  };

  const endConference = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "conference_end",
      payload: {},
    });
    cleanup(true);
    setPhase("pre");
    setConference(null);
    toast.info("Conférence terminée.");
  };

  const leaveConference = () => {
    cleanup(true);
    setPhase("pre");
    setConference(null);
    toast.info("Vous avez quitté la conférence.");
  };

  const cleanup = (removeChannel: boolean) => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setScreenStream(null);
    setMicOn(false);
    setCamOn(false);
    setScreenSharing(false);
    setHandRaised(false);
    setChatMessages([]);
    setParticipants([]);
    setUnread(0);
    Object.values(peerConnections).forEach((pc) => pc.close());
    Object.keys(peerConnections).forEach((k) => delete peerConnections[k]);
    if (removeChannel && channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // ─── Auto-scroll chat ─────────────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (showChat) setUnread(0);
  }, [showChat]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => () => cleanup(true), []);

  // ─── UI helpers ───────────────────────────────────────────────────────────────
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const roleIcon = (role: ParticipantRole) => {
    if (role === "moderator") return <Crown className="h-3 w-3 text-yellow-400" />;
    if (role === "speaker") return <Mic className="h-3 w-3 text-green-400" />;
    return null;
  };

  const roleBadgeStyle = (role: ParticipantRole) =>
    role === "moderator"
      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      : role === "speaker"
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : "bg-slate-500/20 text-slate-400 border-slate-600/30";

  const isModerator = myRole === "moderator";
  const isSpeaker = myRole === "speaker" || myRole === "moderator";
  const raisedHands = participants.filter(
    (p) => p.hand_raised && p.role === "audience" && p.user_id !== user?.id
  );
  const activeSpeakers = participants.filter(
    (p) => p.role === "speaker" || p.role === "moderator"
  );

  // ─── Loading gate ─────────────────────────────────────────────────────────────
  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ═══════════════════════════════════════════════════════════════════════════════
  if (phase === "pre") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          {/* Header */}
          <div className="text-center space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-2">
              <Radio className="h-4 w-4" />
              Visioconférence BDL — Lycée Saint-André
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Salle de Conférence
            </h1>
            <p className="text-slate-400 max-w-md">
              Réunions en direct pour le Bureau des Lycéens et les membres de l'établissement.
            </p>
          </div>

          <div className="w-full max-w-md space-y-4">
            {/* Create conference — BDL executive only */}
            {isBDLExecutive && (
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    Démarrer une conférence
                  </div>
                  <Input
                    placeholder="Thème de la réunion…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createConference()}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <Button
                    onClick={createConference}
                    disabled={creating || !newTitle.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Radio className="h-4 w-4 mr-2" />
                    )}
                    Lancer la conférence
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Waiting card */}
            <Card className="bg-slate-900/40 border-slate-800/60">
              <CardContent className="p-8 text-center space-y-3">
                <Shield className="h-10 w-10 mx-auto text-slate-600" />
                <p className="text-slate-400 text-sm">Aucune conférence en cours.</p>
                <p className="text-slate-600 text-xs">
                  {isBDLExecutive
                    ? "Créez une conférence pour inviter les membres."
                    : "Les conférences actives apparaîtront ici automatiquement."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // IN CONFERENCE
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider">EN DIRECT</span>
          </div>
          <span className="text-slate-200 font-semibold truncate">{conference?.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs gap-1">
            <Users className="h-3 w-3" />
            {participants.length}
          </Badge>
          <span className={`text-xs border rounded-full px-2 py-0.5 ${roleBadgeStyle(myRole)}`}>
            {myRole === "moderator" ? "Modérateur" : myRole === "speaker" ? "Speaker" : "Auditeur"}
          </span>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Video grid ────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 content-start overflow-auto">

            {/* Local video tile */}
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video group border border-slate-800">
              {camOn || screenSharing ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                    style={{ background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)" }}
                  >
                    {getInitials(userFullName)}
                  </div>
                </div>
              )}

              {/* Screen share badge */}
              {screenSharing && (
                <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur rounded-full px-2 py-0.5 text-xs text-white flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Partage d'écran
                </div>
              )}

              {/* Name bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center gap-1.5">
                {micOn ? (
                  <Mic className="h-3 w-3 text-green-400 flex-shrink-0" />
                ) : (
                  <MicOff className="h-3 w-3 text-red-400 flex-shrink-0" />
                )}
                <span className="text-white text-xs font-medium truncate">
                  {userFullName}
                  <span className="text-slate-400 ml-1">(Vous)</span>
                </span>
                {roleIcon(myRole)}
              </div>
            </div>

            {/* Remote speakers / moderators */}
            {participants
              .filter((p) => p.user_id !== user?.id && (p.role === "speaker" || p.role === "moderator"))
              .map((p) => (
                <div
                  key={p.user_id}
                  className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video border border-slate-800 group"
                >
                  {/* Remote video – shown if stream arrives */}
                  <video
                    ref={(el) => { remoteVideosRef.current[p.user_id] = el; }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Avatar fallback layer */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900 -z-0">
                    <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xl font-bold">
                      {getInitials(p.user_name)}
                    </div>
                  </div>

                  {/* Moderator actions */}
                  {isModerator && p.user_id !== user?.id && (
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                      {!p.is_muted && (
                        <button
                          onClick={() => forceMute(p.user_id)}
                          className="bg-black/70 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                          title="Couper le micro"
                        >
                          <MicOff className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => demoteToAudience(p.user_id)}
                        className="bg-black/70 hover:bg-orange-700 text-white rounded-full p-1 transition-colors"
                        title="Rétrograder en auditeur"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center gap-1.5">
                    {p.is_muted ? (
                      <MicOff className="h-3 w-3 text-red-400 flex-shrink-0" />
                    ) : (
                      <Mic className="h-3 w-3 text-green-400 flex-shrink-0" />
                    )}
                    <span className="text-white text-xs font-medium truncate">{p.user_name}</span>
                    {roleIcon(p.role)}
                  </div>
                </div>
              ))}

            {/* Audience tiles */}
            {participants
              .filter((p) => p.user_id !== user?.id && p.role === "audience")
              .map((p) => (
                <div
                  key={p.user_id}
                  className="relative bg-slate-900/50 rounded-2xl overflow-hidden aspect-video border border-slate-800/60 flex items-center justify-center"
                >
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-full bg-slate-700 mx-auto flex items-center justify-center text-white font-bold">
                      {getInitials(p.user_name)}
                    </div>
                    <p className="text-slate-400 text-xs px-2 truncate">{p.user_name}</p>
                    {p.hand_raised && (
                      <div className="flex items-center justify-center gap-1 text-yellow-400 text-xs animate-bounce">
                        <Hand className="h-3.5 w-3.5" />
                        <span>Lève la main</span>
                      </div>
                    )}
                  </div>
                  {isModerator && p.hand_raised && (
                    <button
                      onClick={() => promoteToSpeaker(p.user_id)}
                      className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-500 text-white rounded-lg px-2 py-0.5 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Accepter
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* ── Controls bar ───────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-2">

            {/* Raised-hand alerts for moderators */}
            {isModerator && raisedHands.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Hand className="h-4 w-4 text-yellow-400 flex-shrink-0 animate-bounce" />
                <span className="text-yellow-300 text-sm flex-1">
                  {raisedHands.length} personne{raisedHands.length > 1 ? "s" : ""} lève{raisedHands.length > 1 ? "nt" : ""} la main
                </span>
                <div className="flex gap-1 flex-wrap">
                  {raisedHands.slice(0, 3).map((p) => (
                    <button
                      key={p.user_id}
                      onClick={() => promoteToSpeaker(p.user_id)}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded-lg px-2 py-0.5 flex items-center gap-1 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      {p.user_name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons row */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">

              {/* Microphone */}
              <ControlBtn
                active={micOn}
                activeClass="bg-slate-800 text-white hover:bg-slate-700"
                inactiveClass="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                onClick={toggleMic}
                icon={micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                label={micOn ? "Micro" : "Micro off"}
              />

              {/* Camera */}
              <ControlBtn
                active={camOn}
                activeClass="bg-slate-800 text-white hover:bg-slate-700"
                inactiveClass="bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                onClick={toggleCam}
                icon={camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                label="Caméra"
              />

              {/* Screen share — speakers & moderators only */}
              {isSpeaker && (
                <ControlBtn
                  active={screenSharing}
                  activeClass="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                  inactiveClass="bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                  onClick={toggleScreen}
                  icon={screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  label={screenSharing ? "Arrêter" : "Écran"}
                />
              )}

              {/* Hand raise — audience only */}
              {myRole === "audience" && (
                <ControlBtn
                  active={handRaised}
                  activeClass="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 animate-pulse"
                  inactiveClass="bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                  onClick={toggleHand}
                  icon={<Hand className="h-5 w-5" />}
                  label={handRaised ? "Main levée" : "Lever main"}
                />
              )}

              {/* Chat */}
              <div className="relative">
                <ControlBtn
                  active={showChat}
                  activeClass="bg-blue-600/20 text-blue-400"
                  inactiveClass="bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                  onClick={() => { setShowChat((v) => !v); setShowParticipants(false); }}
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Chat"
                />
                {unread > 0 && !showChat && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>

              {/* Participants */}
              <ControlBtn
                active={showParticipants}
                activeClass="bg-blue-600/20 text-blue-400"
                inactiveClass="bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                onClick={() => { setShowParticipants((v) => !v); setShowChat(false); }}
                icon={<Users className="h-5 w-5" />}
                label={`Membres (${participants.length})`}
              />

              {/* Settings */}
              <ControlBtn
                active={showSettings}
                activeClass="bg-slate-700 text-white"
                inactiveClass="bg-slate-800/50 text-slate-400 hover:bg-slate-700"
                onClick={() => setShowSettings(true)}
                icon={<Settings className="h-5 w-5" />}
                label="Paramètres"
              />

              {/* Leave / End */}
              <button
                onClick={isModerator ? endConference : leaveConference}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors ml-2"
              >
                <PhoneOff className="h-5 w-5" />
                <span className="text-xs">{isModerator ? "Terminer" : "Quitter"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Side panel ────────────────────────────────────────────────────────── */}
        {(showChat || showParticipants) && (
          <div className="w-80 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col min-h-0">

            {/* Chat panel */}
            {showChat && (
              <>
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    Chat de la conférence
                  </span>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-slate-600 text-xs mt-10 leading-relaxed">
                      Aucun message pour le moment.
                      <br />
                      Soyez le premier à écrire !
                    </p>
                  ) : (
                    chatMessages.map((m) => {
                      const isMe = m.user_id === user?.id;
                      return (
                        <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
                              {getInitials(m.user_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-xs text-slate-500 truncate">
                                {m.user_name.split(" ")[0]}
                              </span>
                              {roleIcon(m.role)}
                            </div>
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                                isMe
                                  ? "bg-blue-600 text-white rounded-tr-sm"
                                  : "bg-slate-800 text-slate-200 rounded-tl-sm"
                              }`}
                            >
                              {m.message}
                            </div>
                            <span className="text-xs text-slate-600 mt-0.5">
                              {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="p-3 border-t border-slate-800 flex gap-2 flex-shrink-0">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                    placeholder="Message…"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  />
                  <Button
                    size="icon"
                    onClick={sendChat}
                    disabled={!chatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-500 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Participants panel */}
            {showParticipants && (
              <>
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    Participants ({participants.length})
                  </span>
                  <button
                    onClick={() => setShowParticipants(false)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
                  {/* Group by role */}
                  {(["moderator", "speaker", "audience"] as ParticipantRole[]).map((role) => {
                    const group = participants.filter((p) => p.role === role);
                    if (group.length === 0) return null;
                    return (
                      <div key={role}>
                        <p className="text-xs text-slate-600 uppercase tracking-wider px-2 py-1.5">
                          {role === "moderator"
                            ? `Modérateurs (${group.length})`
                            : role === "speaker"
                            ? `Speakers (${group.length})`
                            : `Auditeurs (${group.length})`}
                        </p>
                        {group.map((p) => (
                          <div
                            key={p.user_id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/50 group/item transition-colors"
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
                                {getInitials(p.user_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-200 text-sm truncate">
                                  {p.user_name}
                                  {p.user_id === user?.id && (
                                    <span className="text-slate-500 text-xs ml-1">(Vous)</span>
                                  )}
                                </span>
                                {roleIcon(p.role)}
                                {p.hand_raised && (
                                  <Hand className="h-3 w-3 text-yellow-400 animate-bounce flex-shrink-0" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {p.is_muted ? (
                                <MicOff className="h-3.5 w-3.5 text-slate-600" />
                              ) : (
                                <Mic className="h-3.5 w-3.5 text-green-400" />
                              )}
                              {/* Moderator quick actions */}
                              {isModerator && p.user_id !== user?.id && (
                                <div className="hidden group-hover/item:flex gap-0.5">
                                  {p.role === "audience" && p.hand_raised && (
                                    <button
                                      onClick={() => promoteToSpeaker(p.user_id)}
                                      className="text-green-400 hover:text-green-300 p-0.5 rounded"
                                      title="Promouvoir speaker"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {p.role === "audience" && !p.hand_raised && (
                                    <button
                                      onClick={() => promoteToSpeaker(p.user_id)}
                                      className="text-blue-400 hover:text-blue-300 p-0.5 rounded"
                                      title="Inviter à parler"
                                    >
                                      <Mic className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {(p.role === "speaker") && (
                                    <>
                                      {!p.is_muted && (
                                        <button
                                          onClick={() => forceMute(p.user_id)}
                                          className="text-orange-400 hover:text-orange-300 p-0.5 rounded"
                                          title="Couper le micro"
                                        >
                                          <MicOff className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => demoteToAudience(p.user_id)}
                                        className="text-red-400 hover:text-red-300 p-0.5 rounded"
                                        title="Rétrograder auditeur"
                                      >
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

      {/* ── Settings modal ────────────────────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <Card className="w-full max-w-sm bg-slate-900 border-slate-800 shadow-2xl">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-slate-400" />
                  Paramètres audio
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mic input */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-sm flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Microphone (entrée)
                </label>
                <select
                  value={selectedAudioIn}
                  onChange={(e) => setSelectedAudioIn(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Par défaut</option>
                  {audioInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Micro ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaker output */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-sm flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Haut-parleurs (sortie)
                </label>
                <select
                  value=""
                  onChange={() => {}}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Par défaut</option>
                  {audioOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Sortie ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <p className="text-slate-600 text-xs">
                  La sélection de sortie nécessite la permission du navigateur.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-slate-500 text-xs">
                Les modifications audio prennent effet à la prochaine activation du micro.
              </div>

              <Button
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                Fermer
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Control button sub-component ────────────────────────────────────────────

interface ControlBtnProps {
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ControlBtn({ active, activeClass, inactiveClass, onClick, icon, label }: ControlBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-sm ${
        active ? activeClass : inactiveClass
      }`}
    >
      {icon}
      <span className="text-xs whitespace-nowrap">{label}</span>
    </button>
  );
}