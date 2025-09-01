import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CATEGORIES = ['All','Books','Tech','Furniture','Rides','Sublets','Free']

// Simple deterministic alias from a UUID (keeps identities masked in chat)
function aliasFromId(uuid) {
  const animals = ['Tiger','Falcon','Otter','Panther','Koala','Wolf','Hawk','Dolphin','Panda','Fox','Bear','Owl']
  const adj = ['Calm','Brave','Swift','Quiet','Sunny','Mellow','Bold','Curious','Lucky','Kind','Chill','Zesty']
  let h = 0; for (let i=0;i<uuid.length;i++) h = (h*31 + uuid.charCodeAt(i))>>>0
  return `${adj[h % adj.length]}-${animals[(h>>4) % animals.length]}`
}

export default function Marketplace({ user }) {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('All')
  const [mineOnly, setMineOnly] = useState(false)
  const [posting, setPosting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [catNew, setCatNew] = useState('Books')
  const [image, setImage] = useState(null)
  const [msg, setMsg] = useState('')
  const [chat, setChat] = useState({ open:false, listing:null, convoId:null, messages:[], sending:false, text:'' })

  // Load listings with filters (tries view first, falls back to table)
  async function load() {
    // Try the view with joined display_name
    let q = supabase.from('listings_public').select('*').order('created_at',{ ascending:false }).limit(100)
    if (category !== 'All') q = q.eq('category', category)
    if (!mineOnly) q = q.neq('status','hidden').neq('status','expired')
    else q = q.eq('owner_id', user.id)

    let { data, error } = await q
    if (error) {
      console.warn('listings_public not available, falling back to listings:', error.message)
      // Fallback to raw table
      let q2 = supabase.from('listings').select('*').order('created_at',{ ascending:false }).limit(100)
      if (category !== 'All') q2 = q2.eq('category', category)
      if (!mineOnly) q2 = q2.neq('status','hidden').neq('status','expired')
      else q2 = q2.eq('owner_id', user.id)
      const fb = await q2
      data = fb.data ?? []
    }
    setItems(data ?? [])
  }

  useEffect(() => { load() }, [category, mineOnly]) // reload on filter change

  // Upload to public bucket 'images'
  async function uploadImage(file) {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from('images').upload(path, file, { cacheControl:'3600', upsert:false })
    if (up.error) throw up.error
    return supabase.storage.from('images').getPublicUrl(path).data.publicUrl
  }

  async function createListing(e) {
    e.preventDefault()
    setPosting(true); setMsg('')
    try {
      const image_url = image ? await uploadImage(image) : null
      const { error } = await supabase.from('listings').insert([{
        owner_id: user.id, title, description, category: catNew,
        price: price ? Number(price) : null, image_url
      }])
      if (error) throw error
      setTitle(''); setDescription(''); setPrice(''); setImage(null); setCatNew('Books')
      setMsg('Listing posted!')
      await load()
    } catch (err) {
      setMsg(err.message ?? 'Failed to post listing')
    } finally {
      setPosting(false)
    }
  }

  // Owner actions
  const isOwner = (it) => it.owner_id === user.id
  async function updateStatus(it, status) { await supabase.from('listings').update({ status }).eq('id', it.id); await load() }
  async function remove(it)            { await supabase.from('listings').delete().eq('id', it.id); await load() }

  // --------- Masked contact (in-app chat) ----------
  async function openChat(it) {
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('listing_id', it.id).eq('seller_id', it.owner_id).eq('buyer_id', user.id)
      .maybeSingle()

    let convoId = existing?.id
    if (!convoId) {
      const ins = await supabase.from('conversations').insert([{
        listing_id: it.id, seller_id: it.owner_id, buyer_id: user.id
      }]).select('id').single()
      if (ins.error) { setMsg(ins.error.message); return }
      convoId = ins.data.id
    }

    const m = await supabase.from('messages').select('*').eq('conversation_id', convoId).order('created_at', { ascending: true })
    setChat({ open:true, listing: it, convoId, messages: m.error ? [] : m.data, sending:false, text:'' })

    supabase
      .channel(`msg:${convoId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convoId}` },
        (payload) => {
          setChat((c) => c.open && c.convoId === convoId ? { ...c, messages: [...c.messages, payload.new] } : c)
        }
      )
      .subscribe()
  }

  async function sendMessage() {
    if (!chat.text.trim()) return
    setChat((c)=>({ ...c, sending:true }))
    const { error } = await supabase.from('messages').insert([{
      conversation_id: chat.convoId, sender_id: user.id, body: chat.text.trim()
    }])
    setChat((c)=>({ ...c, text: c.text && !error ? '' : c.text, sending:false }))
  }

  const filteredSummary = useMemo(() => {
    const cat = category === 'All' ? 'All categories' : category
    return `${mineOnly ? 'My listings • ' : ''}${cat}`
  }, [category, mineOnly])

  return (
    <div className="max-w-2xl mx-auto p-4">

      {/* Category pills (horizontal scroll) */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 md:gap-3 w-max">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded border transition-colors
                ${category === c
                  ? 'bg-gray-900 text-white dark:bg-blue-600 dark:text-white border-transparent'
                  : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'
                }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Filter summary + mine-only toggle */}
      <div className="mt-2 flex items-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">{filteredSummary}</p>
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e)=>setMineOnly(e.target.checked)}
          />
          Mine only
        </label>
      </div>

      {/* Create listing */}
      <form
        onSubmit={createListing}
        className="grid gap-2 p-4 border rounded mb-6
                  bg-white dark:bg-gray-800
                  border-gray-200 dark:border-gray-700"
      >
        <h3 className="font-semibold">Post a listing</h3>

        {/* Title */}
        <input
          className="w-full text-base border p-2 rounded
                     border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-900
                     text-gray-900 dark:text-gray-100
                     placeholder:text-gray-400"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Description */}
        <textarea
          className="w-full text-base min-h-28 border p-2 rounded
                     border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-900
                     text-gray-900 dark:text-gray-100
                     placeholder:text-gray-400"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Row: category / price / file */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          <select
            value={catNew}
            onChange={(e) => setCatNew(e.target.value)}
            className="w-full border p-2 rounded
                       border-gray-300 dark:border-gray-700
                       bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100"
          >
            {CATEGORIES.filter(c => c !== 'All').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (optional)"
            inputMode="decimal"
            pattern="^\\d+(\\.\\d{1,2})?$"
            className="w-full border p-2 rounded
                       border-gray-300 dark:border-gray-700
                       bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100
                       placeholder:text-gray-400"
          />

          <div className="w-full">
            <input
              type="file"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="block w-full border p-2 rounded
                         border-gray-300 dark:border-gray-700
                         bg-white dark:bg-gray-900
                         text-gray-900 dark:text-gray-100"
              accept="image/*"
            />
          </div>
        </div>

        <button
          disabled={posting}
          className={`px-4 py-2 rounded text-white ${posting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {posting ? 'Posting…' : 'Post Listing'}
        </button>

        {msg && <p className="text-sm text-gray-600 dark:text-gray-300">{msg}</p>}
      </form>

      {/* Feed */}
      <ul className="grid gap-3">
        {items.map(it => (
          <li
            key={it.id}
            className="border rounded p-3
                       bg-white dark:bg-gray-800
                       border-gray-200 dark:border-gray-700"
          >
            <div className="text-sm text-gray-500 dark:text-gray-300 flex justify-between">
              <span>
                {it.category} • {new Date(it.created_at).toLocaleString()} • seller: <b>{it.owner_name || aliasFromId(it.owner_id)}</b>
              </span>
              <span className="capitalize">{it.status}</span>
            </div>

            <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {it.title} {it.price ? `• $${Number(it.price).toFixed(2)}` : ''}
            </div>

            {it.image_url && (
              <img src={it.image_url} alt="" className="mt-2 rounded max-h-64 object-cover w-full" />
            )}

            <p className="mt-2 text-gray-700 dark:text-gray-100 whitespace-pre-wrap">{it.description}</p>

            <div className="mt-3 flex gap-2 flex-wrap">
              {!isOwner(it) && it.status === 'active' && (
                <button
                  onClick={()=>openChat(it)}
                  className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                  Contact seller (chat)
                </button>
              )}

              {isOwner(it) && (
                <>
                  {it.status !== 'sold' && (
                    <button
                      onClick={()=>updateStatus(it,'sold')}
                      className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                      Mark as sold
                    </button>
                  )}
                  {it.status !== 'hidden' ? (
                    <button
                      onClick={()=>updateStatus(it,'hidden')}
                      className="px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700">
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={()=>updateStatus(it,'active')}
                      className="px-3 py-1 rounded bg-yellow-700 text-white hover:bg-yellow-800">
                      Unhide
                    </button>
                  )}
                  <button
                    onClick={()=>remove(it)}
                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Chat Modal */}
      {chat.open && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">
                Chat about: <span className="text-gray-700 dark:text-gray-200">{chat.listing.title}</span>
              </div>
              <button onClick={()=>setChat({ open:false })} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">Close</button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-300 mb-2">
              You: <b>{aliasFromId(user.id)}</b> • Seller: <b>{aliasFromId(chat.listing.owner_id)}</b>
            </div>
            <div className="border rounded p-2 h-72 overflow-y-auto bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              {chat.messages.map(m => (
                <div key={m.id} className={`mb-2 ${m.sender_id===user.id ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg ${m.sender_id===user.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700'}`}>
                    <div className="text-[11px] opacity-70 mb-0.5">
                      {m.sender_id===user.id ? aliasFromId(user.id) : 'Seller'}
                    </div>
                    <div>{m.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="border rounded flex-1 px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                placeholder="Type a message…"
                value={chat.text}
                onChange={(e)=>setChat((c)=>({ ...c, text: e.target.value }))}
              />
              <button
                disabled={chat.sending}
                onClick={sendMessage}
                className={`px-3 py-2 rounded text-white ${chat.sending ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
