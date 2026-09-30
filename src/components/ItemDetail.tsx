import { useEffect, useState } from "react";
import {
  supabase, type Item, type Match,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import ItemCard from "@/components/ItemCard";
import {
  ArrowLeft, MapPin, Calendar, Tag, Palette, Building2, Mail, Phone,
  Sparkles, Loader2, Brain, Check, X, AlertCircle, User as UserIcon,
} from "lucide-react";

interface Props {
  item: Item;
  onBack: () => void;
  onItemClick: (item: Item) => void;
}

interface MatchWithItem extends Match {
  matched_item?: Item;
}

export default function ItemDetail({ item, onBack, onItemClick }: Props) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchWithItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerPhone, setOwnerPhone] = useState<string>("");
  const [showContact, setShowContact] = useState(false);

  const isOwner = user?.id === item.user_id;
  const oppositeType = item.type === "lost" ? "found" : "lost";

  useEffect(() => {
    loadMatches();
    loadOwner();
  }, [item.id]);

  const loadOwner = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", item.user_id)
      .maybeSingle();
    if (data) {
      setOwnerName(data.full_name || "Unknown");
      setOwnerPhone(data.phone || "");
    }
  };

  const loadMatches = async () => {
    setLoadingMatches(true);
    const matchField = item.type === "lost" ? "lost_item_id" : "found_item_id";
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq(matchField, item.id)
      .order("score", { ascending: false });

    if (data && data.length > 0) {
      // Fetch the matched items
      const itemField = item.type === "lost" ? "found_item_id" : "lost_item_id";
      const itemIds = data.map((m) => (m as Record<string, string>)[itemField]);
      const { data: matchedItems } = await supabase
        .from("items")
        .select("*")
        .in("id", itemIds);

      const enriched: MatchWithItem[] = (data as Match[]).map((m) => {
        const mid = (m as unknown as Record<string, string>)[itemField];
        return {
          ...m,
          matched_item: (matchedItems as Item[])?.find((i) => i.id === mid),
        };
      });
      setMatches(enriched);
    } else {
      setMatches([]);
    }
    setLoadingMatches(false);
  };

  const runAIMatch = async () => {
    setAiRunning(true);
    setAiError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ item_id: item.id }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      await loadMatches();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI matching failed");
    }
    setAiRunning(false);
  };

  const updateMatchStatus = async (matchId: string, status: "confirmed" | "dismissed") => {
    const { error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", matchId);
    if (!error) {
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status } : m))
      );
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.5) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Image + Details */}
        <div className="space-y-4">
          {item.image_url ? (
            <div className="rounded-2xl overflow-hidden bg-slate-100">
              <img src={item.image_url} alt={item.title} className="w-full h-64 object-cover" />
            </div>
          ) : (
            <div className="h-64 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Tag className="w-12 h-12 text-slate-300" />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${item.type === "lost" ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
                {item.type}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                item.status === "active" ? "bg-green-50 text-green-600 border-green-200" :
                item.status === "matched" ? "bg-amber-50 text-amber-600 border-amber-200" :
                "bg-blue-50 text-blue-600 border-blue-200"
              }`}>
                {item.status}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-800">{item.title}</h2>

            {item.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              {item.category && <DetailRow icon={Tag} label="Category" value={item.category} />}
              {item.color && <DetailRow icon={Palette} label="Color" value={item.color} />}
              {item.brand && <DetailRow icon={Building2} label="Brand" value={item.brand} />}
              {item.location && <DetailRow icon={MapPin} label="Location" value={item.location} />}
              {item.date && <DetailRow icon={Calendar} label={item.type === "lost" ? "Date Lost" : "Date Found"} value={new Date(item.date).toLocaleDateString("en-US", { dateStyle: "medium" })} />}
            </div>
          </div>

          {/* Contact card */}
          {!isOwner && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Reported by {ownerName}</span>
              </div>
              {showContact ? (
                <div className="space-y-2">
                  {item.contact_preference === "email" && (
                    <a href={`mailto:${user?.email}`} className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
                      <Mail className="w-4 h-4" /> Contact via email
                    </a>
                  )}
                  {item.contact_preference === "phone" && ownerPhone && (
                    <a href={`tel:${ownerPhone}`} className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
                      <Phone className="w-4 h-4" /> {ownerPhone}
                    </a>
                  )}
                  {item.contact_preference === "phone" && !ownerPhone && (
                    <p className="text-sm text-slate-400">Phone not provided. Try email.</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowContact(true)}
                  className="w-full py-2.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-medium hover:bg-teal-100 transition-all"
                >
                  Show Contact Info
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: AI Matching */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl border border-teal-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-slate-800">AI Match Finder</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Our AI compares this {item.type} item against all {oppositeType} items using
              keyword analysis, category, color, brand, location, and date proximity.
            </p>
            <button
              onClick={runAIMatch}
              disabled={aiRunning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {aiRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> {matches.length > 0 ? "Re-run AI Match" : "Find AI Matches"}
                </>
              )}
            </button>
            {aiError && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{aiError}</p>
              </div>
            )}
          </div>

          {/* Match Results */}
          {loadingMatches ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
            </div>
          ) : matches.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                {matches.length} Potential {matches.length === 1 ? "Match" : "Matches"}
              </h3>
              {matches.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  {m.matched_item && (
                    <div className="p-3">
                      <ItemCard item={m.matched_item} onClick={() => onItemClick(m.matched_item!)} />
                    </div>
                  )}
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${scoreColor(m.score)}`}>
                        {Math.round(m.score * 100)}% match
                      </span>
                      {m.status === "confirmed" && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
                          Confirmed
                        </span>
                      )}
                      {m.status === "dismissed" && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200">
                          Dismissed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{m.explanation}</p>
                    {isOwner && m.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => updateMatchStatus(m.id, "confirmed")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-all"
                        >
                          <Check className="w-3 h-3" /> Confirm Match
                        </button>
                        <button
                          onClick={() => updateMatchStatus(m.id, "dismissed")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium hover:bg-slate-100 transition-all"
                        >
                          <X className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !loadingMatches && !aiRunning ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No matches yet</p>
              <p className="text-xs text-slate-400 mt-1">Run the AI Match Finder to discover potential matches</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span className="text-slate-400">{label}:</span>
      <span className="text-slate-600 font-medium">{value}</span>
    </div>
  );
}
