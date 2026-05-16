import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface MonitorPacket {
  id: number;
  source: string;
  dest: string;
  type: string;
  size: number;
  ts: string;
}

const NODES = ["NODE-01A", "NODE-02B", "NODE-03C", "NODE-04D", "NODE-05E", "EXTERNAL-01", "EXTERNAL-02"];
const PACKET_TYPES = ["INTEL", "ACK", "QUERY", "RESPONSE", "ALERT", "SYNC", "HEARTBEAT"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function LiveSignalBar() {
  const bars = 32;
  const [heights, setHeights] = useState(() => Array.from({ length: bars }, () => Math.random() * 0.5));

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map((h) => {
          const drift = (Math.random() - 0.5) * 0.3;
          return Math.max(0.05, Math.min(1, h + drift));
        })
      );
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-end gap-[2px] h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all duration-200 ease-in-out"
          style={{
            height: `${h * 100}%`,
            background: h > 0.7
              ? "#22c55e"
              : h > 0.4
                ? "#3b82f6"
                : "#1e3a5f",
            opacity: 0.6 + h * 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function PacketFlowMonitor() {
  const [packets, setPackets] = useState<MonitorPacket[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      counterRef.current++;
      const packet: MonitorPacket = {
        id: counterRef.current,
        source: rand(NODES),
        dest: rand(NODES),
        type: rand(PACKET_TYPES),
        size: randInt(64, 1500),
        ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
      };
      setPackets((prev) => [...prev.slice(-49), packet]);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[10px]">
      {packets.length === 0 && (
        <p className="text-zinc-700 italic py-4 text-center">awaiting signal...</p>
      )}
      {packets.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-zinc-500"
        >
          <span className="text-zinc-700 w-14 shrink-0">{p.ts}</span>
          <span className={`shrink-0 w-2 h-2 rounded-full ${
            p.type === "ALERT" ? "bg-red-500" : p.type === "INTEL" ? "bg-green-500" : "bg-blue-500"
          }`} />
          <span className="w-16 shrink-0 text-zinc-400">{p.source}</span>
          <span className="text-zinc-700">→</span>
          <span className="w-16 shrink-0 text-zinc-400">{p.dest}</span>
          <span className={`${
            p.type === "ALERT" ? "text-red-400" : p.type === "INTEL" ? "text-green-400" : "text-blue-400"
          }`}>
            {p.type}
          </span>
          <span className="text-zinc-700 ml-auto">{p.size}B</span>
        </motion.div>
      ))}
    </div>
  );
}

export function ThreatMeter() {
  const [level, setLevel] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      const drift = Math.random() * 10 - 3;
      setLevel((prev) => Math.max(0, Math.min(100, prev + drift)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const color = level > 70 ? "bg-red-500" : level > 40 ? "bg-orange-500" : "bg-green-500";
  const label = level > 70 ? "CRITICAL" : level > 40 ? "ELEVATED" : "NORMAL";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-zinc-500 tracking-widest">THREAT LEVEL</span>
        <span className={`font-mono text-[10px] tracking-widest ${level > 70 ? "text-red-400" : level > 40 ? "text-orange-400" : "text-green-400"}`}>
          {label}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${level}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="font-mono text-[10px] text-zinc-700">{Math.round(level)}%</p>
    </div>
  );
}

export function NodeStatusGrid() {
  const [nodes, setNodes] = useState(() =>
    NODES.slice(0, 5).map((name) => ({
      name,
      status: Math.random() > 0.3 ? "online" : "unstable" as "online" | "unstable" | "offline",
      latency: randInt(10, 300),
      packets: randInt(100, 9999),
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          status: Math.random() > 0.85 ? "unstable" : Math.random() > 0.95 ? "offline" : "online",
          latency: Math.max(5, n.latency + randInt(-20, 20)),
          packets: n.packets + randInt(0, 10),
        }))
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      {nodes.map((n) => (
        <div key={n.name} className="flex items-center gap-3 py-1.5 border-b border-zinc-800/30 last:border-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            n.status === "online" ? "bg-green-500" : n.status === "unstable" ? "bg-orange-500" : "bg-red-500"
          }`} />
          <span className="font-mono text-[10px] text-zinc-400 w-20 shrink-0">{n.name}</span>
          <span className={`font-mono text-[10px] w-14 shrink-0 ${
            n.status === "online" ? "text-green-400" : n.status === "unstable" ? "text-orange-400" : "text-red-400"
          }`}>
            {n.status.toUpperCase()}
          </span>
          <span className="font-mono text-[10px] text-zinc-600">{n.latency}ms</span>
          <span className="font-mono text-[10px] text-zinc-700 ml-auto">{n.packets.toLocaleString()} PKT</span>
        </div>
      ))}
    </div>
  );
}

export function DataThroughputGauge() {
  const [inRate, setInRate] = useState(0);
  const [outRate, setOutRate] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const newIn = randInt(10, 500);
      const newOut = randInt(5, 200);
      setInRate(newIn);
      setOutRate(newOut);
      setTotalIn((prev) => prev + newIn);
      setTotalOut((prev) => prev + newOut);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-[10px] font-mono mb-1">
          <span className="text-zinc-500">INBOUND</span>
          <span className="text-green-400">{inRate.toLocaleString()} B/s</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500"
            animate={{ width: `${Math.min(100, (inRate / 500) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-mono mb-1">
          <span className="text-zinc-500">OUTBOUND</span>
          <span className="text-blue-400">{outRate.toLocaleString()} B/s</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            animate={{ width: `${Math.min(100, (outRate / 200) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <div className="pt-1 border-t border-zinc-800/30">
        <p className="font-mono text-[10px] text-zinc-700">TOTAL IN: {(totalIn / 1024).toFixed(1)} KB</p>
        <p className="font-mono text-[10px] text-zinc-700">TOTAL OUT: {(totalOut / 1024).toFixed(1)} KB</p>
      </div>
    </div>
  );
}