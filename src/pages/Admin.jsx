// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { sha256, aliasFromHash } from '../lib/tokens'
import { Link } from 'react-router-dom'

export default function Admin({ session }) {
  const user = session?.user
  const [isAdmin, setIsAdmin] = useState(false)

  // panes
  const [tab, setTab] = useState('feedback') // 'feedback' | 'flags' | 'admins'

  // feedback state
  const [feedback, setFeedback] = useState([])
  const [filt, setFilt] = useState('all') // all | bug | idea | abuse | other
  const feedbackView = useMemo(
    () => (filt === 'all' ? feedback : feedback.filter(f => f.category === filt)),
    [feedback, filt]
  )

  // flags state
  const [flagsP, setFlagsP] = useState([]) // posts (joined)
  const [flagsC, setFlagsC] = useState([]) // comments (joined)

  // admins state
  const [admins, setAdmins] = useState([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    (async () => {
      // check admin
      const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (error) { console.error(error); return }
      setIsAdmin(!!data?.is_admin)
    })()
  }, [user.id])

  useEffect(() => {
    if (!isAdmin) return
    loadFeedback()
    loadFlags()
    loadAdmins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function loadFeedback() {
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(500)
    if (!error) setFeedback(data || [])
  }

  async function loadFlags() {
    // Load flags
    const { data: fl, error } = await supabase.from('conf_flags').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) return

    const postIds = fl.filter(x=>x.subject_type==='post').map(x=>x.subject_id)
    const cmtIds  = fl.filter(x=>x.subject_type==='comment').map(x=>x.subject_id)

    const [posts, cmts] = await Promise.all([
      postIds.length ? supabase.from('conf_posts').select('*').in('id', postIds) : { data: [] },
      cmtIds.length  ? supabase.from('conf_comments').select('*').in('id', cmtIds)  : { data: [] },
    ])

    const postsMap = new Map((posts.data||[]).map(p => [p.id, p]))
    const cmtsMap  = new Map((cmts.data||[]).map(c => [c.id, c]))

    setFlagsP(fl.filter(f=>f.subject_type==='post').map(f => ({ flag: f, post: postsMap.get(f.subject_id) })))
    setFlagsC(fl.filter(f=>f.subject_type==='comment').map(f => ({ flag: f, comment: cmtsMap.get(f.subject_id) })))
  }

  async function loadAdmins() {
    const { data, error } = await supabase.from('profiles').select('id, display_name, is_admin').eq('is_admin', true).limit(200)
    if (!error) setAdmins(data || [])
  }

  // moderation actions
  async function deletePost(id) {
    const ok = confirm('Delete this post?')
    if (!ok) return
    const { data, error } = await supabase.functions.invoke('conf-delete', { body: { subject_type: 'post', id } })
    if (error || !data?.ok) return alert(error?.message || data?.error || 'Failed')
    await loadFlags()
  }
  async function deleteComment(id) {
    const ok = confirm('Delete this comment?')
    if (!ok) return
    const { data, error } = await supabase.functions.invoke('conf-delete', { body: { subject_type: 'comment', id } })
    if (error || !data?.ok) return alert(error?.message || data?.error || 'Failed')
    await loadFlags()
  }

  // admin manage
  async function setAdmin(make_admin) {
    setBusy(true); setNote('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-set', {
        body: { email: email.trim(), make_admin },
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (error || !data?.ok) throw new Error(error?.message || data?.error || 'Failed')
      setEmail('')
      setNote(make_admin ? 'Granted admin.' : 'Revoked admin.')
      await loadAdmins()
    } catch (e) {
      setNote(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <p className="text-gray-700 dark:text-gray-200">
          Access denied. This page is for admins only.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-3">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['feedback','flags','admins'].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-3 py-1 rounded border transition-colors
              ${tab===t ? 'bg-gray-900 text-white' : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'}`}>
            {t[0].toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='feedback' && (
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-semibold">Feedback</span>
            <div className="ml-auto flex gap-2">
              {['all','bug','idea','abuse','other'].map(c=>(
                <button key={c} onClick={()=>setFilt(c)}
                  className={`px-2 py-1 rounded border text-sm
                    ${filt===c ? 'bg-gray-900 text-white' : 'bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <ul className="grid gap-3">
            {feedbackView.map(f => (
              <li key={f.id} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-300 flex justify-between">
                  <span>{new Date(f.created_at).toLocaleString()} • {f.is_anonymous ? 'anon' : (f.email || 'user')}</span>
                  <span className="uppercase">{f.category}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap">{f.message}</div>
                {f.path && <div className="mt-1 text-xs text-gray-500">path: {f.path}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab==='flags' && (
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold mb-3">Flagged content</h2>

          <h3 className="mt-2 font-medium">Posts</h3>
          <ul className="grid gap-3">
            {flagsP.map(({ flag, post }) => (
              <li key={flag.id} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-300 flex justify-between">
                  <span>flagged {new Date(flag.created_at).toLocaleString()} • reason: {flag.reason}</span>
                  {post && <span>score: {post.score ?? 0}</span>}
                </div>
                {post ? (
                  <>
                    <div className="mt-1 font-semibold">{post.title || '(untitled)'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">by {aliasFromHash(post.token_hash)}</div>
                    <div className="mt-1 whitespace-pre-wrap">{post.body}</div>
                    <div className="mt-2 flex gap-2">
                      <Link to={`/confessions/${post.id}`} className="px-2 py-1 rounded border hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-sm">Open</Link>
                      <button onClick={()=>deletePost(post.id)} className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>
                    </div>
                  </>
                ) : (
                  <div className="italic text-sm">Post no longer exists.</div>
                )}
              </li>
            ))}
          </ul>

          <h3 className="mt-6 font-medium">Comments</h3>
          <ul className="grid gap-3">
            {flagsC.map(({ flag, comment }) => (
              <li key={flag.id} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-300 flex justify-between">
                  <span>flagged {new Date(flag.created_at).toLocaleString()} • reason: {flag.reason}</span>
                </div>
                {comment ? (
                  <>
                    <div className="text-xs text-gray-500 dark:text-gray-300">by {aliasFromHash(comment.token_hash)}</div>
                    <div className="mt-1 whitespace-pre-wrap">{comment.body}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={()=>deleteComment(comment.id)} className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>
                    </div>
                  </>
                ) : (
                  <div className="italic text-sm">Comment no longer exists.</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab==='admins' && (
        <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold mb-3">Admins</h2>
          <ul className="grid gap-2 mb-4">
            {admins.map(a => (
              <li key={a.id} className="text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>{a.display_name || a.id}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              placeholder="someone@fullerton.edu"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="border px-3 py-2 rounded min-w-[260px]
                         border-gray-300 dark:border-gray-700
                         bg-white dark:bg-gray-900
                         text-gray-900 dark:text-gray-100"
            />
            <button disabled={busy} onClick={()=>setAdmin(true)}  className={`px-3 py-2 rounded text-white ${busy ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>Grant admin</button>
            <button disabled={busy} onClick={()=>setAdmin(false)} className={`px-3 py-2 rounded text-white ${busy ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}>Revoke admin</button>
            {note && <span className="text-sm text-gray-700 dark:text-gray-300">{note}</span>}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Requires the <code>admin-set</code> Edge Function to be deployed with <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, and <code>SUPABASE_ANON_KEY</code>.
          </p>
        </section>
      )}
    </div>
  )
}
