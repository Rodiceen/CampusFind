import { useEffect, useState, useCallback } from "react";
import { supabase, type Item, CATEGORIES, CAMPUS_LOCATIONS } from "@/lib/supabase";
import ItemCard from "@/components/ItemCard";
import { Search, Filter, X, Sparkles, Loader2 } from "lucide-react";

interface Props {
  onItemClick: (item: Item) => void;
}

export default function SearchView({ onItemClick }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let result = items;

    if (typeFilter !== "all") {
      result = result.filter((i) => i.type === typeFilter);
    }
    if (categoryFilter) {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (locationFilter) {
      result = result.filter((i) => i.location === locationFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.color.toLowerCase().includes(q) ||
          i.brand.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [items, query, typeFilter, categoryFilter, locationFilter]);

  const hasActiveFilters = typeFilter !== "all" || categoryFilter || locationFilter || query.trim();

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setCategoryFilter("");
    setLocationFilter("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Search Items</h2>
        <p className="text-sm text-slate-500 mt-1">Find lost or found items across campus</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, description, color, brand..."
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm shadow-sm"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
            showFilters || hasActiveFilters
              ? "bg-teal-50 text-teal-600"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 animate-[fadeIn_0.2s_ease]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Filters</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Type</label>
            <div className="flex gap-2">
              {(["all", "lost", "found"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    typeFilter === t
                      ? "bg-teal-50 text-teal-600 border border-teal-200"
                      : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-teal-500 outline-none"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-teal-500 outline-none"
              >
                <option value="">All locations</option>
                {CAMPUS_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2">
          {typeFilter !== "all" && (
            <Chip label={`Type: ${typeFilter}`} onClear={() => setTypeFilter("all")} />
          )}
          {categoryFilter && (
            <Chip label={`Category: ${categoryFilter}`} onClear={() => setCategoryFilter("")} />
          )}
          {locationFilter && (
            <Chip label={`Location: ${locationFilter}`} onClear={() => setLocationFilter("")} />
          )}
          {query.trim() && (
            <Chip label={`"${query}"`} onClear={() => setQuery("")} />
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-400 font-medium">No items match your search</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-teal-600 hover:underline mt-2"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => onItemClick(item)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium">
      {label}
      <button onClick={onClear} className="hover:text-teal-800">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
