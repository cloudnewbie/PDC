import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  FileBarChart,
  LayoutDashboard,
  Megaphone,
  Radio,
  Search,
  Settings,
  Siren,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { careTeam, openEscalationCount } from "@/data/seed";
import { useCallEMode } from "@/lib/calle";
import { CommandPalette } from "@/components/app/CommandPalette";

const NAV = [
  { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/patients", label: "Patients", icon: Users },
  { to: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/app/live", label: "Live Call", icon: Radio, live: true },
  { to: "/app/results", label: "Call Results", icon: FileBarChart },
  { to: "/app/escalations", label: "Escalations", icon: Siren, badge: openEscalationCount },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const TITLES: [RegExp, string][] = [
  [/^\/app\/?$/, "Dashboard"],
  [/^\/app\/patients/, "Patients"],
  [/^\/app\/campaigns/, "Campaigns"],
  [/^\/app\/live/, "Live Call Console"],
  [/^\/app\/results/, "Call Results"],
  [/^\/app\/escalations/, "Escalations"],
  [/^\/app\/settings/, "Settings · CALL-E Integration"],
];

function ModePill({ onClick }: { onClick: () => void }) {
  const { mode } = useCallEMode();
  const live = mode === "live";
  return (
    <button
      type="button"
      onClick={onClick}
      title="CALL-E adapter mode — click to open integration settings"
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        live
          ? "border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/15"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-dot", live ? "bg-green-500" : "bg-amber-500")} />
      {live ? "Live · CALL-E" : "Demo Mode"}
    </button>
  );
}

/**
 * App shell (design.md §6.2) — 240px collapsible sidebar + 64px topbar,
 * renders routed pages via <Outlet/>.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useCallEMode();
  const nurse = careTeam[0];

  const title = useMemo(
    () => TITLES.find(([re]) => re.test(location.pathname))?.[1] ?? "Dashboard",
    [location.pathname],
  );

  // ⌘K / Ctrl+K opens the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-[100dvh] bg-paper">
      {/* -------------------------------------------------------- sidebar */}
      <aside
        className={cn(
          "sticky top-0 flex h-[100dvh] flex-col border-r border-line bg-white transition-[width] duration-300 ease-out-expo",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* logo */}
        <div className={cn("flex h-16 items-center gap-2.5 border-b border-line px-4", collapsed && "justify-center px-0")}>
          <img src="/logo.svg" alt="PDC" className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <span className="truncate text-[15px] font-semibold text-slate-900">
              Post-Discharge Check
            </span>
          )}
        </div>

        {/* nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-paper hover:text-slate-900",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-500" />}
                  <span className="relative shrink-0">
                    <item.icon className={cn("h-[18px] w-[18px]", isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.live && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-teal-400 animate-pulse-dot" />
                    )}
                  </span>
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="tnum rounded-full bg-coral-500 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* powered-by card */}
        <div className="border-t border-line p-3">
          {!collapsed ? (
            <div className="rounded-xl border border-line bg-paper p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <Zap className="h-3 w-3 text-violet-500" />
                Powered by CALL-E
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-dot", mode === "live" ? "bg-green-500" : "bg-amber-500")} />
                {mode === "live" ? "Live — real PSTN calls" : "Simulation engine"}
              </div>
              <div className="mt-1 font-mono text-[10px] text-slate-400">
                {mode === "live" ? "api.heycall-e.com · live PSTN" : "set VITE_CALLE_API_KEY for live"}
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Powered by CALL-E">
              <Zap className="h-4 w-4 text-violet-500" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-paper hover:text-slate-600"
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------ main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/85 px-6 backdrop-blur-lg">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold text-slate-900">{title}</h1>
            <p className="font-mono text-[11px] text-slate-400">PDC {location.pathname}</p>
          </div>

          <div className="flex items-center gap-3">
            <ModePill onClick={() => navigate("/app/settings")} />

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 text-[13px] text-slate-500 transition-colors hover:border-slate-300 sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">⌘K</kbd>
            </button>

            <button
              type="button"
              className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-paper"
              aria-label="Notifications"
              onClick={() => navigate("/app/escalations")}
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="tnum absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 font-mono text-[9px] font-bold text-white">
                {openEscalationCount}
              </span>
            </button>

            <div className="relative" title={`${nurse.name} — on call`}>
              <img src={nurse.avatar} alt={nurse.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-teal-500/30" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
            </div>
          </div>
        </header>

        {/* routed content */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
