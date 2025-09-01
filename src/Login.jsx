import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState('')
  const [awaitingCode, setAwaitingCode] = useState(false)

  const normalizedEmail = () => email.trim().toLowerCase()

  const requestLinkOrCode = async (e) => {
    e.preventDefault()
    setMessage('')

    const eaddr = normalizedEmail()
    if (!eaddr.endsWith('@fullerton.edu') && !eaddr.endsWith('@csu.fullerton.edu')) {
      setMessage('You must use a CSUF email to log in.')
      return
    }

    setSending(true)
    const { data, error } = await supabase.auth.signInWithOtp({
      email: eaddr,
      options: { emailRedirectTo: window.location.origin }
    })
    console.log('signInWithOtp:', { data, error })

    if (error) {
      setMessage(error.message || 'Login failed. Please try again.')
    } else {
      setMessage('We sent you a sign-in email. If the link doesn’t work, enter the 6-digit code from that email below.')
      setAwaitingCode(true)
    }
    setSending(false)
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    setMessage('')

    const eaddr = normalizedEmail()
    if (!code) {
      setMessage('Enter the 6-digit code from the email.')
      return
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: eaddr,
      token: code.trim(),
      type: 'email' // verify a code (not a magic link)
    })
    console.log('verifyOtp:', { data, error })

    if (error) {
      setMessage(error.message || 'Invalid or expired code. Request a new one.')
    } else {
      setMessage('Signed in!')
      // App.jsx listener will switch the UI to the logged-in state
    }
  }

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-2xl font-bold mb-4">Login to Tusk</h1>

      <form onSubmit={requestLinkOrCode} className="flex flex-col gap-2 w-80 mb-4">
        <input
          type="email"
          placeholder="name@csu.fullerton.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-base border p-2 rounded
                     border-gray-300 dark:border-gray-700
                     bg-white dark:bg-gray-900
                     text-gray-900 dark:text-gray-100
                     placeholder:text-gray-400"
          required
        />
        <button
          type="submit"
          disabled={sending}
          className={`text-white px-4 py-2 rounded ${sending ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {sending ? 'Sending…' : 'Send Login Email'}
        </button>
      </form>

      {awaitingCode && (
        <form onSubmit={verifyCode} className="flex items-center gap-2 w-80">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="border px-3 py-2 rounded flex-1"
          />
          <button type="submit" className="px-3 py-2 rounded bg-gray-900 text-white">Verify</button>
        </form>
      )}

      {message && <p className="mt-4 text-sm text-gray-700 text-center w-80">{message}</p>}

      <p className="mt-6 text-xs text-gray-500 w-80 text-center">
        Tip: Some campus email security tools auto-click login links. If your link says it’s expired,
        use the 6-digit code instead.
      </p>
    </div>
  )
}
