import { type Item } from "@/lib/supabase";
import { MapPin, Calendar, Tag, Palette } from "lucide-react";

interface Props {
  item: Item;
  onClick?: () => void;
  showStatus?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-600 border-green-200",
  matched: "bg-amber-50 text-amber-600 border-amber-200",
  returned: "bg-blue-50 text-blue-600 border-blue-200",
};

const TYPE_STYLES: Record<string, string> = {
  lost: "bg-red-50 text-red-600",
  found: "bg-teal-50 text-teal-600",
};

export default function ItemCard({ item, onClick, showStatus }: Props) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Image or placeholder */}
      <div className="h-40 bg-slate-100 relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Tag className="w-10 h-10 text-slate-300" />
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${TYPE_STYLES[item.type]}`}>
            {item.type}
          </span>
        </div>
        {showStatus && (
          <div className="absolute top-3 right-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[item.status]}`}>
              {item.status}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-800 truncate group-hover:text-teal-600 transition-colors">
          {item.title}
        </h3>

        {item.description && (
          <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {item.category && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
              <Tag className="w-3 h-3" /> {item.category}
            </span>
          )}
          {item.color && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
              <Palette className="w-3 h-3" /> {item.color}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.location}
            </span>
          )}
          {item.date && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
