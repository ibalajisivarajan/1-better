export interface Profile {
  user_id: string
  start_date: string  // ISO date 'YYYY-MM-DD'
  timezone: string
  nudge_times: string[]  // ['08:00','13:00','18:00','21:00']
  nudges_enabled: boolean
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  done_date: string
  week_number: number
  mission_area: string
  mission_action: string
  done_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

export interface Mission {
  week_number: number
  area: 'Body' | 'Mind' | 'Work' | 'People' | 'Inner'
  action: string
  why: string
  micro: string
}
