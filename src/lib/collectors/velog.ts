import { PostRaw } from '@/types/post'

const VELOG_GRAPHQL_ENDPOINT = 'https://v2.velog.io/graphql'

// Velog GraphQL 응답의 개별 글 타입
type VelogPost = {
  id: string
  title: string
  short_description: string
  thumbnail: string | null
  released_at: string
  tags: string[]
  url_slug: string
}

// Velog GraphQL 쿼리 - username 기준 게시물 목록 조회 (커서 기반 페이지네이션)
const GET_POSTS_QUERY = `
  query GetPosts($username: String!, $cursor: ID) {
    posts(username: $username, cursor: $cursor) {
      id
      title
      short_description
      thumbnail
      released_at
      tags
      url_slug
    }
  }
`

// Velog API 호출 함수
async function fetchVelogPage(username: string, cursor?: string): Promise<VelogPost[]> {
  const response = await fetch(VELOG_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: GET_POSTS_QUERY,
      variables: { username, cursor },
    }),
  })

  if (!response.ok) {
    throw new Error(`Velog API 요청 실패: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()

  if (json.errors) {
    throw new Error(`Velog GraphQL 오류: ${JSON.stringify(json.errors)}`)
  }

  return json.data?.posts ?? []
}

// Velog 글을 공통 PostRaw 타입으로 변환
function toPostRaw(post: VelogPost, username: string): PostRaw {
  return {
    original_id: post.id,
    source: 'velog',
    title: post.title,
    url: `https://velog.io/@${username}/${post.url_slug}`,
    thumbnail: post.thumbnail ?? undefined,
    summary: post.short_description || undefined,
    tags: post.tags,
    published_at: new Date(post.released_at).toISOString(),
  }
}

// 전체 수집 - 커서 기반 페이지네이션으로 모든 글을 가져옴
export async function fetchAllVelogPosts(username: string): Promise<PostRaw[]> {
  const allPosts: PostRaw[] = []
  let cursor: string | undefined = undefined

  while (true) {
    const posts = await fetchVelogPage(username, cursor)

    // 더 이상 글이 없으면 종료
    if (posts.length === 0) break

    allPosts.push(...posts.map(p => toPostRaw(p, username)))

    // 다음 페이지 커서: 마지막 글의 id를 커서로 사용
    cursor = posts[posts.length - 1].id
  }

  return allPosts
}

// 증분 수집 - lastDate 이후에 작성된 글만 가져옴
export async function fetchVelogPostsSince(username: string, lastDate: Date): Promise<PostRaw[]> {
  const allPosts: PostRaw[] = []
  let cursor: string | undefined = undefined

  while (true) {
    const posts = await fetchVelogPage(username, cursor)

    if (posts.length === 0) break

    // lastDate보다 오래된 글이 나오면 해당 시점까지만 수집 후 종료
    const newPosts = posts.filter(p => new Date(p.released_at) > lastDate)
    allPosts.push(...newPosts.map(p => toPostRaw(p, username)))

    // 현재 페이지에 오래된 글이 섞여 있으면 더 이상 조회 불필요
    if (newPosts.length < posts.length) break

    cursor = posts[posts.length - 1].id
  }

  return allPosts
}
