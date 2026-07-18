import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let client = null
let sessionPromise = null

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) throw new Error('Der Online-Dienst ist noch nicht konfiguriert.')
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  return client
}

export async function ensureSupabaseSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (data.session) return data.session
      const signedIn = await supabase.auth.signInAnonymously()
      if (signedIn.error) throw signedIn.error
      return signedIn.data.session
    })().catch((error) => {
      sessionPromise = null
      throw error
    })
  }
  return sessionPromise
}
