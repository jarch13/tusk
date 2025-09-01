// src/lib/tokens.js
import { supabase } from './supabaseClient'

// SHA-256 (browser)
export async function sha256(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// Fetch or reuse today's token from localStorage
export async function getPostingToken(session) {
  const key = 'conf_token'
  const cached = JSON.parse(localStorage.getItem(key) || 'null')
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'')
  if (cached && cached.period === today && Date.now() < new Date(cached.expires_at).getTime()) {
    return cached
  }
  // call edge function with Authorization header
  const resp = await fetch(`${import.meta.env.VITE_EDGE_BASE}/confess-issue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` }
  })
  if (!resp.ok) throw new Error('Failed to issue token')
  const fresh = await resp.json()
  localStorage.setItem(key, JSON.stringify(fresh))
  return fresh
}

// Per-thread alias (stable but anonymous)
export function aliasFromHash(hex) {
  const animals = ['Tiger','Falcon','Otter','Panther','Koala','Wolf','Hawk','Dolphin','Panda','Fox','Bear','Owl']
  const adj = ['Calm','Brave','Swift','Quiet','Sunny','Mellow','Bold','Curious','Lucky','Kind','Chill','Zesty']
  let h = 0; for (let i=0;i<hex.length;i++) h = (h*31 + hex.charCodeAt(i))>>>0
  return `${adj[h % adj.length]}-${animals[(h>>4) % animals.length]}-${(h % 97)+1}`
}
