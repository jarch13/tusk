// src/pages/RequireAdmin.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient' // <-- fixed path (one level up)

export default function RequireAdmin({ session, children }) {
  const [state, setState] = useState('loading') // 'loading' | 'ok' | 'deny'

  useEffect(() => {
    let canceled = false
    ;(async () => {
      // no session → deny
      if (!session?.user?.id) {
        if (!canceled) setState('deny')
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!canceled) {
        if (error) setState('deny')
        else setState(data?.is_admin ? 'ok' : 'deny')
      }
    })()
    return () => { canceled = true }
  }, [session?.user?.id])

  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] grid place-items-center text-gray-500 dark:text-gray-400">
        Checking access…
      </div>
    )
  }

  if (state === 'deny') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-8xl md:text-9xl">💩</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Nice try! Admins only beyond this point.
        </h1>
        <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-300">
          If you think this is a mistake, ask a Tusk admin to add you. Otherwise,
          enjoy this friendly emoji and head back to safer pastures.
        </p>
        <a
          href="/"
          className="mt-6 inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Take me home
        </a>
      </div>
    )
  }

  return children
}
