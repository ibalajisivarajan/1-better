import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from '../lib/supabase'
import type { Profile } from '../types'

interface ProfileState {
  profile: Profile | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProfile(user: User | null): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrCreate = useCallback(async () => {
    if (!isConfigured || !user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Try to fetch existing profile
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found — that's expected for new users
        setError(fetchError.message)
        setLoading(false)
        return
      }

      if (data) {
        setProfile(data as Profile)
        setLoading(false)
        return
      }

      // No profile found — create one
      const today = new Date().toISOString().split('T')[0]
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const newProfile: Omit<Profile, 'created_at'> = {
        user_id: user.id,
        start_date: today,
        timezone,
        nudge_times: ['08:00', '13:00', '18:00', '21:00'],
        nudges_enabled: true,
      }

      const { data: created, error: upsertError } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'user_id' })
        .select()
        .single()

      if (upsertError) {
        setError(upsertError.message)
      } else {
        setProfile(created as Profile)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchOrCreate()
  }, [fetchOrCreate])

  return { profile, loading, error, refetch: fetchOrCreate }
}
