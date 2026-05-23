import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// 서버 전용 Supabase 클라이언트
// ws 패키지로 WebSocket 직접 주입 (Node.js 22 미만 호환)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realtime: { transport: ws as any },
})
