import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// Node.js 22 미만은 WebSocket이 내장되지 않아 ws 패키지로 대체
// 브라우저 환경(Next.js 클라이언트)에서는 globalThis.WebSocket이 있으므로 무시됨
const realtimeOptions = typeof globalThis.WebSocket === 'undefined'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ? { realtime: { transport: ws as any } }
  : {}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, realtimeOptions)
