/*
# Campus Lost & Found Schema

## Overview
Creates the full database schema for a campus lost-and-found web app where users can
log lost items and found items, and an AI system matches lost items to found items
(and vice versa). Users must sign in to report and manage items.

## New Tables

### 1. `profiles`
- `id` (uuid, PK, references auth.users) — the user's account
- `full_name` (text) — display name
- `phone` (text) — optional contact phone
- `created_at` (timestamptz)

### 2. `items`
- `id` (uuid, PK)
- `type` (text) — 'lost' or 'found'
- `title` (text) — short item name
- `description` (text) — detailed description
- `category` (text) — e.g. Electronics, Clothing, Books, Accessories, Keys, Wallets, IDs, Other
- `color` (text) — primary color
- `brand` (text) — optional brand/make
- `location` (text) — where lost/found on campus
- `date` (date) — date lost or found
- `image_url` (text) — optional storage URL for photo
- `status` (text) — 'active', 'matched', 'returned' (default 'active')
- `contact_preference` (text) — 'email' or 'phone'
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users)
- `created_at` (timestamptz)

### 3. `matches`
- `id` (uuid, PK)
- `lost_item_id` (uuid, references items)
- `found_item_id` (uuid, references items)
- `score` (numeric) — AI match confidence 0–1
- `explanation` (text) — AI reasoning summary
- `status` (text) — 'pending', 'confirmed', 'dismissed' (default 'pending')
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- `profiles`: owner-scoped CRUD (authenticated users manage their own profile).
- `items`: owner can create/update/delete own items; all authenticated users can
  read all items (so people can search and find matches across campus).
- `matches`: all authenticated users can read; only the owner of the lost item
  can update match status (confirm/dismiss).
- Storage bucket `item-photos` created for user-uploaded photos, with policies
  allowing authenticated users to upload and read.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('lost', 'found')),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  color text DEFAULT '',
  brand text DEFAULT '',
  location text DEFAULT '',
  date date DEFAULT CURRENT_DATE,
  image_url text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'returned')),
  contact_preference text NOT NULL DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone')),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_items" ON items;
CREATE POLICY "select_all_items" ON items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_items" ON items;
CREATE POLICY "insert_own_items" ON items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_items" ON items;
CREATE POLICY "update_own_items" ON items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_items" ON items;
CREATE POLICY "delete_own_items" ON items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  found_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  explanation text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_matches" ON matches;
CREATE POLICY "select_all_matches" ON matches FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_match_owner" ON matches;
CREATE POLICY "update_match_owner" ON matches FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = matches.lost_item_id AND items.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = matches.lost_item_id AND items.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_match_owner" ON matches;
CREATE POLICY "insert_match_owner" ON matches FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM items WHERE items.id = matches.lost_item_id AND items.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_match_owner" ON matches;
CREATE POLICY "delete_match_owner" ON matches FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM items WHERE items.id = matches.lost_item_id AND items.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_matches_lost_item ON matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_item ON matches(found_item_id);

-- ============================================================
-- STORAGE BUCKET for item photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads to item-photos" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to item-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-photos');

DROP POLICY IF EXISTS "Allow public reads from item-photos" ON storage.objects;
CREATE POLICY "Allow public reads from item-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-photos');

DROP POLICY IF EXISTS "Allow owner updates to item-photos" ON storage.objects;
CREATE POLICY "Allow owner updates to item-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'item-photos' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'item-photos' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow owner deletes from item-photos" ON storage.objects;
CREATE POLICY "Allow owner deletes from item-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-photos' AND auth.uid() = owner);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();