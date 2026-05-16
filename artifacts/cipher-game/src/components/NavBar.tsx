import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { clearToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { SoundToggle } from "./SoundToggle";

const NAV_ITEMS = [
  { path: "/dashboard", label: "COMMAND" },
  { path: "/play", label: "PLAY" },
  { path: "/story", label: "STORY" },
  { path: "/lore", label: "LORE" },
  { path: "/leaderboard", label: "RANKS" },
  { path: "/achievements", label: "INTEL" },
  { path: "/profile", label: "AGENT" },
  { path: "/multiplayer", label: "ARENA" },
  { path: "/tournaments", label: "TOURNEY" },
  { path: "/skill-tree", label: "SKILLS" },
  { path: "/shop", label: "SHOP" },
  { path: "/world-events", label: "EVENTS" },
  { path: "/team-ops", label: "TEAM OPS" },
];

export function NavBar() {
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();

  function handleLogout() {
    clearToken();
    qc.clear();
    setLocation("/");
  }

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-blue-500/20"
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard">
          <span className="font-mono text-lg font-bold tracking-widest neon-text-blue text-blue-400 cursor-pointer">
            CIPHER
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <span
                  className={`relative px-3 py-1.5 text-xs font-mono tracking-widest cursor-pointer transition-all duration-200 rounded ${
                    active
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-zinc-500 hover:text-blue-300 hover:bg-blue-500/5"
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-0 right-0 h-px bg-blue-400"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <SoundToggle />
          <button
            onClick={handleLogout}
            className="text-xs font-mono tracking-widest text-zinc-600 hover:text-red-400 transition-colors px-3 py-1.5"
            data-testid="logout-btn"
          >
            DISCONNECT
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
