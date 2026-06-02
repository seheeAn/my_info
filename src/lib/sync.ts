import { db } from './db'
import { fetchAllVelogPosts, fetchVelogPostsSince } from './collectors/velog'
import { fetchAllTistoryPosts, fetchTistoryPostsSince } from './collectors/tistory'
import { PostRaw } from '@/types/post'

// 해당 source의 DB 내 가장 최근 published_at을 반환
// 데이터가 없으면 null 반환 → 전체 수집 신호
export async function getLastSyncedDate(source: string): Promise<Date | null> {
  const { data, error } = await db
    .from('posts')
    .select('published_at')
    .eq('source', source)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  return new Date(data.published_at)
}

// 수집한 글 배열을 posts 테이블에 upsert
// (source, original_id) 기준으로 중복 처리
async function upsertPosts(posts: PostRaw[]): Promise<void> {
  if (posts.length === 0) return

  const rows = posts.map(p => ({
    source: p.source,
    original_id: p.original_id,
    title: p.title,
    url: p.url,
    thumbnail: p.thumbnail ?? null,
    summary: p.summary ?? null,
    tags: p.tags,
    published_at: p.published_at,
    is_deleted: false,
  }))

  const { error } = await db
    .from('posts')
    .upsert(rows, { onConflict: 'source,original_id' })

  if (error) {
    throw new Error(`posts upsert 실패 (${rows[0]?.source}): ${error.message}`)
  }
}

// 날짜별 source별 게시물 수를 집계해서 activity_log에 upsert
export async function updateActivityLog(posts: PostRaw[]): Promise<void> {
  if (posts.length === 0) return

  // { "velog::2024-03-15": count } 형태로 집계
  const countMap = new Map<string, number>()

  for (const post of posts) {
    // published_at에서 날짜만 추출 (YYYY-MM-DD)
    const date = post.published_at.slice(0, 10)
    const key = `${post.source}::${date}`
    countMap.set(key, (countMap.get(key) ?? 0) + 1)
  }

  const rows = Array.from(countMap.entries()).map(([key, count]) => {
    const [source, date] = key.split('::')
    return { source, date, count }
  })

  const { error } = await db
    .from('activity_log')
    .upsert(rows, { onConflict: 'date,source' })

  if (error) {
    throw new Error(`activity_log upsert 실패: ${error.message}`)
  }
}

// 단일 source 동기화 처리 (공통 로직)
async function syncSource(
  source: 'velog' | 'tistory',
  fetchAll: () => Promise<PostRaw[]>,
  fetchSince: (lastDate: Date) => Promise<PostRaw[]>,
): Promise<PostRaw[]> {
  const lastDate = await getLastSyncedDate(source)

  // 최초 실행이면 전체 수집, 이후엔 증분 수집
  const posts = lastDate ? await fetchSince(lastDate) : await fetchAll()

  console.log(`[${source}] ${posts.length}개 수집 (lastDate: ${lastDate?.toISOString() ?? '없음'})`)

  await upsertPosts(posts)
  return posts
}

// 전체 동기화 실행 - Velog → Tistory 순서로 처리
export async function syncPosts(): Promise<void> {
  const velogUsername = process.env.NEXT_PUBLIC_VELOG_USERNAME
  const tistoryBlogName = process.env.NEXT_PUBLIC_TISTORY_BLOG_NAME

  if (!velogUsername) throw new Error('NEXT_PUBLIC_VELOG_USERNAME 환경변수가 없습니다')
  if (!tistoryBlogName) throw new Error('NEXT_PUBLIC_TISTORY_BLOG_NAME 환경변수가 없습니다')

  const allNewPosts: PostRaw[] = []

  // Velog 동기화
  const velogPosts = await syncSource(
    'velog',
    () => fetchAllVelogPosts(velogUsername),
    (lastDate) => fetchVelogPostsSince(velogUsername, lastDate),
  )
  allNewPosts.push(...velogPosts)

  // Tistory 동기화
  const tistoryPosts = await syncSource(
    'tistory',
    () => fetchAllTistoryPosts(tistoryBlogName),
    (lastDate) => fetchTistoryPostsSince(tistoryBlogName, lastDate),
  )
  allNewPosts.push(...tistoryPosts)

  // 새로 수집된 글로 activity_log 업데이트
  await updateActivityLog(allNewPosts)

  console.log(`[sync] 완료 - 총 ${allNewPosts.length}개 처리`)
}
