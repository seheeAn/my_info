// GitHub GraphQL API로 1년치 잔디(contribution calendar) 데이터를 조회
// ActivityGrid 컴포넌트에 바로 넘길 수 있는 형태로 반환

type ContributionDay = {
  date: string          // 'YYYY-MM-DD'
  contributionCount: number
}

type GraphQLResponse = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: {
            contributionDays: ContributionDay[]
          }[]
        }
      }
    }
  }
  errors?: { message: string }[]
}

const QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`

export async function fetchGitHubContributions(): Promise<{ date: string; count: number }[]> {
  const username = process.env.NEXT_PUBLIC_GITHUB_USERNAME
  const token    = process.env.NEXT_PUBLIC_GITHUB_TOKEN

  if (!username || !token) {
    console.warn('[github] NEXT_PUBLIC_GITHUB_USERNAME 또는 NEXT_PUBLIC_GITHUB_TOKEN이 없습니다')
    return []
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: QUERY, variables: { username } }),
    // Next.js 캐시: 하루 단위로 재검증
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    throw new Error(`GitHub API 오류: ${res.status} ${res.statusText}`)
  }

  const json: GraphQLResponse = await res.json()

  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL 오류: ${json.errors[0].message}`)
  }

  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? []

  // weeks[n].contributionDays 배열을 flat하게 펼쳐서 반환
  return weeks.flatMap(week =>
    week.contributionDays.map(day => ({
      date: day.date,
      count: day.contributionCount,
    }))
  )
}
