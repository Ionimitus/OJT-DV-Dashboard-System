import React, { useState, useMemo, useEffect } from "react";
import { Outlet, useNavigate, useParams, useMatch, useLocation, Navigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "./theme";

// ── Helpers ───────────────────────────────────────────────────────────────────
function excelDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000);
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtAmt(n: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
}
function fmtAmtFull(n: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(n);
}

// ── Types & Data ──────────────────────────────────────────────────────────────
type Status = "PAID" | "PENDING" | "OVERDUE";
type StatusFilter = "ALL" | Status | "UNPAID";
type SortKey = "dv" | "dvDate" | "due" | "payee" | "particulars" | "tradeArea" | "amount" | "status";

interface Voucher {
  id: string; dvDate: Date; due: Date; payee: string;
  particulars: string; amount: number; tradeArea: string; status: Status;
}

const RAW: Voucher[] = [
  { id: "DV-2026-001", dvDate: excelDate(46268), due: excelDate(46275), payee: "Miguel",   particulars: "Supplies and mats", amount: 89021,  tradeArea: "ADMIN",   status: "PAID"    },
  { id: "DV-2026-002", dvDate: excelDate(46275), due: excelDate(46282), payee: "Samson",   particulars: "Payment",           amount: 93012,  tradeArea: "ADMIN",   status: "PENDING" },
  { id: "DV-2026-003", dvDate: excelDate(46276), due: excelDate(46262), payee: "Apple",    particulars: "Supplies and mats", amount: 9094,   tradeArea: "CANTEEN", status: "OVERDUE" },
  { id: "DV-2026-004", dvDate: excelDate(46277), due: excelDate(46291), payee: "Jason",    particulars: "Payment",           amount: 83951,  tradeArea: "ADMIN",   status: "PENDING" },
  { id: "DV-2026-005", dvDate: excelDate(46278), due: excelDate(46264), payee: "Anne",     particulars: "Payment",           amount: 5555,   tradeArea: "CANTEEN", status: "OVERDUE" },
  { id: "DV-2026-006", dvDate: excelDate(46279), due: excelDate(46286), payee: "Mikasa",   particulars: "Maintenance",       amount: 12335,  tradeArea: "DHT",     status: "PAID"    },
  { id: "DV-2026-007", dvDate: excelDate(46280), due: excelDate(46294), payee: "Eren",     particulars: "Payment",           amount: 95850,  tradeArea: "ADMIN",   status: "PENDING" },
  { id: "DV-2026-008", dvDate: excelDate(46281), due: excelDate(46288), payee: "Neko",     particulars: "Supplies and mats", amount: 100,    tradeArea: "DTEST",   status: "PAID"    },
  { id: "DV-2026-009", dvDate: excelDate(46282), due: excelDate(46289), payee: "Armin",    particulars: "Payment",           amount: 671,    tradeArea: "ST",      status: "PENDING" },
  { id: "DV-2026-010", dvDate: excelDate(46283), due: excelDate(46266), payee: "Sage",     particulars: "Payment",           amount: 421,    tradeArea: "ST",      status: "OVERDUE" },
  { id: "DV-2026-011", dvDate: excelDate(46284), due: excelDate(46298), payee: "Xiao",     particulars: "Cash advance",      amount: 88478,  tradeArea: "ADMIN",   status: "PENDING" },
  { id: "DV-2026-012", dvDate: excelDate(46285), due: excelDate(46292), payee: "Childe",   particulars: "AI Subscription",  amount: 10500,  tradeArea: "DHT",     status: "PAID"    },
  { id: "DV-2026-013", dvDate: excelDate(46286), due: excelDate(46293), payee: "Klee",     particulars: "Supplies and mats", amount: 854,    tradeArea: "DHT",     status: "PENDING" },
  { id: "DV-2026-014", dvDate: excelDate(46287), due: excelDate(46301), payee: "Cinnamon", particulars: "Payment",           amount: 984,    tradeArea: "TEST2",   status: "PENDING" },
];

const AREA_LABELS: Record<string, string> = {
  ALL: "All areas", ADMIN: "Admin", CANTEEN: "Canteen", DHT: "Dht", ST: "St", DTEST: "Dtest", TEST2: "Test2",
};

const PAGE_SIZE = 10;
const REF_TODAY = new Date(Math.max(...RAW.map((v) => v.dvDate.getTime())));

// ── Design tokens ─────────────────────────────────────────────────────────────
// Modern layered card: light surface + hairline border + soft elevation; dark variant
const card  = "bg-white dark:bg-[#111a2c] border border-slate-200/80 dark:border-slate-700/60 rounded-xl shadow-[0_1px_2px_rgba(15,39,68,0.04),0_8px_24px_-12px_rgba(15,39,68,0.10)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)]";

const btn = {
  primary:   "inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg bg-[#2563eb] text-white shadow-[0_1px_2px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-[#1d4ed8] active:bg-[#1e3a5f] active:shadow-none transition-colors disabled:opacity-40 disabled:pointer-events-none",
  secondary: "inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-[#1d4ed8] dark:text-blue-300 bg-white dark:bg-[#182338] hover:bg-[#eff6ff] dark:hover:bg-[#1f2c45] hover:border-[#bfdbfe] dark:hover:border-slate-500 active:bg-[#dbeafe] transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-[0_1px_2px_rgba(15,39,68,0.04)]",
  ghost:     "inline-flex items-center gap-1.5 h-9 px-2.5 text-sm text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-40",
  icon:      "flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 hover:text-[#1d4ed8] dark:hover:text-blue-300 transition-colors",
};

const inputCls = "h-9 w-full px-3 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-600 rounded-lg outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#bfdbfe] dark:focus:ring-blue-900/50 transition-all";

const BADGE_CLS: Record<Status, string> = {
  PAID:    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  PENDING: "bg-amber-50   text-amber-700   border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  OVERDUE: "bg-red-50     text-red-700     border border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
};
const DOT_CLS: Record<Status, string> = {
  PAID: "bg-emerald-500", PENDING: "bg-amber-400", OVERDUE: "bg-red-500",
};

// ── Primitive components ──────────────────────────────────────────────────────
function Badge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full leading-none ${BADGE_CLS[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLS[status]}`} />
      {status === "PAID" ? "Paid" : status === "PENDING" ? "Pending" : "Overdue"}
    </span>
  );
}

function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-700/40 ${className}`} style={style} />;
}

function EmptyState({
  icon, title, description, action,
}: {
  icon?: React.ReactNode; title: string; description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-3 text-slate-300 dark:text-slate-600">{icon}</div>}
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">{description}</p>}
      {action && (
        <button onClick={action.onClick} className={`mt-4 ${btn.secondary}`}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function Separator({ className = "" }: { className?: string }) {
  return <div className={`border-t border-slate-100 dark:border-slate-800 ${className}`} />;
}

// Compact ERP-style status chip — tighter than Badge, no leading dot
function StatusChip({ status }: { status: Status }) {
  const cls: Record<Status, string> = {
    PAID:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    PENDING: "bg-amber-50   text-amber-700   border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    OVERDUE: "bg-red-50     text-red-700     border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border leading-4 whitespace-nowrap ${cls[status]}`}>
      {status === "PAID" ? "Paid" : status === "PENDING" ? "Pending" : "Overdue"}
    </span>
  );
}

function FilterCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full bg-[#1e3a5f] text-white">
      {count}
    </span>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = {
  Dashboard: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="8.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="1.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
    </svg>
  ),
  Vouchers: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 2h9a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M4.5 5h6M4.5 7.5h6M4.5 10h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Reports: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 11.5l2.5-4 2.5 2 2.5-5.5 2.5 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Areas: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7.5 2c0 0-2.5 2-2.5 5.5S7.5 13 7.5 13M7.5 2c0 0 2.5 2 2.5 5.5S7.5 13 7.5 13M2 7.5h11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Settings: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7.5 1.5v1.5M7.5 12v1.5M1.5 7.5H3M12 7.5h1.5M3.2 3.2l1.1 1.1M10.7 10.7l1.1 1.1M3.2 11.8l1.1-1.1M10.7 4.3l1.1-1.1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  ChevRight: ({ open }: { open: boolean }) => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
      <path d="M4 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Sort: ({ active, asc }: { active: boolean; asc: boolean }) => (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="none" className={active ? "text-slate-600" : "text-slate-300"}>
      <path d="M4 1v8M1.5 3.5L4 1l2.5 2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity={active && !asc ? 0.35 : 1}/>
      <path d="M1.5 6.5L4 9l2.5-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity={active && asc ? 0.35 : 1}/>
    </svg>
  ),
  ChevL: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevR: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Link: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M3 2h8v8M11 2L2 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Download: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v7.5M3.5 6l3 2.5 3-2.5M2 10v.5a1 1 0 001 1h7.5a1 1 0 001-1V10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Filter: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3h10M3 6.5h7M4.5 10h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  X: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  SheetIcon: () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="6" y="6" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13 14h14M13 20h14M13 26h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  BarIcon: () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path d="M8 32V22M16 32V14M24 32V18M32 32V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.8 2.8l1 1M11.2 11.2l1 1M2.8 12.2l1-1M11.2 3.8l1-1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Moon: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 9.5A6 6 0 015.5 2a6 6 0 107.5 7.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  ),
  Monitor: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="4" width="12" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M5 14h5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Report pages nav ──────────────────────────────────────────────────────────
const REPORT_PAGES = [
  { id: "report-exposure", label: "Payment Exposure",     path: "/reports/exposure"  },
  { id: "report-overdue",  label: "Overdue Vouchers",     path: "/reports/overdue"   },
  { id: "report-by-area",  label: "Unpaid by Trade Area", path: "/reports/by-area"   },
  { id: "report-register", label: "Payment Register",     path: "/reports/register"  },
] as const;

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { mode, setMode } = useTheme();
  const [vOpen, setVOpen] = useState(true);

  const onDashboard = !!useMatch("/dashboard");
  const onVouchers  = location.pathname.startsWith("/vouchers");
  const onReports   = location.pathname.startsWith("/reports");
  const onAreas     = location.pathname === "/trade-areas";
  const onSettings  = location.pathname === "/settings";
  const [rOpen, setROpen] = useState(onReports);

  const navCls = (active: boolean) =>
    `relative w-full flex items-center justify-center group-hover/nav:justify-start gap-2.5 px-0 group-hover/nav:px-3 py-2 rounded-xl text-sm text-left transition-colors duration-150 select-none ${
      active
        ? "bg-white/15 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
        : "text-[#dbeafe] hover:text-white hover:bg-white/10"
    }`;

  const subCls = (active: boolean, muted = false) =>
    `w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-sm text-left whitespace-nowrap transition-colors duration-150 select-none ${
      active ? "bg-white/15 text-white font-medium" : "text-[#dbeafe] hover:text-white hover:bg-white/10"
    } ${muted ? "opacity-50" : ""}`;

  const VOUCHER_AREAS = [
    { area: "ALL",     label: "All",     muted: false },
    { area: "ADMIN",   label: "Admin",   muted: false },
    { area: "CANTEEN", label: "Canteen", muted: false },
    { area: "DHT",     label: "Dht",     muted: false },
    { area: "ST",      label: "St",      muted: false },
    { area: "DTEST",   label: "Dtest",   muted: true  },
    { area: "TEST2",   label: "Test2",   muted: true  },
  ];

  const labelCls = "hidden min-w-0 truncate group-hover/nav:block";
  const navIcon  = "flex-shrink-0 flex items-center justify-center w-5 h-5 opacity-90 [&_svg]:w-[18px] [&_svg]:h-[18px]";
  const chev     = "hidden flex-shrink-0 group-hover/nav:block";

  return (
    <aside
      className="group/nav fixed top-3 left-3 bottom-3 z-30 flex w-16 hover:w-60 flex-col overflow-hidden rounded-2xl transition-[width] duration-300 ease-out"
      style={{
        background: "linear-gradient(180deg, rgba(21,45,74,0.96) 0%, rgba(15,33,58,0.98) 100%)",
        backdropFilter: "blur(22px) saturate(180%)",
        WebkitBackdropFilter: "blur(22px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px -12px rgba(15,39,68,0.45)",
      }}
    >
      {/* Logo — symbol only until hover */}
      <div className="flex items-center justify-center gap-2.5 px-3 pt-5 pb-4 group-hover/nav:justify-start">
        <button
          onClick={() => navigate("/dashboard")}
          title="DV Monitor"
          className="w-9 h-9 rounded-xl bg-[#2563eb] backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-[0_6px_16px_-4px_rgba(37,99,235,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#1d4ed8] transition-colors"
        >
          <span className="text-white text-[11px] font-bold tracking-tight">DV</span>
        </button>
        <div className="hidden min-w-0 leading-tight group-hover/nav:block">
          <p className="text-[9px] font-semibold text-blue-200/90 tracking-[0.18em] uppercase mb-0.5">TESDA</p>
          <p className="text-[13px] font-semibold text-white truncate">DV Monitor</p>
        </div>
      </div>

      <div className="mx-3 mb-3 border-t border-white/10" />

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        <button onClick={() => navigate("/dashboard")} title="Dashboard" className={navCls(onDashboard)}>
          <span className={navIcon}><Ic.Dashboard /></span>
          <span className={labelCls}>Dashboard</span>
        </button>

        {/* Vouchers */}
        <div>
          <button
            onClick={() => { setVOpen(v => !v); navigate("/vouchers"); }}
            title="Vouchers"
            className={navCls(onVouchers)}
          >
            <span className={navIcon}><Ic.Vouchers /></span>
            <span className="hidden min-w-0 flex-1 truncate group-hover/nav:block">Vouchers</span>
            <span className={chev}><Ic.ChevRight open={vOpen} /></span>
          </button>
          {vOpen && (
            <div className="mt-0.5 hidden space-y-0.5 group-hover/nav:block">
              {VOUCHER_AREAS.map(({ area, label, muted }) => {
                const path = area === "ALL" ? "/vouchers" : `/vouchers?area=${area}`;
                const active = onVouchers && (
                  area === "ALL"
                    ? !location.search.includes("area=")
                    : location.search.includes(`area=${area}`)
                );
                return (
                  <button key={area} onClick={() => navigate(path)} className={subCls(active, muted)}>
                    <span className="w-1 h-1 rounded-full bg-current flex-shrink-0 opacity-60" />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reports */}
        <div>
          <button
            onClick={() => { setROpen(r => !r); if (!onReports) navigate("/reports/exposure"); }}
            title="Reports"
            className={navCls(onReports)}
          >
            <span className={navIcon}><Ic.Reports /></span>
            <span className="hidden min-w-0 flex-1 truncate group-hover/nav:block">Reports</span>
            <span className={chev}><Ic.ChevRight open={rOpen} /></span>
          </button>
          {rOpen && (
            <div className="mt-0.5 hidden space-y-0.5 group-hover/nav:block">
              {REPORT_PAGES.map(r => {
                const active = location.pathname === r.path;
                return (
                  <button key={r.id} onClick={() => navigate(r.path)} className={subCls(active)}>
                    <span className="w-1 h-1 rounded-full bg-current flex-shrink-0 opacity-60" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={() => navigate("/trade-areas")} title="Trade Areas" className={navCls(onAreas)}>
          <span className={navIcon}><Ic.Areas /></span>
          <span className={labelCls}>Trade Areas</span>
        </button>

        <button onClick={() => navigate("/settings")} title="Settings" className={navCls(onSettings)}>
          <span className={navIcon}><Ic.Settings /></span>
          <span className={labelCls}>Settings</span>
        </button>
      </nav>

      {/* Theme toggle — pinned to the bottom of the rail */}
      <div className="px-2 pb-3 pt-2 mx-1 border-t border-white/10">
        <button
          onClick={() => setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light")}
          title={`Theme: ${mode.charAt(0).toUpperCase() + mode.slice(1)} (click to switch)`}
          className={`${navCls(false)}`}
        >
          <span className={navIcon}>
            {mode === "dark" ? <Ic.Moon /> : mode === "system" ? <Ic.Monitor /> : <Ic.Sun />}
          </span>
          <span className={labelCls}>Theme: {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
          <span className="hidden w-1 h-1 rounded-full bg-white/40 group-hover/nav:block ml-auto flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────
function DetailSheet({ voucher, onClose }: { voucher: Voucher | null; onClose: () => void }) {
  const navigate = useNavigate();
  const open = voucher !== null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isPastDue = voucher && voucher.status !== "PAID" && voucher.due < REF_TODAY;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-[360px] z-50 bg-white dark:bg-[#111a2c] border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-out shadow-[-16px_0_40px_-20px_rgba(15,39,68,0.25)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {voucher && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-6 pb-5">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-1">{voucher.id}</p>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">{voucher.payee}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{voucher.particulars}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-3 mt-0.5">
                <button
                  onClick={() => navigate(`/vouchers/${voucher.id}`)}
                  className={btn.icon}
                  title="Open permalink"
                >
                  <Ic.Link />
                </button>
                <button onClick={onClose} className={btn.icon}>
                  <Ic.Close />
                </button>
              </div>
            </div>

            <Separator />

            {/* Amount + Status */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Amount</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums leading-tight">
                  {fmtAmtFull(voucher.amount)}
                </p>
              </div>
              <Badge status={voucher.status} />
            </div>

            <Separator />

            {/* Fields */}
            <div className="flex-1 overflow-y-auto">
              {[
                { label: "Trade Area",  value: AREA_LABELS[voucher.tradeArea] ?? voucher.tradeArea },
                { label: "DV Date",     value: fmtDate(voucher.dvDate) },
                {
                  label: "Due Date",
                  value: fmtDate(voucher.due),
                  accent: isPastDue,
                },
              ].map(({ label, value, accent }, i) => (
                <div key={label} className={`px-5 py-3.5 ${i > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                  <p className={`text-sm font-medium ${accent ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>{value}</p>
                  {accent && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Past due</p>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            <div className="px-5 py-4">
              <button
                onClick={() => { navigate(`/vouchers/${voucher.id}`); onClose(); }}
                className={`w-full ${btn.secondary} justify-center`}
              >
                <Ic.Link />
                Open full detail
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// ── VoucherDetailPage — standalone shareable page ─────────────────────────────
export function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const voucher  = RAW.find(v => v.id === id) ?? null;
  const isPastDue = voucher && voucher.status !== "PAID" && voucher.due < REF_TODAY;

  if (!voucher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f6fb] dark:bg-[#0b1220] transition-colors">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Voucher not found</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 font-mono">{id}</p>
        <button onClick={() => navigate("/vouchers")} className={btn.primary}>
          Back to vouchers
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0b1220] transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg mx-auto px-6 py-12">
        <button onClick={() => navigate("/vouchers")}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-6">
          <Ic.ChevL /> Back to vouchers
        </button>

        <div className={card}>
          {/* Header band */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 font-mono mb-1">TESDA · DV Monitor</p>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{voucher.id}</h1>
              </div>
              <Badge status={voucher.status} />
            </div>
          </div>

          {/* Amount */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Amount</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">{fmtAmtFull(voucher.amount)}</p>
          </div>

          {/* Fields */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: "Payee",       value: voucher.payee },
              { label: "Particulars", value: voucher.particulars },
              { label: "Trade Area",  value: AREA_LABELS[voucher.tradeArea] ?? voucher.tradeArea },
              { label: "DV Date",     value: fmtDate(voucher.dvDate) },
              { label: "Due Date",    value: fmtDate(voucher.due), accent: !!isPastDue },
            ].map(({ label, value, accent }) => (
              <div key={label} className="px-6 py-3.5 flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <p className={`text-sm font-medium ${accent ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-[10px]">
            <p className="text-xs text-slate-400 dark:text-slate-500">As of {fmtDate(REF_TODAY)}</p>
            <button onClick={() => navigate("/vouchers")}
              className="text-sm font-medium text-[#1d4ed8] dark:text-blue-400 hover:text-[#122540] dark:hover:text-blue-300 transition-colors">
              View all vouchers →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ChartTooltip ──────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name?: string; fill?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#182338] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-[0_8px_24px_-8px_rgba(15,39,68,0.2)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] text-xs">
      {label && <p className="text-slate-400 dark:text-slate-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-medium font-mono" style={{ color: p.fill ?? "#1e3a5f" }}>
          {p.name ? `${p.name}: ` : ""}{fmtAmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState("all");
  const [detail,    setDetail]    = useState<Voucher | null>(null);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 700);
    return () => clearTimeout(t);
  }, []);

  const in7 = new Date(REF_TODAY);
  in7.setDate(REF_TODAY.getDate() + 7);

  const filtered = useMemo(() => {
    if (dateRange === "all") return RAW;
    const cut = new Date(REF_TODAY);
    if (dateRange === "7d")  cut.setDate(REF_TODAY.getDate() - 7);
    if (dateRange === "30d") cut.setDate(REF_TODAY.getDate() - 30);
    return RAW.filter(v => v.dvDate >= cut);
  }, [dateRange]);

  const paid      = filtered.filter(v => v.status === "PAID");
  const unpaid    = filtered.filter(v => v.status !== "PAID");
  const overdueV  = unpaid.filter(v => v.status === "OVERDUE");
  const dueSoonV  = unpaid.filter(v => v.status !== "OVERDUE" && v.due >= REF_TODAY && v.due <= in7);
  const dueLaterV = unpaid.filter(v => v.status !== "OVERDUE" && v.due > in7);

  const overdueAmt  = overdueV.reduce((s, v)  => s + v.amount, 0);
  const dueSoonAmt  = dueSoonV.reduce((s, v)  => s + v.amount, 0);
  const dueLaterAmt = dueLaterV.reduce((s, v) => s + v.amount, 0);
  const totalUnpaid = overdueAmt + dueSoonAmt + dueLaterAmt;
  const totalAmt    = filtered.reduce((s, v) => s + v.amount, 0);
  const paidAmt     = paid.reduce((s, v) => s + v.amount, 0);
  const paidRate    = filtered.length ? Math.round((paid.length / filtered.length) * 100) : 0;

  const bars = [
    { label: "Overdue",   amt: overdueAmt,  cnt: overdueV.length,  fill: "#ef4444", bg: "bg-red-500",   rows: overdueV  },
    { label: "Due soon",  amt: dueSoonAmt,  cnt: dueSoonV.length,  fill: "#f59e0b", bg: "bg-amber-400", rows: dueSoonV  },
    { label: "Due later", amt: dueLaterAmt, cnt: dueLaterV.length, fill: "#93c5fd", bg: "bg-[#93c5fd]", rows: dueLaterV },
  ];

  const areaData = useMemo(() =>
    ["ADMIN","CANTEEN","DHT","ST","DTEST","TEST2"].map(a => ({
      name: AREA_LABELS[a],
      amount: filtered.filter(v => v.tradeArea === a).reduce((s, v) => s + v.amount, 0),
    })).filter(r => r.amount > 0),
    [filtered]
  );

  const recent = [...filtered].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 10);

  // Outer container fills exactly the padded viewport (py-8 = 32px × 2 = 64px)
  return (
    <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="leading-tight">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">As of {fmtDate(REF_TODAY)}</p>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect value={dateRange} onChange={setDateRange} w="w-36" options={DATE_RANGE_OPTIONS} />
          <button onClick={() => navigate("/vouchers")} className={btn.secondary}>
            View all vouchers
          </button>
        </div>
      </div>

      {/* ── Accounting KPI strip — fixed-color premium cards ─────────────────── */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {loaded ? [
          {
            label: "Invoices registered", value: String(filtered.length),
            detail: fmtAmt(totalAmt), helper: "Total registered value",
            tile: "from-[#1e3a5f] to-[#16324f]", glow: "rgba(37,99,235,0.35)",
          },
          {
            label: "Outstanding balance", value: fmtAmt(totalUnpaid),
            detail: `${unpaid.length} invoice${unpaid.length !== 1 ? "s" : ""}`, helper: "Pending + overdue",
            tile: "from-[#2563eb] to-[#1d4ed8]", glow: "rgba(37,99,235,0.45)",
          },
          {
            label: "Overdue", value: fmtAmt(overdueAmt),
            detail: `${overdueV.length} invoice${overdueV.length !== 1 ? "s" : ""}`, helper: "Requires follow-up",
            tile: "from-[#ef4444] to-[#dc2626]", glow: "rgba(239,68,68,0.4)",
          },
          {
            label: "Paid", value: fmtAmt(paidAmt),
            detail: `${paid.length} invoice${paid.length !== 1 ? "s" : ""} · ${paidRate}%`, helper: "Of selected invoices",
            tile: "from-[#10b981] to-[#059669]", glow: "rgba(16,185,129,0.4)",
          },
        ].map(({ label, value, detail, helper, tile, glow }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${tile} shadow-[0_8px_24px_-8px_rgba(0,0,0,0.30)]`}
          >
            {/* Decorative radial glow */}
            <div
              className="absolute -right-6 -top-8 w-28 h-28 rounded-full blur-2xl opacity-60 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
            />
            {/* Subtle dot-pattern texture */}
            <div
              className="absolute right-3 top-3 w-16 h-16 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                backgroundSize: "8px 8px",
              }}
            />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</p>
              <p className="mt-1.5 text-xl font-semibold leading-tight tabular-nums text-white drop-shadow-sm">
                {value}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/15 pt-2.5">
                <span className="text-xs font-medium text-white/90 tabular-nums">{detail}</span>
                <span className="text-[10px] text-white/60 whitespace-nowrap">{helper}</span>
              </div>
            </div>
          </div>
        )) : Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${card} px-4 py-3`}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-32" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>

      {/* ── Main 2 × 2 grid — fills remaining height ─────────────────────────── */}
      <div
        className="grid gap-3 flex-1 min-h-0"
        style={{ gridTemplateColumns: "3fr 2fr", gridTemplateRows: "1fr 1fr" }}
      >

        {/* Payment Exposure — top left */}
        <div className={`${card} flex flex-col min-h-0`}>
          <div className="flex items-baseline justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Payment Exposure</h2>
            <span className="text-xs text-slate-400 dark:text-slate-400 font-mono tabular-nums">{fmtAmt(totalUnpaid)} total unpaid</span>
          </div>
          <div className="flex-1 min-h-0 flex flex-col justify-between px-4 py-4">
            {loaded ? (
              <>
                <div className="space-y-3.5">
                  {bars.map(row => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${row.bg}`} />
                          {row.label}
                          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums font-mono">
                            {row.cnt} voucher{row.cnt !== 1 ? "s" : ""}
                          </span>
                        </span>
                        <span className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">{fmtAmt(row.amt)}</span>
                      </div>
                      <div className="h-6 rounded bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                        <div
                          className="h-full rounded transition-[width] duration-700 ease-out"
                          style={{
                            width: `${totalUnpaid ? Math.max((row.amt / totalUnpaid) * 100, row.amt > 0 ? 1.5 : 0) : 0}%`,
                            background: row.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Due soon: {fmtDateShort(REF_TODAY)} – {fmtDateShort(in7)}</p>
                  <button
                    onClick={() => navigate("/reports/exposure")}
                    className="text-xs font-medium text-[#1d4ed8] dark:text-blue-400 hover:underline"
                  >
                    Full exposure report →
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3.5">
                {bars.map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between mb-1.5">
                      <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-6 rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Due Soon — top right */}
        <div className={`${card} flex flex-col min-h-0`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Due Soon</h2>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
              {dueSoonV.length} voucher{dueSoonV.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <p className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 leading-tight">{fmtAmt(dueSoonAmt)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Next 7 days · pending only</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {!loaded ? (
              <div className="px-4 py-3 space-y-2.5">
                {[1,2,3].map(i => <Skeleton key={i} className="h-9 rounded" />)}
              </div>
            ) : dueSoonV.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Nothing due in the next 7 days.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dueSoonV.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setDetail(v)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-mono font-medium text-slate-900 dark:text-slate-100 truncate">{v.id}</span>
                      <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 flex-shrink-0">{fmtAmt(v.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{v.payee}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0 tabular-nums">Due {fmtDateShort(v.due)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button onClick={() => navigate("/vouchers")} className="text-xs font-medium text-[#1d4ed8] dark:text-blue-400 hover:underline">
              View all unpaid →
            </button>
          </div>
        </div>

        {/* Amount by Trade Area — bottom left */}
        <div className={`${card} flex flex-col min-h-0`}>
          <div className="flex items-baseline justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Amount by trade area</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">{areaData.length} areas</span>
          </div>
          <div className="flex-1 min-h-0 p-3 dark:[&_.recharts-text]:fill-slate-400">
            {loaded ? (
              areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} layout="vertical" barCategoryGap="30%"
                    margin={{ top: 4, right: 72, left: 4, bottom: 4 }}>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `₱${Math.round(v / 1000)}k`}
                    />
                    <YAxis
                      type="category" dataKey="name" width={52}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="amount" fill="#1e3a5f" radius={[0, 3, 3, 0]}
                      label={{ position: "right", formatter: (v: unknown) => `₱${Math.round((v as number)/1000)}k`, fontSize: 10, fill: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No data" description="No vouchers in the selected period." />
              )
            ) : (
              <div className="space-y-2.5 p-1">
                {[90,70,52,38].map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3.5 w-10 flex-shrink-0" />
                    <Skeleton className="h-5 rounded" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Vouchers — bottom right */}
        <div className={`${card} flex flex-col min-h-0`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Recent vouchers</h2>
            <button onClick={() => navigate("/vouchers")} className="text-xs font-medium text-[#1d4ed8] dark:text-blue-400 hover:underline">
              View all
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loaded ? (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#111a2c] z-10 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2 pl-4 pr-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-left">DV #</th>
                    <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-left">Payee</th>
                    <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-left">Due</th>
                    <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-right">Amount</th>
                    <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 text-left" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recent.map(v => {
                    const isPastDue = v.status !== "PAID" && v.due < REF_TODAY;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setDetail(v)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="py-2 pl-4 pr-3 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{v.id}</td>
                        <td className="py-2 pr-3 text-xs text-slate-600 dark:text-slate-300 max-w-[72px] truncate">{v.payee}</td>
                        <td className={`py-2 pr-3 text-xs tabular-nums whitespace-nowrap ${isPastDue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                          {fmtDateShort(v.due)}
                        </td>
                        <td className="py-2 pr-3 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 text-right tabular-nums whitespace-nowrap">
                          {fmtAmt(v.amount)}
                        </td>
                        <td className="py-2 pr-4"><Badge status={v.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-3 space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <Skeleton className="h-3.5 w-24 flex-shrink-0" />
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-3.5 w-14 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <DetailSheet voucher={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ── Shared dropdown option sets — used by the modern CustomSelect ─────────────
const DATE_RANGE_OPTIONS: SelectOption[] = [
  { value: "all", label: "All time",    description: "Full dataset" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d",  label: "Last 7 days" },
];

const AREA_OPTIONS: SelectOption[] = [
  { value: "ALL",     label: "All areas", dot: "bg-slate-400" },
  { value: "ADMIN",   label: "Admin",     dot: "bg-blue-500" },
  { value: "CANTEEN", label: "Canteen",   dot: "bg-emerald-500" },
  { value: "DHT",     label: "Dht",       dot: "bg-amber-500" },
  { value: "ST",      label: "St",        dot: "bg-violet-500" },
  { value: "DTEST",   label: "Dtest",     dot: "bg-cyan-500" },
  { value: "TEST2",   label: "Test2",     dot: "bg-rose-500" },
];

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "ALL",     label: "All statuses" },
  { value: "PAID",    label: "Paid",    dot: "bg-emerald-500", description: "Completed" },
  { value: "PENDING", label: "Pending", dot: "bg-amber-400",   description: "Awaiting payment" },
  { value: "UNPAID",  label: "Unpaid",  dot: "bg-red-500",     description: "Pending + overdue" },
];

const REPORT_STATUS_OPTIONS: SelectOption[] = [
  { value: "ALL",     label: "All statuses" },
  { value: "PAID",    label: "Paid",    dot: "bg-emerald-500" },
  { value: "PENDING", label: "Pending", dot: "bg-amber-400" },
  { value: "OVERDUE", label: "Overdue", dot: "bg-red-500" },
];

// ── StatusSelect — custom styled dropdown for status filter ───────────────────
type SelectOption = {
  value: string;
  label: string;
  dot?: string;
  description?: string;
};

function CustomSelect({
  value, onChange, options, w = "w-44", placeholder = "Select…",
}: {
  value: string; onChange: (v: string) => void;
  options: SelectOption[]; w?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${w}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-9 pl-3 pr-2.5 flex items-center justify-between gap-2 text-sm rounded-lg border transition-all ${
          open
            ? "border-[#2563eb] ring-2 ring-[#bfdbfe] dark:ring-blue-900/50 bg-white dark:bg-[#111a2c] text-slate-800 dark:text-slate-100"
            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#111a2c] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.dot && (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`} />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <svg
          className={`flex-shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none"
        >
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Menu */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-full bg-white dark:bg-[#182338] border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_8px_24px_-4px_rgba(15,39,68,0.15),0_2px_8px_-2px_rgba(15,39,68,0.08)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] py-1 overflow-hidden"
          style={{ animation: "dropIn 120ms ease-out" }}
        >
          <style>{`
            @keyframes dropIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0)   scale(1); }
            }
          `}</style>
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isFirst    = i === 0;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-75 ${
                  isSelected
                    ? "bg-[#1e3a5f]/6 text-[#1e3a5f] dark:bg-[#2a4770]/50 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                } ${isFirst ? "" : ""}`}
              >
                {/* Color dot or spacer */}
                <span className="flex-shrink-0 w-4 flex items-center justify-center">
                  {opt.dot
                    ? <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    : <span className="w-2 h-2" />
                  }
                </span>

                <span className="flex-1 min-w-0">
                  <span className={`block text-sm ${isSelected ? "font-medium" : ""}`}>{opt.label}</span>
                  {opt.description && (
                    <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">{opt.description}</span>
                  )}
                </span>

                {/* Check */}
                {isSelected && (
                  <svg className="flex-shrink-0 text-[#1e3a5f] dark:text-blue-300" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── VouchersPage ──────────────────────────────────────────────────────────────
export function VouchersPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const activeArea   = searchParams.get("area") ?? "ALL";

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey,      setSortKey]      = useState<SortKey>("dv");
  const [sortAsc,      setSortAsc]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [detail,       setDetail]       = useState<Voucher | null>(null);
  const [loaded,       setLoaded]       = useState(false);

  const ROWS_PER_PAGE = 20;

  useEffect(() => {
    setLoaded(false);
    setPage(1);
    const t = setTimeout(() => setLoaded(true), 350);
    return () => clearTimeout(t);
  }, [activeArea]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(true); }
    setPage(1);
  };

  const handleAreaChange = (area: string) => {
    setPage(1);
    navigate(area === "ALL" ? "/vouchers" : `/vouchers?area=${area}`);
  };

  const filtered = useMemo(() => {
    let rows = activeArea !== "ALL" ? RAW.filter(v => v.tradeArea === activeArea) : RAW;
    if (statusFilter === "UNPAID")        rows = rows.filter(v => v.status !== "PAID");
    else if (statusFilter !== "ALL")      rows = rows.filter(v => v.status === statusFilter as Status);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(v =>
        v.id.toLowerCase().includes(q) ||
        v.payee.toLowerCase().includes(q) ||
        v.particulars.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        (AREA_LABELS[v.tradeArea] ?? v.tradeArea).toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "dvDate":     av = a.dvDate.getTime(); bv = b.dvDate.getTime(); break;
        case "due":        av = a.due.getTime();    bv = b.due.getTime();    break;
        case "payee":      av = a.payee;            bv = b.payee;            break;
        case "particulars":av = a.particulars;      bv = b.particulars;      break;
        case "tradeArea":  av = a.tradeArea;        bv = b.tradeArea;        break;
        case "amount":     av = a.amount;           bv = b.amount;           break;
        case "status":     av = a.status;           bv = b.status;           break;
        default:           av = a.id;               bv = b.id;
      }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortAsc ? 1 : -1);
    });
  }, [activeArea, statusFilter, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const activeFilterCount = [
    search.trim() !== "",
    statusFilter !== "ALL",
    activeArea !== "ALL",
  ].filter(Boolean).length;

  const handleReset = () => {
    setSearch(""); setStatusFilter("ALL"); setPage(1);
    if (activeArea !== "ALL") navigate("/vouchers");
  };

  // Column definitions — drives both header and sort
  const cols: { key: SortKey; label: string; right?: boolean }[] = [
    { key: "dv",          label: "DV Number" },
    { key: "dvDate",      label: "DV Date" },
    { key: "due",         label: "Due Date" },
    { key: "payee",       label: "Payee" },
    { key: "particulars", label: "Particulars" },
    { key: "tradeArea",   label: "Area" },
    { key: "amount",      label: "Amount", right: true },
    { key: "status",      label: "Status" },
  ];

  return (
    <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Page title ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          {activeArea === "ALL" ? "All Vouchers" : `${AREA_LABELS[activeArea]} Vouchers`}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Full disbursement register</p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Ic.Search />
          </span>
          <input
            type="text"
            placeholder="Search DV #, payee, particulars…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-[34px] pl-8 pr-7 w-64 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-600 rounded-lg outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#bfdbfe] dark:focus:ring-blue-900/50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Ic.X />
            </button>
          )}
        </div>

        {/* Status */}
        <CustomSelect
          value={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
          w="w-40"
          options={STATUS_FILTER_OPTIONS}
        />

        {/* Area */}
        <CustomSelect value={activeArea} onChange={handleAreaChange} w="w-40" options={AREA_OPTIONS} />

        {/* Reset */}
        {activeFilterCount > 0 && (
          <button onClick={handleReset}
            className="h-[34px] px-2.5 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <Ic.X />
            Reset
          </button>
        )}

        <div className="flex-1" />

        {/* Count */}
        <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums font-mono">
          {filtered.length === RAW.length
            ? `${RAW.length} vouchers`
            : `${filtered.length} of ${RAW.length} vouchers`}
        </p>
      </div>

      {/* ── Data grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-[#111a2c] overflow-hidden shadow-[0_1px_2px_rgba(15,39,68,0.04),0_8px_24px_-12px_rgba(15,39,68,0.10)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)]">

        {/* Scrollable table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#0f172a]">
                {/* Dot col */}
                <th className="w-8 pl-3 pr-1 py-2.5 bg-[#f8fafc] dark:bg-[#0f172a]" />
                {cols.map(c => (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    className={`px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-100 whitespace-nowrap transition-colors bg-[#f8fafc] dark:bg-[#0f172a] ${c.right ? "text-right" : ""}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${c.right ? "flex-row-reverse" : ""}`}>
                      {c.label}
                      <Ic.Sort active={sortKey === c.key} asc={sortAsc} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loaded ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className={`border-b border-slate-100 dark:border-slate-800 ${i % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/20" : ""}`}>
                    <td className="pl-3 pr-1 py-2.5"><Skeleton className="w-2 h-2 rounded-full" /></td>
                    {[88, 60, 68, 80, 130, 44, 70, 52].map((w, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <Skeleton className="h-3 rounded" style={{ width: `${w}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<Ic.SheetIcon />}
                      title="No vouchers match your filters"
                      description="Adjust the search query, status, or area filter."
                      action={activeFilterCount > 0 ? { label: "Reset filters", onClick: handleReset } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((v, idx) => {
                  const isPastDue = v.status !== "PAID" && v.due < REF_TODAY;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setDetail(v)}
                      className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors duration-75 hover:bg-[#f5f8fd] dark:hover:bg-slate-700/30 ${idx % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/20" : "bg-white dark:bg-transparent"}`}
                    >
                      {/* Status dot */}
                      <td className="pl-3 pr-1 py-2.5">
                        <span className={`w-2 h-2 rounded-full block flex-shrink-0 ${DOT_CLS[v.status]}`} />
                      </td>

                      {/* DV # */}
                      <td className="px-3 py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {v.id}
                      </td>

                      {/* DV Date */}
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums font-mono">
                        {fmtDateShort(v.dvDate)}
                      </td>

                      {/* Due Date */}
                      <td className="px-3 py-2.5">
                        <p className={`whitespace-nowrap tabular-nums font-mono leading-tight ${isPastDue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                          {fmtDateShort(v.due)}
                        </p>
                        {isPastDue && (
                          <p className="text-[10px] text-red-500 dark:text-red-400 leading-tight mt-0.5 font-sans">Overdue</p>
                        )}
                      </td>

                      {/* Payee */}
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap max-w-[110px] truncate">
                        {v.payee}
                      </td>

                      {/* Particulars — truncates */}
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                        {v.particulars}
                      </td>

                      {/* Area */}
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {AREA_LABELS[v.tradeArea] ?? v.tradeArea}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap tabular-nums">
                        {fmtAmt(v.amount)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <StatusChip status={v.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Totals footer */}
            {loaded && pageRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-[#0f172a]">
                  <td colSpan={7} className="px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                    {filtered.length !== pageRows.length && ` · page ${safePage} of ${totalPages}`}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                    {fmtAmt(filtered.reduce((s, v) => s + v.amount, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── Pagination footer ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#0f172a]">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums font-mono">
            {!loaded ? "Loading…"
              : filtered.length === 0 ? "No results"
              : `${(safePage - 1) * ROWS_PER_PAGE + 1}–${Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of ${filtered.length}`}
          </p>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1 || !loaded}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Ic.ChevL />
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono px-2 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages || !loaded}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Ic.ChevR />
            </button>
          </div>
        </div>
      </div>

      <DetailSheet voucher={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ── Reports shared ────────────────────────────────────────────────────────────
const LAST_SYNCED = fmtDate(REF_TODAY);

function exportCSV(rows: Voucher[], name: string) {
  const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const headers = ["DV #","DV Date","Due Date","Payee","Particulars","Trade Area","Amount","Status"];
  const body = rows.map(v =>
    [v.id, fmtDate(v.dvDate), fmtDate(v.due), v.payee, v.particulars,
      AREA_LABELS[v.tradeArea] ?? v.tradeArea, v.amount, v.status].map(esc).join(",")
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function exportPDF(rows: Voucher[], title: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rowsHtml = rows.map(v => `
    <tr><td>${v.id}</td><td>${fmtDateShort(v.dvDate)}</td><td>${fmtDateShort(v.due)}</td>
    <td>${v.payee}</td><td>${AREA_LABELS[v.tradeArea] ?? v.tradeArea}</td>
    <td style="text-align:right">${fmtAmt(v.amount)}</td><td>${v.status}</td></tr>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font:11px Inter,sans-serif;margin:24px;color:#111}
    h2{margin:0 0 2px;font-size:14px}p{color:#6b7280;font-size:10px;margin:0 0 16px}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 7px;border-bottom:1px solid #e5e7eb;font-size:10px}
    th{font-weight:600;background:#f9fafb}</style></head><body>
    <h2>TESDA · DV Monitor</h2><p>${title} · ${fmtDate(new Date())}</p>
    <table><thead><tr><th>DV #</th><th>DV Date</th><th>Due</th><th>Payee</th><th>Area</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table></body></html>`);
  win.document.close(); win.print();
}

function ExportDropdown({ rows, label }: { rows: Voucher[]; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className={btn.primary}>
        <Ic.Download />
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-white dark:bg-[#182338] border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_8px_24px_-4px_rgba(15,39,68,0.15)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] py-1 w-36">
            <button onClick={() => { exportCSV(rows, label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40">
              CSV file
            </button>
            <button onClick={() => { exportPDF(rows, label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40">
              PDF / print
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className={`${card} px-4 py-3.5`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold font-mono tabular-nums leading-tight ${accent ?? "text-slate-900 dark:text-slate-100"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ResultTable({ rows, onRowClick, sortKey, sortAsc, onSort }: {
  rows: Voucher[]; onRowClick: (v: Voucher) => void;
  sortKey: string; sortAsc: boolean; onSort: (k: string) => void;
}) {
  const cols = [
    { key: "dv",        label: "DV #",    right: false },
    { key: "dvDate",    label: "DV Date", right: false },
    { key: "due",       label: "Due",     right: false },
    { key: "payee",     label: "Payee",   right: false },
    { key: "tradeArea", label: "Area",    right: false },
    { key: "amount",    label: "Amount",  right: true  },
    { key: "status",    label: "Status",  right: false },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Ic.SheetIcon />}
        title="No vouchers match these filters"
        description="Try adjusting the date range, area, or status selectors above."
      />
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <th className="w-4 pl-4 py-2.5" />
          {cols.map(c => (
            <th key={c.key} onClick={() => onSort(c.key)}
              className={`py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${c.right ? "text-right" : "text-left"}`}>
              <span className="inline-flex items-center gap-1.5">
                {c.label}
                <Ic.Sort active={sortKey === c.key} asc={sortAsc} />
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map(v => {
          const isPastDue = v.status !== "PAID" && v.due < REF_TODAY;
          return (
            <tr key={v.id} onClick={() => onRowClick(v)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <td className="py-2.5 pl-4"><span className={`w-2 h-2 rounded-full block ${DOT_CLS[v.status]}`} /></td>
              <td className="py-2.5 pr-4 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{v.id}</td>
              <td className="py-2.5 pr-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{fmtDateShort(v.dvDate)}</td>
              <td className="py-2.5 pr-4">
                <p className={`text-xs tabular-nums whitespace-nowrap ${isPastDue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                  {fmtDateShort(v.due)}
                </p>
              </td>
              <td className="py-2.5 pr-4 text-xs text-slate-700 dark:text-slate-300 max-w-[80px] truncate">{v.payee}</td>
              <td className="py-2.5 pr-4 text-xs text-slate-500 dark:text-slate-400">{AREA_LABELS[v.tradeArea] ?? v.tradeArea}</td>
              <td className="py-2.5 pr-4 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 text-right tabular-nums whitespace-nowrap">{fmtAmt(v.amount)}</td>
              <td className="py-2.5 pr-4"><Badge status={v.status} /></td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <td colSpan={6} className="pl-8 py-2.5 text-xs text-slate-400 dark:text-slate-500">
            {rows.length} voucher{rows.length !== 1 ? "s" : ""}
          </td>
          <td className="py-2.5 pr-4 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 text-right tabular-nums">
            {fmtAmt(rows.reduce((s, v) => s + v.amount, 0))}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function useReportFilters(defaultStatus = "ALL") {
  const [dateRange, setDateRange] = useState("all");
  const [area,      setArea]      = useState("ALL");
  const [status,    setStatus]    = useState(defaultStatus);
  const [sortKey,   setSortKey]   = useState("due");
  const [sortAsc,   setSortAsc]   = useState(true);

  const dateCutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const c = new Date(REF_TODAY);
    if (dateRange === "7d")  c.setDate(REF_TODAY.getDate() - 7);
    if (dateRange === "30d") c.setDate(REF_TODAY.getDate() - 30);
    return c;
  }, [dateRange]);

  const base = useMemo(() =>
    RAW.filter(v => {
      if (dateCutoff && v.dvDate < dateCutoff) return false;
      if (area !== "ALL" && v.tradeArea !== area) return false;
      if (status !== "ALL" && v.status !== status) return false;
      return true;
    }),
    [dateCutoff, area, status]
  );

  const sortedRows = (rows: Voucher[]) =>
    [...rows].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "dvDate":    av = a.dvDate.getTime(); bv = b.dvDate.getTime(); break;
        case "due":       av = a.due.getTime();    bv = b.due.getTime();    break;
        case "payee":     av = a.payee;            bv = b.payee;            break;
        case "amount":    av = a.amount;           bv = b.amount;           break;
        case "status":    av = a.status;           bv = b.status;           break;
        case "tradeArea": av = a.tradeArea;        bv = b.tradeArea;        break;
        default:          av = a.id;               bv = b.id;
      }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortAsc ? 1 : -1);
    });

  const handleSort = (k: string) => {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(true); }
  };

  const reset    = () => { setDateRange("all"); setArea("ALL"); setStatus(defaultStatus); };
  const isDirty  = dateRange !== "all" || area !== "ALL" || status !== defaultStatus;
  const filterContext = [
    dateRange !== "all" ? (dateRange === "7d" ? "Last 7 days" : "Last 30 days") : null,
    area !== "ALL" ? (AREA_LABELS[area] ?? area) : null,
    status !== "ALL" && status !== defaultStatus ? status.charAt(0) + status.slice(1).toLowerCase() : null,
  ].filter(Boolean) as string[];

  return { dateRange, setDateRange, area, setArea, status, setStatus,
           sortKey, sortAsc, handleSort, base, sortedRows, reset, isDirty, filterContext };
}

function ReportToolbar({ title, subtitle, rows, reportLabel, dateRange, setDateRange,
  area, setArea, status, setStatus, showStatus = true, reset, isDirty }: {
  title: string; subtitle: string; rows: Voucher[]; reportLabel: string;
  dateRange: string; setDateRange: (v: string) => void;
  area: string; setArea: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  showStatus?: boolean; reset: () => void; isDirty: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 pt-1 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Synced {LAST_SYNCED}
        </div>
      </div>
      <div className={`${card} px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect value={dateRange} onChange={setDateRange} w="w-36" options={DATE_RANGE_OPTIONS} />
          <CustomSelect value={area} onChange={setArea} w="w-36" options={AREA_OPTIONS} />
          {showStatus && (
            <CustomSelect value={status} onChange={setStatus} w="w-36" options={REPORT_STATUS_OPTIONS} />
          )}
          {isDirty && (
            <button onClick={reset} className={btn.ghost}>
              <Ic.X />
              Reset
            </button>
          )}
          <div className="flex-1" />
          <a href="https://docs.google.com/spreadsheets" target="_blank" rel="noreferrer"
            className={btn.secondary}>
            <Ic.Link />
            Source sheet
          </a>
          <ExportDropdown rows={rows} label={reportLabel} />
        </div>
      </div>
    </div>
  );
}

// ── 1. Payment Exposure ───────────────────────────────────────────────────────
export function PaymentExposurePage() {
  const f = useReportFilters();
  const [detail, setDetail] = useState<Voucher | null>(null);

  const in7 = new Date(REF_TODAY);
  in7.setDate(REF_TODAY.getDate() + 7);

  const unpaid = useMemo(() => f.base.filter(v => v.status !== "PAID"), [f.base]);

  const buckets = useMemo(() => {
    const ov = unpaid.filter(v => v.status === "OVERDUE");
    const ds = unpaid.filter(v => v.status !== "OVERDUE" && v.due >= REF_TODAY && v.due <= in7);
    const dl = unpaid.filter(v => v.status !== "OVERDUE" && v.due > in7);
    const max = [ov, ds, dl].map(g => g.reduce((s,v) => s+v.amount, 0)).reduce((a,b)=>a+b, 0);
    const amt = (g: Voucher[]) => g.reduce((s, v) => s + v.amount, 0);
    return [
      { label: "Overdue",   rows: ov, amount: amt(ov), fill: "#ef4444", bg: "bg-red-500",   pct: max ? (amt(ov)/max)*100 : 0 },
      { label: "Due soon",  rows: ds, amount: amt(ds), fill: "#f59e0b", bg: "bg-amber-400", pct: max ? (amt(ds)/max)*100 : 0 },
      { label: "Due later", rows: dl, amount: amt(dl), fill: "#93c5fd", bg: "bg-[#93c5fd]", pct: max ? (amt(dl)/max)*100 : 0 },
    ];
  }, [unpaid]);

  const tableRows = useMemo(() => f.sortedRows(unpaid), [unpaid, f.sortedRows]);
  const subtitle  = f.filterContext.length > 0 ? `Filtered: ${f.filterContext.join(" · ")}` : "Unpaid vouchers by urgency";

  return (
    <div className="space-y-5">
      <ReportToolbar title="Payment Exposure" subtitle={subtitle} rows={tableRows} reportLabel="Payment Exposure"
        dateRange={f.dateRange} setDateRange={f.setDateRange} area={f.area} setArea={f.setArea}
        status={f.status} setStatus={f.setStatus} showStatus={false} reset={f.reset} isDirty={f.isDirty} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total unpaid" value={fmtAmt(buckets.reduce((s,b)=>s+b.amount,0))} sub={`${unpaid.length} vouchers`} />
        <StatTile label="Overdue"
          value={fmtAmt(buckets[0].amount)}
          sub={`${buckets[0].rows.length} voucher${buckets[0].rows.length!==1?"s":""}`}
          accent="text-red-600 dark:text-red-400" />
        <StatTile label="Due within 7 days"
          value={fmtAmt(buckets[1].amount)}
          sub={`${buckets[1].rows.length} voucher${buckets[1].rows.length!==1?"s":""}`}
          accent="text-amber-600 dark:text-amber-400" />
      </div>

      <div className={`${card} p-5`}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Urgency breakdown</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">{fmtDateShort(REF_TODAY)} – {fmtDateShort(in7)} = due soon</span>
        </div>
        <div className="space-y-4">
          {buckets.map(b => (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`w-2 h-2 rounded-sm ${b.bg}`} />
                  {b.label}
                  <span className="text-xs text-slate-400 dark:text-slate-500">{b.rows.length} voucher{b.rows.length!==1?"s":""}</span>
                </span>
                <span className="text-sm font-medium font-mono text-slate-900 dark:text-slate-100 tabular-nums">{fmtAmt(b.amount)}</span>
              </div>
              <div className="h-5 rounded bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                <div className="h-full rounded transition-[width] duration-600"
                  style={{ width: `${Math.max(b.pct, b.amount > 0 ? 1.5 : 0)}%`, background: b.fill }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Unpaid vouchers</h3>
        </div>
        <div className="overflow-x-auto">
          <ResultTable rows={tableRows} onRowClick={setDetail} sortKey={f.sortKey} sortAsc={f.sortAsc} onSort={f.handleSort} />
        </div>
      </div>

      <DetailSheet voucher={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ── 2. Overdue Vouchers ───────────────────────────────────────────────────────
export function OverdueVouchersPage() {
  const f = useReportFilters("OVERDUE");
  const [detail, setDetail] = useState<Voucher | null>(null);

  const tableRows = useMemo(() =>
    f.sortedRows(f.base.filter(v => v.status === "OVERDUE")),
    [f.base, f.sortedRows]
  );

  const totalAmt    = tableRows.reduce((s, v) => s + v.amount, 0);
  const oldestDue   = tableRows.length ? new Date(Math.min(...tableRows.map(v => v.due.getTime()))) : null;
  const daysOverdue = oldestDue ? Math.floor((REF_TODAY.getTime() - oldestDue.getTime()) / 86400000) : 0;
  const subtitle    = f.filterContext.filter(c => c !== "Overdue").join(" · ") || "Overdue items, oldest first";

  return (
    <div className="space-y-5">
      <ReportToolbar title="Overdue Vouchers" subtitle={subtitle} rows={tableRows} reportLabel="Overdue Vouchers"
        dateRange={f.dateRange} setDateRange={f.setDateRange} area={f.area} setArea={f.setArea}
        status={f.status} setStatus={f.setStatus} showStatus={false} reset={f.reset} isDirty={f.isDirty} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total overdue" value={fmtAmt(totalAmt)}
          sub={`${tableRows.length} voucher${tableRows.length!==1?"s":""}`} accent="text-red-600 dark:text-red-400" />
        <StatTile label="Count" value={tableRows.length} sub="Requiring action" />
        <StatTile label="Oldest due"
          value={oldestDue ? fmtDateShort(oldestDue) : "—"}
          sub={oldestDue ? `${daysOverdue} day${daysOverdue!==1?"s":""} ago` : "No overdue"} />
      </div>

      <div className={card}>
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Overdue vouchers</h3>
          {tableRows.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
              {tableRows.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <ResultTable rows={tableRows} onRowClick={setDetail} sortKey={f.sortKey} sortAsc={f.sortAsc} onSort={f.handleSort} />
        </div>
      </div>

      <DetailSheet voucher={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ── 3. Unpaid by Trade Area ───────────────────────────────────────────────────
export function UnpaidByAreaPage() {
  const f = useReportFilters();
  const [detail, setDetail] = useState<Voucher | null>(null);

  const unpaid     = useMemo(() => f.base.filter(v => v.status !== "PAID"), [f.base]);
  const tableRows  = useMemo(() => f.sortedRows(unpaid), [unpaid, f.sortedRows]);

  const areaBarData = useMemo(() => {
    return ["ADMIN","CANTEEN","DHT","ST","DTEST","TEST2"].map(a => ({
      name: AREA_LABELS[a] ?? a,
      amount: unpaid.filter(v => v.tradeArea === a).reduce((s,v)=>s+v.amount, 0),
    })).filter(r => r.amount > 0);
  }, [unpaid]);

  const totalAmt = unpaid.reduce((s,v)=>s+v.amount, 0);
  const topArea  = areaBarData.length ? areaBarData.reduce((a,b) => a.amount>b.amount?a:b) : null;
  const subtitle  = f.filterContext.length > 0 ? `Filtered: ${f.filterContext.join(" · ")}` : "Unpaid totals by area";

  return (
    <div className="space-y-5">
      <ReportToolbar title="Unpaid by Trade Area" subtitle={subtitle} rows={tableRows} reportLabel="Unpaid by Trade Area"
        dateRange={f.dateRange} setDateRange={f.setDateRange} area={f.area} setArea={f.setArea}
        status={f.status} setStatus={f.setStatus} showStatus={false} reset={f.reset} isDirty={f.isDirty} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total unpaid" value={fmtAmt(totalAmt)} sub={`${unpaid.length} vouchers`} />
        <StatTile label="Areas with unpaid" value={areaBarData.length} sub="of 6 areas" />
        <StatTile label="Largest exposure"
          value={topArea ? topArea.name : "—"}
          sub={topArea ? fmtAmt(topArea.amount) : "No unpaid"} />
      </div>

      <div className={`${card} p-5`}>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight mb-4">Unpaid by trade area</h2>
        {areaBarData.length === 0 ? (
          <EmptyState icon={<Ic.BarIcon />} title="No unpaid vouchers" description="No unpaid vouchers match these filters." />
        ) : (
          <ResponsiveContainer width="100%" height={areaBarData.length * 40 + 20}>
            <BarChart data={areaBarData} layout="vertical" barCategoryGap="30%"
              margin={{ top: 0, right: 80, left: 4, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `₱${Math.round(v/1000)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Bar dataKey="amount" fill="#1e3a5f" radius={[0,3,3,0]}
                label={{ position: "right", formatter: (v: unknown) => `₱${Math.round((v as number)/1000)}k`, fontSize: 11, fill: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={card}>
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Unpaid vouchers by area</h3>
        </div>
        <div className="overflow-x-auto">
          <ResultTable rows={tableRows} onRowClick={setDetail} sortKey={f.sortKey} sortAsc={f.sortAsc} onSort={f.handleSort} />
        </div>
      </div>

      <DetailSheet voucher={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ── 4. Payment Register ───────────────────────────────────────────────────────
export function PaymentRegisterPage() {
  const f = useReportFilters();
  const [detail, setDetail] = useState<Voucher | null>(null);
  const tableRows = useMemo(() => f.sortedRows(f.base), [f.base, f.sortedRows]);

  const paidAmt    = f.base.filter(v=>v.status==="PAID").reduce((s,v)=>s+v.amount, 0);
  const unpaidAmt  = f.base.filter(v=>v.status!=="PAID").reduce((s,v)=>s+v.amount, 0);
  const totalAmt   = f.base.reduce((s,v)=>s+v.amount, 0);
  const subtitle   = f.filterContext.length > 0 ? `Filtered: ${f.filterContext.join(" · ")}` : "Sortable, filterable full register";

  return (
    <div className="space-y-5">
      <ReportToolbar title="Payment Register" subtitle={subtitle} rows={tableRows} reportLabel="Payment Register"
        dateRange={f.dateRange} setDateRange={f.setDateRange} area={f.area} setArea={f.setArea}
        status={f.status} setStatus={f.setStatus} showStatus reset={f.reset} isDirty={f.isDirty} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total registered" value={fmtAmt(totalAmt)} sub={`${f.base.length} vouchers`} />
        <StatTile label="Paid" value={fmtAmt(paidAmt)}
          sub={`${f.base.filter(v=>v.status==="PAID").length} vouchers`} accent="text-emerald-700 dark:text-emerald-400" />
        <StatTile label="Outstanding" value={fmtAmt(unpaidAmt)}
          sub={`${f.base.filter(v=>v.status!=="PAID").length} vouchers`} accent="text-[#1e3a5f] dark:text-blue-300" />
      </div>

      <div className={card}>
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Full payment register</h3>
        </div>
        <div className="overflow-x-auto">
          <ResultTable rows={tableRows} onRowClick={setDetail} sortKey={f.sortKey} sortAsc={f.sortAsc} onSort={f.handleSort} />
        </div>
      </div>

      <DetailSheet voucher={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ── Trade Areas ───────────────────────────────────────────────────────────────
export function TradeAreasPage() {
  const [sortKey, setSortKey] = useState<"tradeArea" | "payee" | "category" | "amount">("tradeArea");
  const [sortAsc, setSortAsc] = useState(true);
  const [search,  setSearch]  = useState("");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const handleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(true); }
  };

  // Per-area aggregates for the summary cards
  const areaStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; payees: Set<string> }>();
    RAW.forEach(v => {
      const label = AREA_LABELS[v.tradeArea] ?? v.tradeArea;
      const e = map.get(label) ?? { count: 0, total: 0, payees: new Set<string>() };
      e.count++; e.total += v.amount; e.payees.add(v.payee);
      map.set(label, e);
    });
    return [...map.entries()]
      .map(([label, s]) => ({ label, count: s.count, total: s.total, payeeCount: s.payees.size }))
      .sort((a, b) => b.total - a.total);
  }, []);
  const maxAreaTotal = areaStats.length ? areaStats[0].total : 1;
  const totalAmount  = RAW.reduce((s, v) => s + v.amount, 0);
  const totalPayees  = new Set(RAW.map(v => v.payee)).size;

  const rows = useMemo(() => {
    let data = RAW.map(v => ({
      id: v.id,
      tradeArea: AREA_LABELS[v.tradeArea] ?? v.tradeArea,
      payee: v.payee,
      category: v.particulars,
      amount: v.amount,
    }));
    if (areaFilter) data = data.filter(r => r.tradeArea === areaFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.tradeArea.toLowerCase().includes(q) ||
        r.payee.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * (sortAsc ? 1 : -1);
      return (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) * (sortAsc ? 1 : -1);
    });
  }, [sortKey, sortAsc, search, areaFilter]);

  const reset = () => { setSearch(""); setAreaFilter(null); };
  const filteredTotal = rows.reduce((s, r) => s + r.amount, 0);

  const ColH = ({ label, k, right }: { label: string; k: typeof sortKey; right?: boolean }) => (
    <th onClick={() => handleSort(k)}
      className={`py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-100 transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1.5 ${right ? "flex-row-reverse" : ""}`}>
        {label}
        <Ic.Sort active={sortKey === k} asc={sortAsc} />
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Trade Areas</h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 mt-0.5">
            Voucher concentration by trade area, payee, and category
          </p>
        </div>
        {(areaFilter || search.trim()) && (
          <button onClick={reset} className={btn.ghost}>
            <Ic.X /> Clear filters
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Trade areas" value={areaStats.length} sub="Grouped below" />
        <StatTile label="Vouchers"     value={RAW.length}      sub="In the register" />
        <StatTile label="Total registered" value={fmtAmt(totalAmount)} sub="Across all areas" accent="text-[#1e3a5f] dark:text-blue-300" />
        <StatTile label="Payees"       value={totalPayees}     sub="Distinct vendors" />
      </div>

      {/* Area summary cards */}
      <div className={card}>
        <div className="flex items-baseline justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Distribution by trade area
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Click a card to filter the detail table
          </span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {areaStats.map(a => {
            const active = areaFilter === a.label;
            const dot = AREA_OPTIONS.find(o => o.label === a.label)?.dot ?? "bg-slate-400";
            return (
              <button
                key={a.label}
                onClick={() => setAreaFilter(active ? null : a.label)}
                className={`${card} p-4 text-left transition-all duration-150 ${
                  active ? "ring-2 ring-[#2563eb] dark:ring-blue-500" : "hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{a.label}</span>
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
                    {a.count} vch
                  </span>
                </div>
                <p className="mt-1.5 text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 leading-tight">
                  {fmtAmt(a.total)}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max((a.total / maxAreaTotal) * 100, a.total > 0 ? 3 : 0)}%`, background: "#2563eb" }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">{a.payeeCount} payees</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    {totalAmount ? Math.round((a.total / totalAmount) * 100) : 0}% of total
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      <div className={card}>
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Ic.Search />
            </span>
            <input
              type="text"
              placeholder="Search area, payee, category, or DV #"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>
          {areaFilter && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[#bfdbfe] dark:border-blue-900 bg-[#eff6ff] dark:bg-blue-500/15 text-[#1d4ed8] dark:text-blue-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
              {areaFilter}
              <button onClick={() => setAreaFilter(null)} className="hover:text-[#1e3a5f]">
                <Ic.X />
              </button>
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono ml-auto">
            {rows.length} of {RAW.length} records
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <th className="w-4 pl-4 py-2.5" />
              <ColH label="Trade Area" k="tradeArea" />
              <ColH label="Payee"      k="payee" />
              <ColH label="Category"   k="category" />
              <ColH label="Amount"     k="amount" right />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState icon={<Ic.SheetIcon />} title="No records match" description="Try a different search term or clear the filters." />
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="py-3 pl-4"><span className="w-2 h-2 rounded-full block bg-[#1e3a5f]/30 dark:bg-blue-400/40" /></td>
                <td className="py-3 pr-4 text-sm font-medium text-slate-900 dark:text-slate-100">{r.tradeArea}</td>
                <td className="py-3 pr-4 text-sm text-slate-700 dark:text-slate-300">{r.payee}</td>
                <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{r.category}</td>
                <td className="py-3 pr-4 text-sm font-mono font-medium text-slate-900 dark:text-slate-100 text-right tabular-nums whitespace-nowrap">
                  {fmtAmt(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30">
                <td colSpan={4} className="pl-4 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                  {rows.length} record{rows.length !== 1 ? "s" : ""}
                </td>
                <td className="py-2.5 pr-4 text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 text-right tabular-nums">
                  {fmtAmt(filteredTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
export function SettingsPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Application configuration and information</p>
      </div>

      {/* Organization */}
      <section className={card}>
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Organization</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { label: "Organization",  value: "Technical Education and Skills Development Authority (TESDA)" },
            { label: "System",        value: "Disbursement Voucher Monitor" },
            { label: "Reference date",value: fmtDate(REF_TODAY) },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex items-start justify-between gap-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0 w-36">{label}</p>
              <p className="text-sm text-slate-900 dark:text-slate-100 text-right">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dataset */}
      <section className={card}>
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dataset</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { label: "Source",        value: "Google Sheets (sample)" },
            { label: "Vouchers",      value: `${RAW.length} records` },
            { label: "Trade areas",   value: Object.keys(AREA_LABELS).filter(k=>k!=="ALL").length + " areas" },
            { label: "Total amount",  value: fmtAmtFull(RAW.reduce((s,v)=>s+v.amount, 0)) },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className={card}>
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">About</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { label: "Version",  value: "1.0.0" },
            { label: "Built with", value: "React 19 · Vite 8 · Tailwind v4" },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function Root() {
  return (
    <div className="bg-[#f4f6fb] dark:bg-[#0b1220] dark:text-slate-200 min-h-screen transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <main className="min-h-screen px-8 py-8 pl-[100px]">
        <Outlet />
      </main>
    </div>
  );
}
