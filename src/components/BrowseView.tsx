import { useEffect, useState, useCallback } from "react";
import { supabase, type Item, type ItemType } from "@/lib/supabase";
import ItemCard from "@/components/ItemCard";
import { LayoutGrid, PackageSearch } from "lucide-react";

interface Props {
  onItemClick: (item: Item) => void;
  highlightType?: ItemType | "all";
}

export default function BrowseView({ onItemClick, highlightType = "all" }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ItemType | "all">(highlightType);

  useEffect(() => {
    setFilter(highlightType);
  }, [highlightType]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Load error:", error);
    }
    setItems((data as Item[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const lostCount = items.filter((i) => i.type === "lost").length;
  const foundCount = items.filter((i) => i.type === "found").length;

  return (
    <div className="space-y-6">
      {/* Stats Banner */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Lost Items</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{lostCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <PackageSearch className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-5 border border-teal-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-600 font-medium">Found Items</p>
              <p className="text-3xl font-bold text-teal-700 mt-1">{foundCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(["all", "lost", "found"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f === "all" ? "All Items" : `${f.charAt(0).toUpperCase() + f.slice(1)} Items`}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-slate-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <PackageSearch className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 font-medium">No items reported yet</p>
          <p className="text-sm text-slate-400 mt-1">Be the first to report a lost or found item</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
