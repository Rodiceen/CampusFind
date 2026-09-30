import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ItemRow {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  color: string;
  brand: string;
  location: string;
  date: string;
  image_url: string;
  status: string;
  user_id: string;
}

interface MatchResult {
  lost_item_id: string;
  found_item_id: string;
  score: number;
  explanation: string;
}

// ---- Text similarity helpers ----

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "it", "this", "that", "of", "in", "on", "at",
  "to", "for", "and", "or", "with", "by", "from", "as", "be", "was",
  "were", "are", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "can",
  "i", "you", "he", "she", "we", "they", "my", "your", "his", "her",
  "its", "our", "their", "me", "him", "them", "but", "not", "no", "so",
  "if", "then", "than", "also", "just", "very", "too", "up", "out",
  "about", "into", "over", "after", "before", "between", "under",
  "above", "below", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "only", "own", "same", "what",
  "when", "where", "which", "who", "whom", "whose", "why", "how",
  "lost", "found", "item", "please", "help", "contact", "me", "my",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

function cosineSimilarity(
  tfA: Map<string, number>,
  tfB: Map<string, number>
): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [term, a] of tfA) {
    magA += a * a;
    const b = tfB.get(term);
    if (b) dot += a * b;
  }
  for (const [, b] of tfB) {
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function normalizeColor(c: string): string {
  const map: Record<string, string> = {
    black: "black", white: "white", gray: "gray", grey: "gray",
    red: "red", blue: "blue", green: "green", yellow: "yellow",
    orange: "orange", purple: "purple", pink: "pink", brown: "brown",
    silver: "silver", gold: "gold", beige: "beige", navy: "blue",
    maroon: "red", teal: "green", turquoise: "blue",
  charcoal: "gray", cream: "white", ivory: "white",
  burgundy: "red", khaki: "brown", tan: "brown",
  copper: "gold", bronze: "gold",
  "dark blue": "blue", "light blue": "blue",
    "dark green": "green", "light green": "green",
    "dark gray": "gray", "light gray": "gray",
  "dark grey": "gray", "light grey": "gray",
  "dark red": "red", "light red": "red",
  "royal blue": "blue", "sky blue": "blue",
  "forest green": "green", "olive": "green",
    "lavender": "purple", "violet": "purple",
    "coral": "orange", "salmon": "orange",
    "rust": "red", "maroon": "red",
    "wine": "red", "rose": "pink",
    "fuchsia": "pink", "magenta": "pink",
    "lime": "green", "mint": "green",
    "mustard": "yellow", "amber": "yellow",
    "champagne": "gold", "platinum": "silver",
  "gunmetal": "gray", "slate": "gray",
    "off-white": "white", "pearl": "white",
    "midnight": "black", "obsidian": "black",
    "onyx": "black", "ebony": "black",
    "scarlet": "red", "crimson": "red",
    "cerulean": "blue", "cobalt": "blue",
    "indigo": "blue", "azure": "blue",
    "emerald": "green", "jade": "green",
    "olive green": "green", "pea": "green",
    "mustard yellow": "yellow",
    "burnt orange": "orange", "terracotta": "orange",
    "chocolate": "brown", "coffee": "brown",
    "espresso": "brown", "mocha": "brown",
    "sand": "beige", "stone": "gray",
    "ash": "gray", "fog": "gray",
    "cloud": "white", "snow": "white",
    "ivory white": "white",
  };
  const key = c.toLowerCase().trim();
  return map[key] || key;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.85;
  const dist = levenshtein(la, lb);
  const maxLen = Math.max(la.length, lb.length);
  return Math.max(0, 1 - dist / maxLen);
}

function computeMatchScore(
  lost: ItemRow,
  found: ItemRow
): { score: number; explanation: string } {
  const reasons: string[] = [];

  // 1. Text similarity (title + description) — weight: 40%
  const lostText = `${lost.title} ${lost.description}`;
  const foundText = `${found.title} ${found.description}`;
  const lostTokens = tokenize(lostText);
  const foundTokens = tokenize(foundText);
  const lostTf = termFreq(lostTokens);
  const foundTf = termFreq(foundTokens);
  const textSim = cosineSimilarity(lostTf, foundTf);
  if (textSim > 0.15) {
    const shared = [...lostTf.keys()].filter((k) => foundTf.has(k));
    if (shared.length > 0) {
      reasons.push(
        `Keywords in common: ${shared.slice(0, 6).join(", ")}`
      );
    }
  }

  // 2. Category match — weight: 20%
  let categoryScore = 0;
  if (lost.category && found.category) {
    if (lost.category.toLowerCase() === found.category.toLowerCase()) {
      categoryScore = 1;
      reasons.push(`Same category (${lost.category})`);
    } else {
      categoryScore = stringSimilarity(lost.category, found.category) * 0.5;
    }
  }

  // 3. Color match — weight: 15%
  let colorScore = 0;
  if (lost.color && found.color) {
    const ncA = normalizeColor(lost.color);
    const ncB = normalizeColor(found.color);
    if (ncA && ncB && ncA === ncB) {
      colorScore = 1;
      reasons.push(`Matching color (${lost.color})`);
    } else if (ncA && ncB) {
      colorScore = stringSimilarity(ncA, ncB) * 0.6;
    }
  }

  // 4. Brand match — weight: 15%
  let brandScore = 0;
  if (lost.brand && found.brand) {
    brandScore = stringSimilarity(lost.brand, found.brand);
    if (brandScore > 0.8) {
      reasons.push(`Matching brand (${lost.brand})`);
    }
  }

  // 5. Location proximity — weight: 10%
  let locationScore = 0;
  if (lost.location && found.location) {
    locationScore = stringSimilarity(lost.location, found.location);
    if (locationScore > 0.7) {
      reasons.push(`Nearby location (${lost.location})`);
    }
  }

  // Weighted total
  const score =
    textSim * 0.4 +
    categoryScore * 0.2 +
    colorScore * 0.15 +
    brandScore * 0.15 +
    locationScore * 0.1;

  // Bonus: if both have images, slight boost
  let finalScore = score;
  if (lost.image_url && found.image_url) {
    finalScore = Math.min(1, score + 0.05);
  }

  // Date proximity bonus (within 3 days)
  if (lost.date && found.date) {
    const dLost = new Date(lost.date).getTime();
    const dFound = new Date(found.date).getTime();
    const dayDiff = Math.abs(dLost - dFound) / (1000 * 60 * 60 * 24);
    if (dayDiff <= 3) {
      finalScore = Math.min(1, finalScore + 0.05);
      reasons.push(`Dates are close (${dayDiff.toFixed(0)} day(s) apart)`);
    }
  }

  const explanation =
    reasons.length > 0
      ? `AI match (${Math.round(finalScore * 100)}% confidence): ${reasons.join("; ")}.`
      : `Low-confidence match (${Math.round(finalScore * 100)}%): some attributes overlap.`;

  return { score: Math.round(finalScore * 100) / 100, explanation };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { item_id, direction } = body as {
      item_id: string;
      direction: "lost-to-found" | "found-to-lost";
    };

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: "item_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the source item
    const { data: sourceItem, error: srcErr } = await supabase
      .from("items")
      .select("*")
      .eq("id", item_id)
      .maybeSingle();

    if (srcErr || !sourceItem) {
      return new Response(
        JSON.stringify({ error: "Item not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which items to compare against
    const targetType = sourceItem.type === "lost" ? "found" : "lost";
    const lostItem = sourceItem.type === "lost" ? sourceItem : null;
    const foundItem = sourceItem.type === "found" ? sourceItem : null;

    // Fetch all active items of the opposite type
    const { data: candidates, error: candErr } = await supabase
      .from("items")
      .select("*")
      .eq("type", targetType)
      .eq("status", "active")
      .neq("user_id", sourceItem.user_id);

    if (candErr) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch candidates" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No candidates to compare" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute scores for all candidates
    const results: MatchResult[] = [];
    for (const candidate of candidates as ItemRow[]) {
      const l = lostItem || (candidate as ItemRow);
      const f = foundItem || (candidate as ItemRow);
      const { score, explanation } = computeMatchScore(l, f);
      if (score >= 0.25) {
        results.push({
          lost_item_id: l.id,
          found_item_id: f.id,
          score,
          explanation,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Take top 10
    const topMatches = results.slice(0, 10);

    // Persist matches to the matches table
    // First, delete old matches for this item to avoid duplicates
    if (sourceItem.type === "lost") {
      await supabase
        .from("matches")
        .delete()
        .eq("lost_item_id", sourceItem.id);
    } else {
      await supabase
        .from("matches")
        .delete()
        .eq("found_item_id", sourceItem.id);
    }

    if (topMatches.length > 0) {
      const { error: insertErr } = await supabase
        .from("matches")
        .insert(topMatches.map((m) => ({
          lost_item_id: m.lost_item_id,
          found_item_id: m.found_item_id,
          score: m.score,
          explanation: m.explanation,
          status: "pending",
        })));

      if (insertErr) {
        console.error("Insert error:", insertErr);
      }
    }

    return new Response(
      JSON.stringify({
        matches: topMatches,
        total_compared: candidates.length,
        source_type: sourceItem.type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
