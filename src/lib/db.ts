import { PostgrestClient } from '@supabase/postgrest-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// PostgrestClient: REST API만 사용, realtime/WebSocket 없음
// sync.ts, classifier.ts 등 서버 스크립트에서 사용
export const db = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
})
