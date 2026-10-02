// 끼니별 커스텀 라인 아이콘. 이모지 대신 사용해 업무용 톤을 유지한다.

const shared = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function SunriseIcon(props) {
  return (
    <svg {...shared} {...props}>
      <path d="M4 18h16" />
      <path d="M6.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M12 8.5V4" />
      <path d="M7.8 10.3 5.6 8.1" />
      <path d="M16.2 10.3l2.2-2.2" />
      <path d="M3 21h18" />
    </svg>
  )
}

export function BowlIcon(props) {
  return (
    <svg {...shared} {...props}>
      <path d="M3.5 12h17" />
      <path d="M3.5 12a8.5 4.5 0 0 0 17 0" />
      <path d="M12 12V6" />
      <path d="M9.5 7.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5" />
      <path d="M2 20h20" />
    </svg>
  )
}

export function MoonIcon(props) {
  return (
    <svg {...shared} {...props}>
      <path d="M18 13.5A7 7 0 1 1 10.5 6a5.4 5.4 0 0 0 7.5 7.5Z" />
      <path d="M3 21h18" />
    </svg>
  )
}

export const MEAL_ICONS = {
  breakfast: SunriseIcon,
  lunch: BowlIcon,
  dinner: MoonIcon,
}
