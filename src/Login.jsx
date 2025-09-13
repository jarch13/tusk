// src/Login.jsx
import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)   // show OTP field after email is sent
  const [code, setCode]   = useState('')
  const [msg, setMsg]     = useState('')
  const [loading, setLoading] = useState(false)

  // ------- DEV login (password) guards & defaults -------
  const DEV_ENABLED =
    import.meta.env.VITE_ENABLE_DEV_PASSWORD_LOGIN === 'true'
  const [devEmail, setDevEmail] = useState(
    import.meta.env.VITE_DEV_EMAIL || ''
  )
  const [devPassword, setDevPassword] = useState(
    import.meta.env.VITE_DEV_PASSWORD || ''
  )
  const [devLoading, setDevLoading] = useState(false)

  async function sendMagic(e) {
    e.preventDefault()
    setMsg(''); setLoading(true)

    // quick CSUF check
    const okDomain =
      email.endsWith('@fullerton.edu') || email.endsWith('@csu.fullerton.edu')
    if (!okDomain) {
      setMsg('You must use a CSUF email to log in.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin, // works for dev & prod
        shouldCreateUser: true,
      },
    })

    if (error) setMsg(error.message)
    else {
      setMsg('We sent you a sign-in email. If the link doesn’t work, enter the 6-digit code from that email below.')
      setSent(true)
    }
    setLoading(false)
  }

  async function verifyCode(e) {
    e.preventDefault()
    setMsg(''); setLoading(true)
    const trimmed = code.trim()

    const { error } = await supabase.auth.verifyOtp({
      type: 'email',         // email-based OTP
      email,
      token: trimmed,
    })

    if (error) setMsg(error.message)
    else setMsg('Signed in — redirecting…')
    setLoading(false)
  }

  async function devLogin(e) {
    e.preventDefault()
    try {
      setMsg('')
      setDevLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword
      })
      if (error) throw error
      setMsg('Signed in as dev user — redirecting…')
    } catch (err) {
      setMsg(err?.message || 'Dev login failed.')
    } finally {
      setDevLoading(false)
    }
  }

  const inputBase =
    "w-full border px-3 py-2 rounded " +
    "border-gray-300 dark:border-gray-700 " +
    "bg-white text-gray-900 " +
    "dark:bg-gray-900 dark:text-gray-100 " +
    "placeholder:text-gray-400 focus:outline-none focus:ring-2 " +
    "focus:ring-blue-500 focus:border-blue-500"

  const buttonBlue = (disabled) =>
    `w-full px-4 py-2 rounded text-white ${disabled
      ? 'bg-gray-400'
      : 'bg-blue-600 hover:bg-blue-700'}`

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm p-6 rounded-lg border bg-white/80 dark:bg-gray-800/70
                      backdrop-blur border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Login to Tusk</h1>

        {/* Email -> send OTP/magic link */}
        <form onSubmit={sendMagic} className="space-y-2">
          <input
            type="email"
            autoComplete="email"
            placeholder="name@csu.fullerton.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputBase}
            required
          />
          <button type="submit" disabled={loading} className={buttonBlue(loading)}>
            {loading ? 'Sending…' : 'Send Login Email'}
          </button>
        </form>

        {/* OTP field appears after we send the email */}
        {sent && (
          <form onSubmit={verifyCode} className="space-y-2 mt-4">
            <input
              inputMode="numeric"
              pattern="\d*"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputBase}
            />
            <button type="submit" disabled={loading} className={buttonBlue(loading)}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {/* Dev password login (guarded by env flag) */}
        {DEV_ENABLED && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              🔧 Dev login (temporary)
            </summary>
            <form onSubmit={devLogin} className="space-y-2 mt-2">
              <input
                type="email"
                placeholder="dev email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                className={inputBase}
              />
              <input
                type="password"
                placeholder="dev password"
                value={devPassword}
                onChange={(e) => setDevPassword(e.target.value)}
                className={inputBase}
              />
              <button type="submit" disabled={devLoading} className={buttonBlue(devLoading)}>
                {devLoading ? 'Signing in…' : 'Sign in (dev)'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Visible only while <code>VITE_ENABLE_DEV_PASSWORD_LOGIN=true</code>. Remove or set to false
                when you’re done, and delete the test user in Supabase.
              </p>
            </form>
          </details>
        )}

        {msg && (
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">{msg}</p>
        )}
      </div>
    </div>
  )
}
