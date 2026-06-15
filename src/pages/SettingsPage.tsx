import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { GlassCard } from '../components/GlassCard'
import { NotConnectedBanner } from '../components/NotConnectedBanner'
import { OrbBackground } from '../components/OrbBackground'
import { useProfile } from '../hooks/useProfile'
import { usePushSubscription } from '../hooks/usePushSubscription'
import { supabase, isConfigured } from '../lib/supabase'

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

interface SettingsPageProps {
  user: User
}

export function SettingsPage({ user }: SettingsPageProps) {
  const navigate = useNavigate()
  const { profile, loading: profileLoading, refetch } = useProfile(user)
  const { isSubscribed, permission, subscribe } = usePushSubscription(user)

  const [nudgeTimes, setNudgeTimes] = useState<string[]>(['08:00', '13:00', '18:00', '21:00'])
  const [timezone, setTimezone] = useState('UTC')
  const [nudgesEnabled, setNudgesEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setNudgeTimes(profile.nudge_times ?? ['08:00', '13:00', '18:00', '21:00'])
      setTimezone(profile.timezone ?? 'UTC')
      setNudgesEnabled(profile.nudges_enabled ?? true)
    }
  }, [profile])

  const handleSave = async () => {
    if (!isConfigured || !profile) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        nudge_times: nudgeTimes,
        timezone,
        nudges_enabled: nudgesEnabled,
        start_date: profile.start_date,
      },
      { onConflict: 'user_id' }
    )

    if (!error) {
      setSaved(true)
      refetch()
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut()
    }
    navigate('/login')
  }

  const updateNudgeTime = (index: number, value: string) => {
    const newTimes = [...nudgeTimes]
    newTimes[index] = value
    setNudgeTimes(newTimes)
  }

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ backgroundColor: '#F2ECE0' }}
    >
      {!isConfigured && <NotConnectedBanner />}
      <OrbBackground area="People" />

      <div
        className="relative z-10 flex flex-col px-6 py-8"
        style={{ paddingTop: !isConfigured ? '3rem' : '2rem' }}
      >
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/today" className="font-body text-sm" style={{ color: '#9A8F7E' }}>
            Back
          </Link>
        </div>

        <h1
          className="font-display text-4xl font-light mb-8"
          style={{ color: '#2A251D' }}
        >
          Settings
        </h1>

        {profileLoading ? (
          <div className="flex justify-center py-12">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: '#2A251D', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Nudge times */}
            <GlassCard>
              <h2
                className="font-display text-lg font-light mb-4"
                style={{ color: '#2A251D' }}
              >
                Nudge times
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {nudgeTimes.map((time, i) => (
                  <div key={i}>
                    <label
                      htmlFor={`nudge-time-${i}`}
                      className="font-body text-xs mb-1 block"
                      style={{ color: '#9A8F7E' }}
                    >
                      Nudge {i + 1}
                    </label>
                    <input
                      id={`nudge-time-${i}`}
                      type="time"
                      value={time}
                      onChange={(e) => updateNudgeTime(i, e.target.value)}
                      className="w-full py-2 px-3 rounded-xl font-body text-sm outline-none border"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.6)',
                        borderColor: 'rgba(154, 143, 126, 0.3)',
                        color: '#2A251D',
                      }}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Timezone */}
            <GlassCard>
              <h2
                className="font-display text-lg font-light mb-4"
                style={{ color: '#2A251D' }}
              >
                Timezone
              </h2>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full py-2 px-3 rounded-xl font-body text-sm outline-none border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(154, 143, 126, 0.3)',
                  color: '#2A251D',
                }}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
                {!COMMON_TIMEZONES.includes(timezone) && (
                  <option value={timezone}>{timezone}</option>
                )}
              </select>
            </GlassCard>

            {/* Nudges enabled toggle */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="font-display text-lg font-light"
                    style={{ color: '#2A251D' }}
                  >
                    Push nudges
                  </h2>
                  <p className="font-body text-xs mt-0.5" style={{ color: '#9A8F7E' }}>
                    Get reminded at your nudge times
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={nudgesEnabled}
                  onClick={() => setNudgesEnabled(!nudgesEnabled)}
                  className="relative w-12 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                  style={{
                    backgroundColor: nudgesEnabled ? '#2A251D' : 'rgba(42,37,29,0.2)',
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                    style={{
                      transform: nudgesEnabled ? 'translateX(24px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>
            </GlassCard>

            {/* Push notification section */}
            <GlassCard>
              <h2
                className="font-display text-lg font-light mb-2"
                style={{ color: '#2A251D' }}
              >
                Notifications
              </h2>
              <p className="font-body text-xs mb-4" style={{ color: '#9A8F7E' }}>
                Permission:{' '}
                <span style={{ color: '#2A251D' }}>
                  {typeof Notification !== 'undefined' ? permission : 'not supported'}
                </span>
              </p>
              {!isSubscribed ? (
                <button
                  onClick={subscribe}
                  disabled={!isConfigured}
                  className="w-full py-3 px-4 rounded-xl font-body font-medium text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: '#2A251D', color: '#F2ECE0' }}
                >
                  Subscribe to push
                </button>
              ) : (
                <p className="font-body text-sm" style={{ color: '#9A8F7E' }}>
                  Push notifications active
                </p>
              )}
            </GlassCard>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || !isConfigured || !profile}
              className="w-full py-3 px-4 rounded-xl font-body font-medium text-sm transition-opacity hover:opacity-80 active:opacity-70 disabled:opacity-40"
              style={{ backgroundColor: '#2A251D', color: '#F2ECE0' }}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save settings'}
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl font-body font-medium text-sm border transition-opacity hover:opacity-70"
              style={{
                borderColor: 'rgba(42, 37, 29, 0.3)',
                color: '#2A251D',
                backgroundColor: 'transparent',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
