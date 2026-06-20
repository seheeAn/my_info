import { PostgrestClient } from '@supabase/postgrest-js'

const supabaseUrl = process.env.SUPABASE_URL!

// 서버 스크립트(sync, classifier)는 service_role 키로 동작 → RLS를 우회해서 쓰기 가능
// service_role이 없으면(로컬 등) anon 키로 폴백
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!

// PostgrestClient: REST API만 사용, realtime/WebSocket 없음
// sync.ts, classifier.ts 등 서버 스크립트에서 사용
export const db = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  },
})
