import { useRef, useCallback, useState } from "react";

export type NetQuality = "good" | "medium" | "bad" | "unknown";

export interface PeerNetStats {
  rtt: number | null;    // ms
  loss: number | null;   // percent 0-100
  jitter: number | null; // ms
  quality: NetQuality;
}

function calcQuality(rtt: number | null, loss: number | null): NetQuality {
  if (rtt === null && loss === null) return "unknown";
  const r = rtt ?? 0;
  const l = loss ?? 0;
  if (r <= 150 && l <= 2) return "good";
  if (r <= 400 && l <= 8) return "medium";
  return "bad";
}

export function useConferenceStats(peers: React.MutableRefObject<Record<string, RTCPeerConnection>>) {
  const [peerStats, setPeerStats] = useState<Record<string, PeerNetStats>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const collect = useCallback(async () => {
    const peerMap = peers.current ?? {};
    const entries = Object.entries(peerMap);
    if (!entries.length) return;

    const results: Record<string, PeerNetStats> = {};

    await Promise.all(
      entries.map(async ([peerId, pc]) => {
        if (pc.connectionState === "closed" || pc.connectionState === "failed") {
          results[peerId] = { rtt: null, loss: null, jitter: null, quality: "bad" };
          return;
        }
        try {
          const reports = await pc.getStats();
          let rtt: number | null = null;
          let loss: number | null = null;
          let jitter: number | null = null;

          reports.forEach((r: any) => {
            // RTT from active ICE candidate-pair
            if (r.type === "candidate-pair" && r.state === "succeeded" && r.nominated) {
              if (r.currentRoundTripTime != null) rtt = Math.round(r.currentRoundTripTime * 1000);
            }
            // packet loss + jitter from inbound audio
            if (r.type === "inbound-rtp" && r.kind === "audio") {
              const total = (r.packetsLost ?? 0) + (r.packetsReceived ?? 1);
              loss = total > 0 ? Math.round(((r.packetsLost ?? 0) / total) * 100) : 0;
              if (r.jitter != null) jitter = Math.round(r.jitter * 1000);
            }
          });

          results[peerId] = { rtt, loss, jitter, quality: calcQuality(rtt, loss) };
        } catch {
          results[peerId] = { rtt: null, loss: null, jitter: null, quality: "unknown" };
        }
      })
    );

    setPeerStats(results);
  }, [peers]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    // Collect every 4s — frequent enough to be useful, light enough for CPU
    collect();
    intervalRef.current = setInterval(collect, 4000);
  }, [collect]);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPeerStats({});
  }, []);

  // Overall quality = worst peer quality
  const overallQuality: NetQuality = (() => {
    const values = Object.values(peerStats);
    if (!values.length) return "unknown";
    if (values.some((s) => s.quality === "bad")) return "bad";
    if (values.some((s) => s.quality === "medium")) return "medium";
    if (values.some((s) => s.quality === "good")) return "good";
    return "unknown";
  })();

  return { peerStats, overallQuality, start, stop };
}
