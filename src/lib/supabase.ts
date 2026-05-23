import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// 서버 전용 Supabase 클라이언트 (환경변수 SUPABASE_URL, SUPABASE_ANON_KEY 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
