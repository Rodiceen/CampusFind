import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type ItemType = "lost" | "found";
export type ItemStatus = "active" | "matched" | "returned";
export type ContactPreference = "email" | "phone";

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: string;
  color: string;
  brand: string;
  location: string;
  date: string;
  image_url: string;
  status: ItemStatus;
  contact_preference: ContactPreference;
  user_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  score: number;
  explanation: string;
  status: "pending" | "confirmed" | "dismissed";
  created_at: string;
  lost_item?: Item;
  found_item?: Item;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

export const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Books",
  "Accessories",
  "Keys",
  "Wallets",
  "IDs & Cards",
  "Bags",
  "Jewelry",
  "Sports Equipment",
  "Musical Instruments",
  "Other",
];

export const COMMON_COLORS = [
  "Black", "White", "Gray", "Red", "Blue", "Green", "Yellow",
  "Orange", "Purple", "Pink", "Brown", "Silver", "Gold", "Beige",
  "Navy", "Teal", "Maroon",
];

export const CAMPUS_LOCATIONS = [
  "Library",
  "Student Center",
  "Cafeteria / Dining Hall",
  "Gymnasium",
  "Science Building",
  "Engineering Building",
  "Humanities Building",
  "Business Building",
  "Arts Building",
  "Dormitory",
  "Parking Lot",
  "Bus Stop",
  "Auditorium",
  "Computer Lab",
  "Courtyard",
  "Café",
  "Lecture Hall",
  "Athletic Field",
  "Other",
];
