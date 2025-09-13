// src/pages/Profile.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Profile({ user }) {
  // Guard against missing prop
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-gray-700 dark:text-gray-200">Loading profile…</div>
      </div>
    )
  }

  // ---- Profile state ----
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profile, setProfile] = useState(null) // { id, display_name, ... }
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [note, setNote] = useState('')

  // ---- Listings state ----
  const [loadingListings, setLoadingListings] = useState(true)
  const [listings, setListings] = useState([])
  const [filter, setFilter] = useState('all') // all | active | hidden | sold
  const filtered = useMemo(() => {
    if (filter === 'all') return listings
    return listings.filter(l => l.status === filter)
  }, [listings, filter])

  // ---- Feedback state ----
  const [fbCat, setFbCat] = useState('bug')      // bug | idea | abuse | other
  const [fbMsg, setFbMsg] = useState('')
  const [fbAnon, setFbAnon] = useState(true)
  const [fbSending, setFbSending] = useState(false)
  const [fbNote, setFbNote] = useState('')

  // ---------- Loaders ----------
  async function loadProfile() {
    setLoadingProfile(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error(error)
      setLoadingProfile(false)
      return
    }

    if (!data) {
      // create a default row if missing
      const fallback = user.email?.split('@')[0] || 'Student'
      const ins = await supabase
        .from('profiles')
        .insert([{ id: user.id, display_name: fallback }])
        .select('*')
        .single()
      if (ins.error) {
        console.error(ins.error)
      } else {
        setProfile(ins.data)
        setNameInput(ins.data.display_name || '')
      }
    } else {
      setProfile(data)
      setNameInput(data.display_name || '')
    }
    setLoadingProfile(false)
  }

  async function loadListings() {
    setLoadingListings(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      console.error(error)
    } else {
      setListings(data || [])
    }
    setLoadingListings(false)
  }

  useEffect(() => {
    loadProfile()
    loadListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  // ---------- Profile actions ----------
  async function saveDisplayName(e) {
    e?.preventDefault()
    const v = nameInput.trim()
    if (!v) { setNote('Display name cannot be empty.'); return }
    setSavingName(true); setNote('')
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: v })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) {
      setNote(error.message || 'Failed to save name')
    } else {
      setProfile(data)
      setEditing(false)
      setNote('Saved!')
    }
    setSavingName(false)
  }

  // ---------- Listing actions ----------
  const isOwner = (it) => it.owner_id === user.id

  async function setStatus(l, status) {
    const { error } = await supabase.from('listings').update({ status }).eq('id', l.id)
    if (!error) {
      setListings(prev => prev.map(x => x.id === l.id ? { ...x, status } : x))
    }
  }

  async function removeListing(l) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    const { error } = await supabase.from('listings').delete().eq('id', l.id)
    if (!error) {
      setListings(prev => prev.filter(x => x.id !== l.id))
    }
  }

  // ---------- Feedback actions ----------
  async function submitFeedback(e) {
    e.preventDefault()
    setFbSending(true); setFbNote('')
    try {
      const payload = {
        category: fbCat,
        message: fbMsg.trim(),
        path: window.location.pathname,
        user_agent: navigator.userAgent,
        is_anonymous: fbAnon,
        user_id: fbAnon ? null : user.id,
        email: fbAnon ? null : user.email
      }
      if (!payload.message) throw new Error('Please add a message.')
      const { error } = await supabase.from('feedback').insert([payload])
      if (error) throw error
      setFbMsg(''); setFbCat('bug'); setFbAnon(true)
      setFbNote('Thanks! We received your feedback.')
    } catch (e) {
      setFbNote(e.message || 'Failed to send feedback.')
    } finally {
      setFbSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Profile card */}
      <section className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Logged in as <span className="font-mono">{user.email}</span>
        </p>

        {/* Display name view / edit */}
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Display name (Marketplace)</h2>

          {loadingProfile ? (
            <div className="mt-2 h-9 w-60 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : !editing ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="text-lg text-gray-900 dark:text-gray-100">
                {profile?.display_name || <span className="italic text-gray-500">Not set</span>}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 rounded border hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-sm"
              >
                Edit
              </button>
            </div>
          ) : (
            <form onSubmit={saveDisplayName} className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className="border px-3 py-2 rounded min-w-[220px]
                           border-gray-300 dark:border-gray-700
                           bg-white dark:bg-gray-900
                           text-gray-900 dark:text-gray-100"
                placeholder="Your display name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={40}
                required
              />
              <button
                type="submit"
                disabled={savingName}
                className={`px-3 py-2 rounded text-white ${savingName ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setNameInput(profile?.display_name || '') }}
                className="px-3 py-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </form>
          )}

          {note && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{note}</p>}
        </div>
      </section>

      {/* Listings manager */}
      <section className="mt-6 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My listings</h2>
        <div className="flex flex-wrap gap-2">
          {['All', 'Active', 'Hidden', 'Sold'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f.toLowerCase())}
              className={`px-3 py-1 rounded border
                ${statusFilter === f.toLowerCase()
                  ? 'bg-gray-900 text-white dark:bg-blue-600 dark:text-white border-transparent'
                  : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
        </div>

        {loadingListings ? (
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_,i)=>(
              <div key={i} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-6 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 border rounded p-6 text-center bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="text-3xl">🛒</div>
            <div className="mt-2 font-semibold">No listings found</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Create one from Marketplace and it will appear here.</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {filtered.map(l => (
              <li key={l.id} className="border rounded p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-300 flex justify-between">
                  <span>{new Date(l.created_at).toLocaleString()}</span>
                  <span className="capitalize">{l.status}</span>
                </div>
                <div className="mt-1 font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {l.title} {l.price ? <span className="text-gray-600 dark:text-gray-300">• ${Number(l.price).toFixed(2)}</span> : null}
                </div>
                {l.image_url && (
                  <div className="mt-2 rounded overflow-hidden">
                    <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900">
                      <img
                        src={l.image_url}
                        alt={l.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-gray-700 dark:text-gray-100 whitespace-pre-wrap">{l.description}</p>

                {isOwner(l) && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {l.status !== 'sold' && (
                      <button
                        onClick={() => setStatus(l, 'sold')}
                        className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Mark as sold
                      </button>
                    )}
                    {l.status !== 'hidden' ? (
                      <button
                        onClick={() => setStatus(l, 'hidden')}
                        className="px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700"
                      >
                        Hide
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(l, 'active')}
                        className="px-3 py-1 rounded bg-yellow-700 text-white hover:bg-yellow-800"
                      >
                        Unhide
                      </button>
                    )}
                    <button
                      onClick={() => removeListing(l)}
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Feedback */}
      <section className="mt-6 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Feedback</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Found a bug, have an idea, or need to report abuse? Send it here.
        </p>

        <form onSubmit={submitFeedback} className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm text-gray-700 dark:text-gray-200">
              Category
              <select
                value={fbCat}
                onChange={(e)=>setFbCat(e.target.value)}
                className="ml-2 border px-3 py-2 rounded
                           border-gray-300 dark:border-gray-700
                           bg-white dark:bg-gray-900
                           text-gray-900 dark:text-gray-100"
              >
                <option value="bug">Bug</option>
                <option value="idea">Idea</option>
                <option value="abuse">Abuse</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="ml-auto flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={fbAnon} onChange={(e)=>setFbAnon(e.target.checked)} />
              Send anonymously
            </label>
          </div>

          <textarea
            className="border p-2 rounded min-h-28
                       border-gray-300 dark:border-gray-700
                       bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100"
            placeholder="Describe the issue or suggestion…"
            value={fbMsg}
            onChange={(e)=>setFbMsg(e.target.value)}
            maxLength={2000}
            required
          />

          {!fbAnon && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This submission will be tied to your account <span className="font-mono">{user.email}</span>.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={fbSending}
              className={`px-4 py-2 rounded text-white ${fbSending ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {fbSending ? 'Sending…' : 'Send feedback'}
            </button>
            {fbNote && <span className="text-sm text-gray-700 dark:text-gray-300">{fbNote}</span>}
          </div>
        </form>
      </section>
    </div>
  )
}
