import { syncPosts } from '../lib/sync'
import { classifyNewPosts } from '../lib/classifier'

// GitHub Actions에서 실행되는 진입점 스크립트
// 실행 순서: 1) 글 동기화 → 2) 카테고리 분류
async function main() {
  console.log('=== 동기화 시작 ===')

  console.log('\n[1/2] 글 동기화 중...')
  await syncPosts()

  console.log('\n[2/2] 카테고리 분류 중...')
  await classifyNewPosts()

  console.log('\n=== 완료 ===')
}

main().catch(err => {
  console.error('실행 실패:', err)
  process.exit(1)
})
