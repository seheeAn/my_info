import { db } from './db'

// Supabase activity_log 테이블에서 최근 1년치 데이터 조회
// source: 'velog' | 'tistory'
export async function fetchActivityLog(
  source: 'velog' | 'tistory'
): Promise<{ date: string; count: number }[]> {
  // 1년 전 날짜 계산
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const fromDate = oneYearAgo.toISOString().split('T')[0]

  const { data, error } = await db
    .from('activity_log')
    .select('date, count')
    .eq('source', source)
    .gte('date', fromDate)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(`activity_log 조회 실패 (${source}): ${error.message}`)
  }

  return (data ?? []).map(row => ({
    date: row.date,
    count: row.count,
  }))
}
