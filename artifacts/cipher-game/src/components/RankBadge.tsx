const RANK_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  Bronze:   { color: "#cd7f32", glow: "rgba(205,127,50,0.4)",  label: "BRONZE"   },
  Silver:   { color: "#9ca3af", glow: "rgba(156,163,175,0.4)", label: "SILVER"   },
  Gold:     { color: "#fbbf24", glow: "rgba(251,191,36,0.4)",  label: "GOLD"     },
  Platinum: { color: "#22d3ee", glow: "rgba(34,211,238,0.4)",  label: "PLATINUM" },
  Diamond:  { color: "#3b82f6", glow: "rgba(59,130,246,0.4)",  label: "DIAMOND"  },
  Master:   { color: "#a855f7", glow: "rgba(168,85,247,0.4)",  label: "MASTER"   },
  Legend:   { color: "#f97316", glow: "rgba(249,115,22,0.4)",  label: "LEGEND"   },
};

export function RankBadge({ tier, size = "sm" }: { tier: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const cfg = RANK_CONFIG[tier] || RANK_CONFIG.Bronze;
  const sizes = { xs: "text-[9px] px-1.5 py-0.5", sm: "text-xs px-2 py-1", md: "text-sm px-3 py-1.5", lg: "text-base px-4 py-2" };

  return (
    <span
      className={`font-mono font-bold tracking-widest rounded-sm ${sizes[size]}`}
      style={{
        color: cfg.color,
        border: `1px solid ${cfg.color}50`,
        boxShadow: `0 0 8px ${cfg.glow}, inset 0 0 8px ${cfg.glow}20`,
        background: `${cfg.color}10`,
      }}
    >
      {cfg.label}
    </span>
  );
}
