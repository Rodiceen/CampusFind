import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Compass, LogOut, Search, Plus, LayoutGrid, User as UserIcon } from "lucide-react";

type View = "browse" | "report" | "my-items" | "search";

interface LayoutProps {
  children: ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
}

export default function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const navItems: { key: View; label: string; icon: typeof Search }[] = [
    { key: "browse", label: "Browse", icon: LayoutGrid },
    { key: "search", label: "AI Search", icon: Search },
    { key: "report", label: "Report Item", icon: Plus },
    { key: "my-items", label: "My Items", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate("browse")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-800 hidden sm:block">CampusFind</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === key
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">
              {profile?.full_name || "User"}
            </span>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 flex items-center justify-around z-40">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
              currentView === key ? "text-teal-600" : "text-slate-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export type { View };
