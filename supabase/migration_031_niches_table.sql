-- Migration 031: Dynamic niches table
-- Replaces hard-coded niche config with DB-managed rows

CREATE TABLE IF NOT EXISTS public.niches (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  emoji        TEXT DEFAULT '🛒',
  gradient     TEXT DEFAULT 'from-slate-900 via-slate-800 to-zinc-800',
  accent_color TEXT DEFAULT 'bg-indigo-500',
  text_accent  TEXT DEFAULT 'text-indigo-400',
  banner       TEXT DEFAULT '',
  categories   TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Niches are public config — no RLS needed; writes are protected at the API layer
ALTER TABLE public.niches DISABLE ROW LEVEL SECURITY;

-- Seed default 4 niches
INSERT INTO public.niches (id, name, description, emoji, gradient, accent_color, text_accent, banner, categories)
VALUES
  ('cars', 'Auto & Cars', 'Everything your vehicle needs — parts, accessories & care',
   '🚗', 'from-slate-900 via-slate-800 to-zinc-800', 'bg-orange-500', 'text-orange-400',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80',
   ARRAY['Accessories','Spare Parts','Car Care','Electronics','Tires & Wheels']),

  ('animals', 'Pets & Animals', 'Spoil your furry, feathered & finned companions',
   '🐾', 'from-emerald-950 via-emerald-900 to-teal-900', 'bg-amber-400', 'text-amber-400',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=80',
   ARRAY['Dog Supplies','Cat Supplies','Bird Supplies','Fish & Aquarium','Pet Food']),

  ('kids', 'Kids & Baby', 'Safe, fun & educational products for little ones',
   '🧸', 'from-purple-950 via-violet-900 to-purple-800', 'bg-pink-400', 'text-pink-400',
   'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1400&q=80',
   ARRAY['Toys & Games','Baby Clothing','Educational','Baby Care','Nursery']),

  ('deco', 'Home Decor', 'Transform your home with trending furniture & accessories',
   '🛋️', 'from-stone-900 via-amber-950 to-stone-800', 'bg-amber-600', 'text-amber-500',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=80',
   ARRAY['Meubles','Décoration Murale','Éclairage','Textiles','Rangement'])

ON CONFLICT (id) DO NOTHING;
