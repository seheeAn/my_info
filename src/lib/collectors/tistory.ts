import { XMLParser } from 'fast-xml-parser'
import { PostRaw } from '@/types/post'

// RSS 피드의 개별 아이템 타입 (fast-xml-parser 파싱 결과)
type RssItem = {
  title: string
  link: string
  pubDate: string
  description?: string
  category?: string | string[]  // 카테고리가 여러 개일 수도 있음
  guid?: string | { '#text': string }
}

// RSS XML을 파싱해서 아이템 목록을 반환
async function fetchRssFeed(blogName: string): Promise<RssItem[]> {
  const rssUrl = `https://${blogName}.tistory.com/rss`
  const response = await fetch(rssUrl)

  if (!response.ok) {
    throw new Error(`Tistory RSS 요청 실패: ${response.status} ${response.statusText}`)
  }

  const xmlText = await response.text()

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // CDATA 섹션도 텍스트로 파싱
    cdataPropName: '__cdata',
    isArray: (name) => name === 'item', // item은 항상 배열로 처리
  })

  const parsed = parser.parse(xmlText)
  const items: RssItem[] = parsed?.rss?.channel?.item ?? []

  return items
}

// 글 원문 링크에서 고유 ID 추출 (URL 마지막 숫자 경로)
function extractPostId(link: string): string {
  // https://example.tistory.com/123 → "123"
  const match = link.match(/\/(\d+)\/?$/)
  return match ? match[1] : link
}

// description HTML에서 순수 텍스트만 추출 (요약 용도)
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')  // HTML 태그 제거
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')      // 연속 공백 정리
    .trim()
    .slice(0, 300)             // 300자 이내로 요약
}

// RSS 아이템을 공통 PostRaw 타입으로 변환
function toPostRaw(item: RssItem): PostRaw {
  // 카테고리는 문자열 또는 배열로 올 수 있음 → 태그 배열로 통합
  const rawCategory = item.category
  const tags: string[] = rawCategory
    ? Array.isArray(rawCategory)
      ? rawCategory
      : [rawCategory]
    : []

  const description = item.description ?? ''
  const summary = typeof description === 'string' ? stripHtml(description) : undefined

  return {
    original_id: extractPostId(item.link),
    source: 'tistory',
    title: item.title,
    url: item.link,
    thumbnail: undefined,        // Tistory RSS에는 썸네일 정보가 없음
    summary: summary || undefined,
    tags,
    published_at: new Date(item.pubDate).toISOString(),
  }
}

// 전체 수집 - RSS 피드에 있는 모든 글 가져옴
// Tistory RSS는 최신 50개만 제공하므로 전체 아카이브는 RSS 범위 내로 제한됨
export async function fetchAllTistoryPosts(blogName: string): Promise<PostRaw[]> {
  const items = await fetchRssFeed(blogName)
  return items.map(toPostRaw)
}

// 증분 수집 - lastDate 이후에 작성된 글만 반환
export async function fetchTistoryPostsSince(blogName: string, lastDate: Date): Promise<PostRaw[]> {
  const items = await fetchRssFeed(blogName)
  return items
    .filter(item => new Date(item.pubDate) > lastDate)
    .map(toPostRaw)
}
