import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from './db'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// gemini-2.5-flash: 무료 티어 지원 (gemini-2.0-flash는 2026.06.01 종료)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

// 확정된 카테고리 목록
// Work: 기술/업무 관련 / Life: 개인 관심사 관련
const CATEGORIES = [
  '통계/분석', '시각화', 'AI/ML', '자동화', '개발',  // Work
  '게임', '여행/맛집', '독서', '일상',               // Life
  '기타',                                             // 미분류
] as const

const CATEGORY_LIST = CATEGORIES.join(', ')

const PROMPT_TEMPLATE = `너는 블로그 글을 카테고리로 분류하는 분류기야.
글 제목과 태그 목록을 보고 아래 카테고리 중 하나로 분류해.
[${CATEGORY_LIST}]
입력은 JSON 배열로 주어지고, 응답도 같은 순서의 JSON 배열로만 답해.
다른 텍스트나 설명 없이 JSON 배열만 응답할 것.
예시 입력: [{"id":"1","title":"Python 데이터 분석","tags":["python","pandas"]}]
예시 출력: ["통계/분석"]

분류할 글 목록:
`

type PostForClassify = {
  id: string
  title: string
  tags: string[]
}

// Gemini API로 배치 분류 후 DB 업데이트
export async function classifyBatch(posts: PostForClassify[]): Promise<void> {
  if (posts.length === 0) return

  const inputJson = JSON.stringify(
    posts.map(p => ({ id: p.id, title: p.title, tags: p.tags }))
  )

  const result = await model.generateContent(PROMPT_TEMPLATE + inputJson)
  const responseText = result.response.text().trim()

  // Gemini가 markdown 코드블록으로 감쌀 수 있어서 제거
  const cleaned = responseText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()

  let categories: string[]
  try {
    categories = JSON.parse(cleaned)
  } catch {
    throw new Error(`Gemini 응답 파싱 실패: ${responseText}`)
  }

  if (!Array.isArray(categories) || categories.length !== posts.length) {
    throw new Error(`Gemini 응답 개수 불일치: 요청 ${posts.length}개, 응답 ${categories.length}개`)
  }

  // DB 업데이트 - 각 글에 분류된 카테고리 저장
  const updates = posts.map((post, i) => ({
    id: post.id,
    // 유효한 카테고리가 아니면 '기타'로 처리
    category: (CATEGORIES as readonly string[]).includes(categories[i]) ? categories[i] : '기타',
  }))

  for (const { id, category } of updates) {
    const { error } = await db
      .from('posts')
      .update({ category })
      .eq('id', id)

    if (error) {
      throw new Error(`category 업데이트 실패 (id: ${id}): ${error.message}`)
    }
  }

  console.log(`[classifier] ${posts.length}개 분류 완료`)
}

// category가 null인 글 전체를 20개씩 배치로 분류
export async function classifyNewPosts(): Promise<void> {
  const { data, error } = await db
    .from('posts')
    .select('id, title, tags')
    .is('category', null)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })

  if (error) throw new Error(`미분류 글 조회 실패: ${error.message}`)
  if (!data || data.length === 0) {
    console.log('[classifier] 분류할 글이 없습니다')
    return
  }

  console.log(`[classifier] 총 ${data.length}개 분류 시작`)

  const BATCH_SIZE = 20

  // 20개씩 나눠서 순차 처리
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    await classifyBatch(batch)
    console.log(`[classifier] ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} 처리됨`)
  }

  console.log('[classifier] 전체 분류 완료')
}
