// 수집된 글의 공통 타입 - Velog와 Tistory 양쪽에서 이 형태로 반환됨
export type PostRaw = {
  original_id: string              // 플랫폼 고유 ID
  source: 'velog' | 'tistory'     // 출처 플랫폼
  title: string                    // 글 제목
  url: string                      // 원문 URL
  thumbnail?: string               // 썸네일 이미지 URL (없을 수 있음)
  summary?: string                 // 글 요약
  tags: string[]                   // 태그 목록
  published_at: string             // 게시일 (ISO 8601 형식)
}
