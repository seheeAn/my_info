// Node.js 22 미만에서 globalThis.WebSocket 폴리필
// tsx 실행 전에 --require로 가장 먼저 로드됨
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws')
}
