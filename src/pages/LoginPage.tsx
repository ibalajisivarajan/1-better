import { useState } from 'react'
import { OrbBackground } from '../components/OrbBackground'
import { supabase, isConfigured } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    if (!isConfigured) return
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/today',
      },
    })
    if (error) setError(error.message)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured || !email.trim()) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + '/today',
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMagicSent(true)
    }
    setLoading(false)
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#F2ECE0' }}
    >
      <OrbBackground area="Mind" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Heading */}
        <div className="text-center">
          <h1
            className="font-display text-5xl font-light mb-3"
            style={{ color: '#2A251D' }}
          >
            1% Better
          </h1>
          <p className="font-body text-base" style={{ color: '#9A8F7E' }}>
            One habit. Seven days. Fifty-two weeks.
          </p>
        </div>

        {magicSent ? (
          <div
            className="rounded-2xl bg-white/70 backdrop-blur-md shadow-sm p-6 w-full text-center"
          >
            <h2
              className="font-display text-xl mb-2"
              style={{ color: '#2A251D' }}
            >
              Check your email
            </h2>
            <p className="font-body text-sm" style={{ color: '#9A8F7E' }}>
              We sent a magic link to{' '}
              <strong style={{ color: '#2A251D' }}>{email}</strong>
            </p>
            <button
              onClick={() => { setMagicSent(false); setEmail('') }}
              className="mt-4 font-body text-sm underline"
              style={{ color: '#9A8F7E' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-sm p-6 w-full flex flex-col gap-4">
            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={!isConfigured}
              className="w-full py-3 px-4 rounded-xl font-body font-medium text-sm transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-40"
              style={{ backgroundColor: '#2A251D', color: '#F2ECE0' }}
            >
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(154, 143, 126, 0.3)' }} />
              <span className="font-body text-xs" style={{ color: '#9A8F7E' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(154, 143, 126, 0.3)' }} />
            </div>

            {/* Magic link form */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full py-3 px-4 rounded-xl font-body text-sm outline-none border focus:ring-2 focus:ring-ink/20 transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(154, 143, 126, 0.3)',
                  color: '#2A251D',
                }}
              />
              <button
                type="submit"
                disabled={!isConfigured || loading || !email.trim()}
                className="w-full py-3 px-4 rounded-xl font-body font-medium text-sm transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-40"
                style={{ backgroundColor: '#2A251D', color: '#F2ECE0' }}
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>

            {error && (
              <p className="font-body text-xs text-center" style={{ color: '#FF9E7D' }}>
                {error}
              </p>
            )}

            {!isConfigured && (
              <p className="font-body text-xs text-center" style={{ color: '#9A8F7E' }}>
                Configure Supabase env vars to enable auth
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
