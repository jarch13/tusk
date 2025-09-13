// src/pages/ConfessionsList.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getPostingToken, sha256, aliasFromHash } from '../lib/tokens'

function errMsg(e) {
  return e?.message || e?.error_description || e?.msg || (typeof e === 'string' ? e : 'Unknown error')
}

export default function ConfessionsList({ session }) {
  const [tab, setTab] = useState('new') // 'new'|'hot'
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody]   = useState('')
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState('')
  const [tok, setTok] = useState(null)
  const [myHash, setMyHash] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const t = await getPostingToken(session)
        setTok(t)
      } catch (e) {
        console.error('token error', e)
      }
    })()
  }, [session])

  useEffect(() => {
    (async () => {
      if (tok?.token) setMyHash(await sha256(tok.token))
      else setMyHash(null)
    })()
  }, [tok])

  async function load() {
    // Try view with counts, fall back to table
    let q
    if (tab === 'hot') {
      // order by hot_score if you’ve got it; otherwise score/created_at
      q = supabase.from('conf_posts_with_counts').select('*')
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)
    } else {
      q = supabase.from('conf_posts_with_counts').select('*')
        .order('created_at', { ascending: false })
        .limit(100)
    }
    let { data, error } = await q
    if (error) {
      // fallback to base table without counts
      if (tab === 'hot') {
        ({ data } = await supabase.from('conf_posts').select('*')
          .order('score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100))
      } else {
        ({ data } = await supabase.from('conf_posts').select('*')
          .order('created_at', { ascending: false })
          .limit(100))
      }
    }
    setPosts(data ?? [])
  }
  useEffect(() => { load() }, [tab])

  async function postConfession(e) {
    e.preventDefault()
    try {
      if (!tok?.token) throw new Error('No token yet—try again in a moment')
      const t = title.trim()
      const b = body.trim()
      if (!t) throw new Error('Title is required')
      if (!b) throw new Error('Say something first')
      setPosting(true); setMsg('')
      const token_hash = await sha256(tok.token)
      const { error } = await supabase.from('conf_posts').insert([{ title: t, body: b, token_hash }])
      if (error) throw error
      setTitle(''); setBody(''); setMsg('Posted!')
      await load()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setMsg(errMsg(e))
    } finally {
      setPosting(false)
    }
  }

  async function vote(post, delta) {
    if (!tok?.token) return
    const token_hash = await sha256(tok.token)
    const { error } = await supabase
      .from('conf_votes')
      .insert([{ subject_type: 'post', subject_id: post.id, token_hash, value: delta }])
    if (!error) setPosts(f => f.map(p => p.id === post.id ? { ...p, score: (p.score || 0) + delta } : p))
  }

  async function flag(post) {
    if (!tok?.token) return
    const token_hash = await sha256(tok.token)
    const { error } = await supabase
      .from('conf_flags')
      .insert([{ subject_type: 'post', subject_id: post.id, token_hash, reason: 'community' }])
    if (!error) setMsg('Flagged. Thanks for helping moderate.')
  }

  // Use supabase.functions.invoke to avoid env plumbing
  async function deletePost(postId) {
    if (!tok?.token) return
    try {
      const { data, error } = await supabase.functions.invoke('conf-delete', {
        body: { subject_type: 'post', id: postId, token: tok.token }
      })
      if (error || !data?.ok) throw new Error(error?.message || data?.error || 'Delete failed')
      await load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('new')}
          className={`px-3 py-1 rounded border transition-colors
            ${tab==='new' ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'}`}>
          New
        </button>
        <button onClick={() => setTab('hot')}
          className={`px-3 py-1 rounded border transition-colors
            ${tab==='hot' ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'}`}>
          Hot
        </button>
      </div>

      {/* Composer (title + body) */}
      <form onSubmit={postConfession}
        className="grid gap-2 p-4 border rounded mb-6 bg-white dark:bg-gray-800 dark:border-gray-700">
        <input
          className="border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
          placeholder="Title"
          maxLength={120}
          value={title}
          onChange={e=>setTitle(e.target.value)}
          required
        />
        <textarea
          className="border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
          placeholder="Share a thought (max 500 chars)…"
          value={body}
          onChange={e=>setBody(e.target.value)}
          maxLength={500}
          required
        />
        <button disabled={posting}
          className={`px-4 py-2 rounded text-white ${posting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {posting ? 'Posting…' : 'Post'}
        </button>
        {msg && <p className="text-sm text-gray-600 dark:text-gray-300">{msg}</p>}
      </form>

      {/* Feed */}
      <ul className="grid gap-3">
        {posts.map(p => {
          const alias = aliasFromHash(p.token_hash)
          const commentsCount = p.comments_count ?? null
          return (
            <li key={p.id} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-300 flex justify-between">
                <span>{new Date(p.created_at).toLocaleString()} • by <b>{alias}</b></span>
                <span>score: {p.score ?? 0}</span>
              </div>

              <Link to={`/confessions/${p.id}`} className="block mt-1 font-semibold text-lg hover:underline">
                {p.title || '(untitled)'}
              </Link>
              {!!p.body && (
                <p className="mt-1 text-gray-800 dark:text-gray-100 line-clamp-3">{p.body}</p>
              )}

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button onClick={()=>vote(p,1)}  className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">👍</button>
                <button onClick={()=>vote(p,-1)} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">👎</button>
                <button onClick={()=>flag(p)}   className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">🚩</button>

                {myHash && myHash === p.token_hash && (
                  <button onClick={()=>deletePost(p.id)}
                          className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">🗑️ Delete</button>
                )}

                <Link to={`/confessions/${p.id}`} className="ml-auto px-3 py-1 rounded border hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                  {commentsCount == null ? 'Open thread' : `View comments (${commentsCount})`}
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
