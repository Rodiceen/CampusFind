import { useState, type FormEvent } from "react";
import { supabase, CATEGORIES, COMMON_COLORS, CAMPUS_LOCATIONS, type ItemType } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  Upload, X, Sparkles, Check, AlertCircle, Image as ImageIcon,
  Tag, Palette, MapPin, Building2, FileText, Calendar,
} from "lucide-react";

interface Props {
  onDone: () => void;
  defaultType?: ItemType;
}

export default function ReportForm({ onDone, defaultType = "lost" }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<ItemType>(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [contactPreference, setContactPreference] = useState<"email" | "phone">("email");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImage = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const smartFill = (field: string, value: string) => {
    switch (field) {
      case "title": setTitle(value); break;
      case "category": setCategory(value); break;
      case "color": setColor(value); break;
      case "location": setLocation(value); break;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    let imageUrl = "";

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const fileName = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("item-photos")
        .upload(fileName, imageFile);
      if (upErr) {
        setError("Failed to upload image. Please try again.");
        setBusy(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("item-photos")
        .getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const { error: insErr } = await supabase.from("items").insert({
      type,
      title: title.trim(),
      description: description.trim(),
      category: category || "Other",
      color: color.trim(),
      brand: brand.trim(),
      location: location.trim(),
      date,
      image_url: imageUrl,
      contact_preference: contactPreference,
      status: "active",
    });

    setBusy(false);

    if (insErr) {
      setError(insErr.message || "Failed to report item");
      return;
    }

    setSuccess(true);
    setTimeout(() => onDone(), 1500);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-green-500" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Item Reported!</h2>
        <p className="text-sm text-slate-500 mt-1">Your {type} item has been logged successfully.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Report an Item</h2>
        <p className="text-sm text-slate-500 mt-1">Log a lost or found item so the community can help.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">I'm reporting a...</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("lost")}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                type === "lost"
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              Lost Item
            </button>
            <button
              type="button"
              onClick={() => setType("found")}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                type === "found"
                  ? "border-teal-300 bg-teal-50 text-teal-600"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              Found Item
            </button>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Photo (optional)</label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden h-48 bg-slate-100">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(""); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer transition-all">
              <Upload className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-sm text-slate-500">Click to upload a photo</span>
              <span className="text-xs text-slate-400 mt-0.5">PNG, JPG up to 5MB</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Item Name *</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Black leather wallet, Blue backpack, iPhone 14"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add distinguishing features, contents, condition, etc."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm resize-none"
          />
        </div>

        {/* Smart Quick-Fill Section */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-4 border border-teal-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-semibold text-teal-700">Quick Details</span>
            <span className="text-xs text-teal-500">— tap to fill faster</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => smartFill("category", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_COLORS.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => smartFill("color", c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      color === c
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Other"
                  className="flex-1 min-w-[80px] px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <select
                value={location}
                onChange={(e) => smartFill("location", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              >
                <option value="">Select location</option>
                {CAMPUS_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {type === "lost" ? "Date Lost" : "Date Found"}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>

            {/* Brand */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Brand / Make (optional)
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Apple, Nike, Jansport"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Contact Preference */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Contact Method</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContactPreference("email")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                contactPreference === "email"
                  ? "border-teal-300 bg-teal-50 text-teal-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setContactPreference("phone")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                contactPreference === "phone"
                  ? "border-teal-300 bg-teal-50 text-teal-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              Phone
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onDone}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/30 transition-all disabled:opacity-60"
          >
            {busy ? "Reporting..." : `Report ${type === "lost" ? "Lost" : "Found"} Item`}
          </button>
        </div>
      </form>
    </div>
  );
}
