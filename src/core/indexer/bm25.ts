/**
 * Native Okapi BM25 — zero-dependency lexical ranker (data-plane Tier-1).
 *
 * Pure math, no external deps. Tokenization splits identifiers
 * (camelCase / snake_case / kebab) into subtokens AND keeps the whole token,
 * then applies a light suffix stemmer so "limiting"/"limits" reach "limit".
 *
 * Serialization is compact: doc ids are mapped to integer indices so the
 * postings file does not repeat long "path:line" strings per posting.
 *
 * Seam for Tier-2: search() returns ScoredDoc[] so a static-embedding retriever
 * can be fused on top via Reciprocal Rank Fusion without touching this class.
 */

const K1 = 1.2;
const B = 0.75;

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "her",
  "was", "one", "our", "out", "his", "has", "had", "let", "put", "this", "that",
  "with", "from", "into", "your", "they", "have", "will", "what", "when",
]);

// Conservative suffix stemmer. Applied identically to index and query tokens, so
// even imperfect stems still match consistently. Order: longest suffix first.
const SUFFIXES = ["izations", "ization", "ements", "ement", "ations", "ation", "ings", "ing", "ed", "es", "ly", "s"];

function stem(t: string): string {
  if (t.length <= 4) return t;
  if (t.endsWith("ies") && t.length > 5) return `${t.slice(0, -3)}y`;
  for (const suf of SUFFIXES) {
    if (t.endsWith(suf) && t.length - suf.length >= 3) return t.slice(0, t.length - suf.length);
  }
  return t;
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const raw = text.match(/[a-z0-9_]+/gi) ?? [];
  for (const tok of raw) {
    const lower = tok.toLowerCase();
    if (lower.length >= 2 && !STOPWORDS.has(lower)) out.push(stem(lower));
    const parts = tok
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .split(/[^a-zA-Z0-9]+/);
    if (parts.length > 1) {
      for (const p of parts) {
        const lp = p.toLowerCase();
        if (lp.length >= 2 && !STOPWORDS.has(lp)) out.push(stem(lp));
      }
    }
  }
  return out;
}

export interface ScoredDoc {
  id: string;
  score: number;
}

interface SerializedBM25 {
  version: 2;
  ids: string[];
  docLen: number[];
  postings: Record<string, Record<string, number>>; // term -> { idIndex -> tf }
}

export class BM25Index {
  private docLen = new Map<string, number>();
  private postings = new Map<string, Map<string, number>>(); // term -> (docId -> tf)
  private totalLen = 0;

  addDocument(id: string, tokens: string[]): void {
    this.docLen.set(id, tokens.length);
    this.totalLen += tokens.length;
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [term, count] of tf) {
      let p = this.postings.get(term);
      if (!p) { p = new Map(); this.postings.set(term, p); }
      p.set(id, count);
    }
  }

  get size(): number {
    return this.docLen.size;
  }

  search(query: string, topK = 10): ScoredDoc[] {
    const N = this.docLen.size;
    if (N === 0) return [];
    const avgdl = this.totalLen / N;
    const qTerms = tokenize(query);
    const scores = new Map<string, number>();

    for (const term of qTerms) {
      const p = this.postings.get(term);
      if (!p) continue;
      const df = p.size;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (const [docId, tf] of p) {
        const dl = this.docLen.get(docId) ?? avgdl;
        const denom = tf + K1 * (1 - B + (B * dl) / avgdl);
        const contrib = idf * ((tf * (K1 + 1)) / denom);
        scores.set(docId, (scores.get(docId) ?? 0) + contrib);
      }
    }

    return [...scores.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  serialize(): SerializedBM25 {
    const ids = [...this.docLen.keys()];
    const idIndex = new Map<string, number>();
    ids.forEach((id, i) => idIndex.set(id, i));
    const docLen = ids.map(id => this.docLen.get(id) ?? 0);
    const postings: Record<string, Record<string, number>> = {};
    for (const [term, p] of this.postings) {
      const obj: Record<string, number> = {};
      for (const [docId, tf] of p) obj[idIndex.get(docId) as number] = tf;
      postings[term] = obj;
    }
    return { version: 2, ids, docLen, postings };
  }

  static deserialize(data: SerializedBM25): BM25Index {
    const idx = new BM25Index();
    data.ids.forEach((id, i) => {
      const len = data.docLen[i] ?? 0;
      idx.docLen.set(id, len);
      idx.totalLen += len;
    });
    for (const [term, obj] of Object.entries(data.postings)) {
      const p = new Map<string, number>();
      for (const [idIndex, tf] of Object.entries(obj)) {
        const id = data.ids[Number(idIndex)];
        if (id !== undefined) p.set(id, tf);
      }
      idx.postings.set(term, p);
    }
    return idx;
  }
}
