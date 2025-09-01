// src/pages/Confessions.jsx
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getPostingToken, sha256, aliasFromHash } from '../lib/tokens'
import Modal from '../components/Modal'

const isIOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document)

function errMsg(e) {
  return e?.message || e?.error_description || e?.msg || (typeof e === 'string' ? e : 'Unknown error')
}

export default function Confessions({ session }) {
  const [tab, setTab] = useState('new') // 'new' | 'hot'
  const [feed, setFeed] = useState([])

  // inline compose
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState('')

  // modal compose (non-iOS)
  const [isComposeOpen, setComposeOpen] = useState(false)
  const [mText, setMText] = useState('')
  const [mPosting, setMPosting] = useState(false)
  const mRef = useRef(null)
  const mRemaining = 500 - mText.length

  // anon token
  const [tok, setTok] = useState(null)

  // threads
  const [openId, setOpenId] = useState(null)
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState('')

  // bootstrap anon token
  useEffect(() => {
    (async () => {
      try { setTok(await getPostingToken(session)) }
      catch (e) { console.error('confess-issue token error:', e) }
    })()
  }, [session])

  // focus modal textarea on open (non-iOS)
  useEffect(() => {
    if (!isComposeOpen || isIOS) return
    const t = setTimeout(() => mRef.current?.focus({ preventScroll: true }), 80)
    return () => clearTimeout(t)
  }, [isComposeOpen])

  // load feed
  async function load() {
    if (tab === 'hot') {
      const hot = await supabase.from('conf_posts_hot').select('*')
        .order('hot_score', { ascending: false }).order('created_at', { ascending: false }).limit(100)
      if (!hot.error) { setFeed(hot.data ?? []); return }
    }
    const { data } = await supabase
      .from('conf_posts')
      .select('*')
      .order(tab === 'hot' ? 'score' : 'created_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    setFeed(data ?? [])
  }
  useEffect(() => { load() }, [tab])

  // shared poster
  async function postConfession(body) {
    if (!tok) throw new Error('No token yet—try again in a moment')
    const trimmed = body.trim()
    if (!trimmed) throw new Error('Say something first')
    const token_hash = await sha256(tok.token)
    const { error } = await supabase.from('conf_posts').insert([{ body: trimmed, token_hash }])
    if (error) throw error
    await load()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // inline submit
  async function submitPost(e) {
    e.preventDefault()
    setPosting(true); setMsg('')
    try {
      await postConfession(text)
      setText(''); setMsg('Posted!')
    } catch (e) {
      const m = errMsg(e); setMsg(m); console.error(m, e)
    } finally { setPosting(false) }
  }

  // modal submit
  async function submitPostModal(e) {
    e.preventDefault()
    setMPosting(true)
    try {
      await postConfession(mText)
      setMText(''); setComposeOpen(false)
    } catch (e) {
      const m = errMsg(e); alert(m); console.error(m, e)
    } finally { setMPosting(false) }
  }

  async function vote(post, delta) {
    if (!tok) return
    const token_hash = await sha256(tok.token)
    const { error } = await supabase
      .from('conf_votes')
      .insert([{ subject_type: 'post', subject_id: post.id, token_hash, value: delta }])
    if (!error) setFeed(f => f.map(p => p.id === post.id ? { ...p, score: (p.score || 0) + delta } : p))
  }

  async function flag(post) {
    if (!tok) return
    const token_hash = await sha256(tok.token)
    const { error } = await supabase
      .from('conf_flags')
      .insert([{ subject_type: 'post', subject_id: post.id, token_hash, reason: 'community' }])
    if (!error) setMsg('Flagged. Thanks for helping moderate.')
  }

  async function openThread(post) {
    setOpenId(prev => prev === post.id ? null : post.id)
    if (!comments[post.id]) {
      const { data } = await supabase
        .from('conf_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })
      setComments(c => ({ ...c, [post.id]: data ?? [] }))
    }
  }

  async function addComment(post) {
    const body = commentText.trim()
    if (!tok || !body) return
    const token_hash = await sha256(tok.token)
    const { data, error } = await supabase
      .from('conf_comments')
      .insert([{ post_id: post.id, body, token_hash }])
      .select('*')
      .single()
    if (!error && data) {
      setComments(c => ({ ...c, [post.id]: [ ...(c[post.id] || []), data ] }))
      setCommentText('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('new')}
          className={`px-3 py-1 rounded border transition-colors
            ${tab==='new'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'}`}
        >New</button>
        <button
          onClick={() => setTab('hot')}
          className={`px-3 py-1 rounded border transition-colors
            ${tab==='hot'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'}`}
        >Hot</button>
      </div>

      {/* Inline compose:
          - iOS: visible on mobile (works perfectly with keyboard)
          - others: hidden on mobile, visible from md+ (you still have the modal/FAB) */}
      <form
        onSubmit={submitPost}
        className={`${isIOS ? 'grid' : 'hidden md:grid'} gap-2 p-4 border rounded mb-6 bg-white dark:bg-gray-800 dark:border-gray-700`}
      >
        <textarea
          id="conf-compose"
          maxLength={500}
          className="border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
          placeholder="Share a thought (max 500 chars)…"
          value={text}
          onChange={(e)=>setText(e.target.value)}
          required
        />
        <button
          disabled={posting}
          className={`px-4 py-2 rounded text-white ${posting?'bg-gray-400':'bg-blue-600 hover:bg-blue-700'}`}
        >
          {posting?'Posting…':'Post'}
        </button>
        {msg && <p className="text-sm text-gray-600 dark:text-gray-300">{msg}</p>}
      </form>

      {/* Feed */}
      <ul className="grid gap-3">
        {feed.map(p => {
          const isOpen = openId === p.id
          const threadAlias = aliasFromHash(p.token_hash + ':' + p.id)
          const count = comments[p.id]?.length
          return (
            <li key={p.id} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-300 flex justify-between">
                <span>{new Date(p.created_at).toLocaleString()} • by <b>{threadAlias}</b></span>
                <span>score: {p.score ?? 0}</span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-100">{p.body}</div>

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button onClick={()=>vote(p, 1)}  className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Upvote">👍</button>
                <button onClick={()=>vote(p, -1)} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Downvote">👎</button>
                <button onClick={()=>flag(p)}     className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Report">🚩</button>

                <button onClick={()=>openThread(p)}
                  className="ml-auto px-3 py-1 rounded border hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                  {isOpen ? 'Hide comments' : `View comments${typeof count==='number' ? ` (${count})` : ''}`}
                </button>
              </div>

              {isOpen && (
                <div className="mt-3 pl-2 border-l dark:border-gray-700">
                  <div className="space-y-2">
                    {(comments[p.id] || []).map(c => (
                      <div key={c.id} className="text-sm">
                        <div className="text-[11px] text-gray-500 dark:text-gray-300">
                          {new Date(c.created_at).toLocaleString()} • {aliasFromHash(c.token_hash + ':' + c.post_id)}
                        </div>
                        <div className="whitespace-pre-wrap">{c.body}</div>
                      </div>
                    ))}
                    <div className="flex gap-2 items-start pt-2">
                      <textarea
                        className="border p-2 rounded flex-1 dark:bg-gray-900 dark:border-gray-700"
                        placeholder="Add a comment…"
                        value={commentText}
                        onChange={e=>setCommentText(e.target.value)}
                        maxLength={500}
                      />
                      <button onClick={()=>addComment(p)} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* FAB:
          - iOS: jump to inline composer and focus (no modal)
          - others: open modal composer */}
      <button
        onClick={() => {
          if (isIOS) {
            const el = document.getElementById('conf-compose')
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              setTimeout(() => el.focus({ preventScroll: true }), 120)
            }
          } else {
            setComposeOpen(true)
          }
        }}
        className="md:hidden fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full
                   bg-blue-600 text-white text-2xl leading-none
                   shadow-lg hover:bg-blue-700 active:scale-95"
        aria-label="New confession"
        title="New confession"
      >
        +
      </button>

      {/* Modal composer (non-iOS only) */}
      {!isIOS && (
        <Modal
          open={isComposeOpen}
          onClose={() => setComposeOpen(false)}
          title="New confession"
          footer={
            <>
              <button
                onClick={() => setComposeOpen(false)}
                className="px-3 py-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                form="conf-compose-form"
                type="submit"
                disabled={mPosting}
                className={`px-3 py-2 rounded text-white ${mPosting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {mPosting ? 'Posting…' : 'Post'}
              </button>
            </>
          }
        >
          <form id="conf-compose-form" onSubmit={submitPostModal} className="grid gap-2">
            <textarea
              ref={mRef}
              maxLength={500}
              // No autoFocus on iOS; here it's non-iOS only anyway
              className="border p-2 rounded min-h-32 dark:bg-gray-900 dark:border-gray-700"
              placeholder="Share a thought (max 500 chars)…"
              value={mText}
              onChange={(e)=>setMText(e.target.value)}
              required
            />
            <div className="text-xs text-gray-500 dark:text-gray-300 text-right">
              {mRemaining} characters left
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
