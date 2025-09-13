// src/pages/ConfessionDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getPostingToken, sha256, aliasFromHash } from '../lib/tokens'

function errMsg(e) {
  return e?.message || e?.error_description || e?.msg || (typeof e === 'string' ? e : 'Unknown error')
}

export default function ConfessionDetail({ session }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [tok, setTok] = useState(null)
  const [myHash, setMyHash] = useState(null)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const t = await getPostingToken(session)
        setTok(t)
      } catch (e) { console.error('token error', e) }
    })()
  }, [session])

  useEffect(() => {
    (async () => {
      if (tok?.token) setMyHash(await sha256(tok.token))
      else setMyHash(null)
    })()
  }, [tok])

  async function load() {
    const { data: p } = await supabase.from('conf_posts').select('*').eq('id', id).maybeSingle()
    setPost(p || null)
    const { data: cmts } = await supabase.from('conf_comments')
      .select('*').eq('post_id', id).order('created_at', { ascending: true })
    setComments(cmts || [])
  }
  useEffect(() => { load() }, [id])

  async function vote(delta) {
    if (!tok?.token || !post) return
    const token_hash = await sha256(tok.token)
    const { error } = await supabase.from('conf_votes')
      .insert([{ subject_type: 'post', subject_id: post.id, token_hash, value: delta }])
    if (!error) setPost(p => ({ ...p, score: (p?.score || 0) + delta }))
  }

  async function flag() {
    if (!tok?.token || !post) return
    const token_hash = await sha256(tok.token)
    const { error } = await supabase.from('conf_flags')
      .insert([{ subject_type: 'post', subject_id: post.id, token_hash, reason: 'community' }])
    if (!error) setMsg('Flagged. Thanks!')
  }

  async function addComment() {
    const body = text.trim()
    if (!tok?.token || !body || !post) return
    const token_hash = await sha256(tok.token)
    const { data, error } = await supabase
      .from('conf_comments')
      .insert([{ post_id: post.id, body, token_hash }])
      .select('*').single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setText('')
    }
  }

  async function deletePost() {
    if (!tok?.token || !post) return
    const { data, error } = await supabase.functions.invoke('conf-delete', {
      body: { subject_type: 'post', id: post.id, token: tok.token }
    })
    if (error || !data?.ok) { alert(errMsg(error || data)); return }
    nav('/confessions')
  }

  async function deleteComment(commentId) {
    if (!tok?.token) return
    const { data, error } = await supabase.functions.invoke('conf-delete', {
      body: { subject_type: 'comment', id: commentId, token: tok.token }
    })
    if (error || !data?.ok) { alert(errMsg(error || data)); return }
    setComments(list => list.filter(c => c.id !== commentId))
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Link to="/confessions" className="text-blue-600 hover:underline">← Back</Link>
        <div className="mt-4 text-gray-700 dark:text-gray-200">Loading…</div>
      </div>
    )
  }

  const alias = aliasFromHash(post.token_hash)

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-3">
        <Link to="/confessions" className="text-blue-600 hover:underline">← Back to Confessions</Link>
      </div>

      <h1 className="text-2xl font-bold">{post.title || '(untitled)'}</h1>
      <div className="text-xs text-gray-500 dark:text-gray-300 flex gap-3 items-center">
        <span>{new Date(post.created_at).toLocaleString()} • by <b>{alias}</b></span>
        <span>score: {post.score ?? 0}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-gray-800 dark:text-gray-100">{post.body}</p>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button onClick={()=>vote(1)}  className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">👍</button>
        <button onClick={()=>vote(-1)} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">👎</button>
        <button onClick={flag}      className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">🚩</button>

        {myHash && myHash === post.token_hash && (
          <button onClick={deletePost} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">🗑️ Delete</button>
        )}
      </div>

      <h2 className="mt-6 mb-2 font-semibold">Comments</h2>
      <div className="space-y-3">
        {comments.map(c => (
          <div key={c.id} className="border rounded p-2 bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="text-[11px] text-gray-500 dark:text-gray-300 flex items-center gap-2">
              {new Date(c.created_at).toLocaleString()} • {aliasFromHash(c.token_hash)}
              {myHash && myHash === c.token_hash && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="ml-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Delete your comment"
                >🗑️</button>
              )}
            </div>
            <div className="whitespace-pre-wrap">{c.body}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2">
        <textarea
          className="border p-2 rounded flex-1 dark:bg-gray-900 dark:border-gray-700"
          placeholder="Add a comment…"
          value={text}
          onChange={e=>setText(e.target.value)}
          maxLength={500}
        />
        <button onClick={addComment} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
          Comment
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{msg}</p>}
    </div>
  )
}
