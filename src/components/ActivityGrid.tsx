'use client'

import { useState } from 'react'

// ─── 타입 정의 ────────────────────────────────────────────────
type ActivityData = {
  date: string   // 'YYYY-MM-DD' 형식
  count: number
}

type ColorScheme = 'green' | 'blue' | 'orange'

type Props = {
  data: ActivityData[]
  label: string
  colorScheme: ColorScheme
}

// ─── 색상 강도 5단계 (플랫폼별 테마) ─────────────────────────
const COLOR_LEVELS: Record<ColorScheme, string[]> = {
  green:  ['bg-gray-100', 'bg-green-200',  'bg-green-400',  'bg-green-600',  'bg-green-800'],
  blue:   ['bg-gray-100', 'bg-blue-200',   'bg-blue-400',   'bg-blue-600',   'bg-blue-800'],
  orange: ['bg-gray-100', 'bg-orange-200', 'bg-orange-400', 'bg-orange-600', 'bg-orange-800'],
}

// count → 색상 레벨 변환 (0~4)
function getLevel(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

// 최근 52주 날짜 그리드 생성 (월요일 시작 기준)
// 반환값: weeks[week][day] = 'YYYY-MM-DD'
function buildGrid(): string[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 364일 전부터 시작
  const start = new Date(today)
  start.setDate(today.getDate() - 363)

  // 해당 주의 월요일로 정렬
  const dow = start.getDay() // 0=일, 1=월 ... 6=토
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))

  const weeks: string[][] = []
  const cursor = new Date(start)

  while (cursor <= today) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      week.push(cursor.toISOString().split('T')[0])
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

// 각 주의 첫 날짜 기준으로 월이 바뀌는 시점의 레이블 계산
function buildMonthLabels(weeks: string[][]): { weekIndex: number; label: string }[] {
  const labels: { weekIndex: number; label: string }[] = []
  let lastMonth = -1

  weeks.forEach((week, i) => {
    const month = new Date(week[0]).getMonth()
    if (month !== lastMonth) {
      labels.push({ weekIndex: i, label: `${month + 1}월` })
      lastMonth = month
    }
  })

  return labels
}

// ─── 컴포넌트 ─────────────────────────────────────────────────
export default function ActivityGrid({ data, label, colorScheme }: Props) {
  const [tooltip, setTooltip] = useState<{
    date: string
    count: number
    x: number
    y: number
  } | null>(null)

  const grid = buildGrid()
  const monthLabels = buildMonthLabels(grid)
  const colors = COLOR_LEVELS[colorScheme]

  // date → count 빠른 조회용 Map
  const dataMap = new Map(data.map(d => [d.date, d.count]))

  // 좌측 요일 레이블 (월/수/금만 표시, 나머지는 빈칸)
  const DAY_LABELS = ['월', '', '수', '', '금', '', '']

  // 셀 하나의 크기 (px) — gap 포함 계산에 사용
  const CELL_SIZE = 12  // w-3 h-3 = 12px
  const CELL_GAP  = 3   // gap-[3px]
  const STEP = CELL_SIZE + CELL_GAP  // 15px

  return (
    <div className="inline-flex flex-col gap-2 select-none">
      {/* 플랫폼 레이블 */}
      <div className="text-sm font-semibold text-gray-700">{label}</div>

      <div className="flex gap-2">
        {/* 요일 레이블 */}
        <div className="flex flex-col gap-[3px] mt-5">
          {DAY_LABELS.map((day, i) => (
            <div
              key={i}
              className="flex items-center justify-end"
              style={{ height: CELL_SIZE, width: 16 }}
            >
              <span className="text-[9px] text-gray-400">{day}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {/* 월 레이블 */}
          <div className="relative" style={{ height: 16 }}>
            {monthLabels.map(({ weekIndex, label: monthLabel }) => (
              <span
                key={weekIndex}
                className="absolute text-[9px] text-gray-400"
                style={{ left: weekIndex * STEP }}
              >
                {monthLabel}
              </span>
            ))}
          </div>

          {/* 잔디 그리드 */}
          <div className="relative">
            <div className="flex gap-[3px]">
              {grid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((date, di) => {
                    const count = dataMap.get(date) ?? 0
                    const level = getLevel(count)
                    return (
                      <div
                        key={di}
                        className={`rounded-sm cursor-default ${colors[level]}`}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        onMouseEnter={e => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltip({ date, count, x: rect.left + rect.width / 2, y: rect.top })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 툴팁 */}
            {tooltip && (
              <div
                className="fixed z-50 bg-gray-800 text-white text-[11px] rounded px-2 py-1 pointer-events-none whitespace-nowrap"
                style={{
                  left: tooltip.x,
                  top: tooltip.y - 4,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                {tooltip.date} — {tooltip.count}개
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Less ~ More 범례 */}
      <div className="flex items-center gap-1 ml-[26px]">
        <span className="text-[9px] text-gray-400">Less</span>
        {colors.map((color, i) => (
          <div
            key={i}
            className={`rounded-sm ${color}`}
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
          />
        ))}
        <span className="text-[9px] text-gray-400">More</span>
      </div>
    </div>
  )
}
