import { useEffect, useState, useCallback } from "react";
import { supabase, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import ItemCard from "@/components/ItemCard";
import { Package, Trash2, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onItemClick: (item: Item) => void;
  onReport: () => void;
}

export default function MyItems({ onItemClick, onReport }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(id);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeleting(null);
  };

  const lostItems = items.filter((i) => i.type === "lost");
  const foundItems = items.filter((i) => i.type === "found");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Items</h2>
          <p className="text-sm text-slate-500 mt-1">Items you've reported</p>
        </div>
        <button
          onClick={onReport}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all"
        >
          Report New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 font-medium">You haven't reported any items yet</p>
          <button
            onClick={onReport}
            className="text-sm text-teal-600 hover:underline mt-2"
          >
            Report your first item
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {lostItems.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">
                Lost Items ({lostItems.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lostItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <ItemCard item={item} onClick={() => onItemClick(item)} showStatus />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      disabled={deleting === item.id}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-white/90 text-red-400 hover:text-red-600 hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {foundItems.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">
                Found Items ({foundItems.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {foundItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <ItemCard item={item} onClick={() => onItemClick(item)} showStatus />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      disabled={deleting === item.id}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-white/90 text-red-400 hover:text-red-600 hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
