import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

interface PushSubscriptionState {
  isSubscribed: boolean
  permission: NotificationPermission
  subscribe: () => Promise<void>
}

export function usePushSubscription(user: User | null): PushSubscriptionState {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  useEffect(() => {
    if (!pushSupported) return

    setPermission(Notification.permission)

    // Check if already subscribed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setIsSubscribed(!!sub)
        })
        .catch(() => {})
    }
  }, [pushSupported])

  const subscribe = async (): Promise<void> => {
    if (!pushSupported || !isConfigured || !user || !VAPID_PUBLIC_KEY) return

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      })

      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh'))
      const auth = arrayBufferToBase64(subscription.getKey('auth'))

      // Upsert into database
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth_key: auth,
        },
        { onConflict: 'user_id,endpoint' }
      )

      if (!error) {
        setIsSubscribed(true)
      }
    } catch {
      // Gracefully degrade — don't crash the app
    }
  }

  return { isSubscribed, permission, subscribe }
}
