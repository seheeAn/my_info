import { createClient } from '@supabase/supabase-js'

// Node.js 22 미만은 globalThis.WebSocket이 없어서 supabase realtime이 에러를 던짐
// createClient 호출 전에 ws 패키지로 폴리필
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.WebSocket = require('ws')
}

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
