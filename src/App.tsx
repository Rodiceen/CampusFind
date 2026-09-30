import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { type Item, type ItemType } from "@/lib/supabase";
import AuthPage from "@/components/AuthPage";
import Layout, { type View } from "@/components/Layout";
import BrowseView from "@/components/BrowseView";
import SearchView from "@/components/SearchView";
import ReportForm from "@/components/ReportForm";
import ItemDetail from "@/components/ItemDetail";
import MyItems from "@/components/MyItems";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("browse");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportType, setReportType] = useState<ItemType>("lost");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Item detail view takes priority
  if (selectedItem) {
    return (
      <Layout currentView={view} onNavigate={setView}>
        <ItemDetail
          item={selectedItem}
          onBack={() => setSelectedItem(null)}
          onItemClick={(item) => setSelectedItem(item)}
        />
      </Layout>
    );
  }

  const handleNavigate = (v: View) => {
    if (v === "report") {
      setReportType("lost");
    }
    setView(v);
  };

  return (
    <Layout currentView={view} onNavigate={handleNavigate}>
      {view === "browse" && (
        <BrowseView onItemClick={setSelectedItem} />
      )}
      {view === "search" && (
        <SearchView onItemClick={setSelectedItem} />
      )}
      {view === "report" && (
        <ReportForm
          defaultType={reportType}
          onDone={() => setView("browse")}
        />
      )}
      {view === "my-items" && (
        <MyItems
          onItemClick={setSelectedItem}
          onReport={() => { setReportType("lost"); setView("report"); }}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
