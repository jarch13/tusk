// src/lib/tokens.js

// Robust SHA-256: uses Web Crypto if available, else pure-JS fallback.
// Returns a lowercase hex string.
export async function sha256(input) {
  // Prefer fast native hashing when available (secure contexts, modern browsers)
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle?.digest) {
      const bytes = new TextEncoder().encode(input);
      const buf = await window.crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(buf)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fall through to fallback
  }
  // Fallback for older iOS webviews or non-secure contexts (e.g., LAN http)
  return sha256FallbackUTF8(input);
}

/* ---------------- Fallback helpers (pure JS) ---------------- */

// Convert UTF-8 string → binary ASCII string for the fallback hasher
function toAscii(str) {
  // handles emoji / multi-byte via encodeURIComponent
  return unescape(encodeURIComponent(str));
}

// Minimal dependency-free SHA-256 implementation (public-domain style)
function sha256Fallback(ascii) {
  function R(x, n) { return (x >>> n) | (x << (32 - n)); }
  const maxWord = 2 ** 32;

  let i, j, result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;

  // Initialize constants (first 64 primes)
  const hash = sha256Fallback.h = sha256Fallback.h || [];
  const k    = sha256Fallback.k = sha256Fallback.k || [];
  let primeCounter = k.length, isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, .5) * maxWord) | 0;
      k[primeCounter++]  = (Math.pow(candidate, 1/3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) throw new Error('ASCII-only input to fallback'); // guarded by toAscii()
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = (asciiBitLength);

  const w = [];
  for (j = 0; j < words.length;) {
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3],
        e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (i = 0; i < 64; i++) {
      w[i] = i < 16 ? words[j + i] :
        (w[i-2]>>>17 ^ w[i-2]<<15 ^ w[i-2]>>>19 ^ w[i-2]<<13 ^ w[i-2]>>>10) + w[i-7] +
        (w[i-15]>>>7 ^ w[i-15]<<25 ^ w[i-15]>>>18 ^ w[i-15]<<14 ^ w[i-15]>>>3) + w[i-16] | 0;

      const t2 = (a>>>2 ^ a<<30 ^ a>>>13 ^ a<<19 ^ a>>>22 ^ a<<10) + ((a&b) ^ (a&c) ^ (b&c)) | 0;
      const t1 = h + (e>>>6 ^ e<<26 ^ e>>>11 ^ e<<21 ^ e>>>25 ^ e<<7) + ((e&f) ^ (~e & g)) + k[i] + w[i] | 0;

      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;

    j += 16;
  }
  for (i = 0; i < hash.length; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

function sha256FallbackUTF8(str) {
  return sha256Fallback(toAscii(str));
}

/* ---------------- Token + alias helpers ---------------- */

// Fetch or reuse today's token from localStorage
export async function getPostingToken(session) {
  const key = 'conf_token';
  const cached = JSON.parse(localStorage.getItem(key) || 'null');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (cached && cached.period === today && Date.now() < new Date(cached.expires_at).getTime()) {
    return cached;
  }
  // call edge function with Authorization header
  const resp = await fetch(`${import.meta.env.VITE_EDGE_BASE}/confess-issue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!resp.ok) throw new Error('Failed to issue token');
  const fresh = await resp.json();
  localStorage.setItem(key, JSON.stringify(fresh));
  return fresh;
}

// Per-thread alias (stable but anonymous)
export function aliasFromHash(hex) {
  const animals = ['Tiger','Falcon','Otter','Panther','Koala','Wolf','Hawk','Dolphin','Panda','Fox','Bear','Owl'];
  const adj = ['Calm','Brave','Swift','Quiet','Sunny','Mellow','Bold','Curious','Lucky','Kind','Chill','Zesty'];
  let h = 0; for (let i = 0; i < hex.length; i++) h = (h * 31 + hex.charCodeAt(i)) >>> 0;
  return `${adj[h % adj.length]}-${animals[(h >> 4) % animals.length]}-${(h % 97) + 1}`;
}
