// src/pages/Profile.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Profile({ user }) {
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name || '')
    })
  }, [user.id])

  async function save(e) {
    e.preventDefault()
    setMsg('')
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: name || null }, { onConflict: 'id' })
    setMsg(error ? error.message : 'Saved!')
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-3">Profile</h2>
      <form onSubmit={save} className="grid gap-2">
        <input className="border p-2 rounded
             border-gray-300 dark:border-gray-700
             bg-white dark:bg-gray-900
             text-gray-900 dark:text-gray-100
             placeholder:text-gray-400" placeholder="Display name (optional)"
               value={name} onChange={e=>setName(e.target.value)} />
        <button className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </form>
    </div>
  )
}
