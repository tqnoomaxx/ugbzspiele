const shared = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function SvgIcon({ children, size = 24, className = '', viewBox = '0 0 24 24' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox={viewBox}
      width={size}
      {...shared}
    >
      {children}
    </svg>
  )
}

export function ArrowLeftIcon(props) {
  return <SvgIcon {...props}><path d="M19 12H5m6-6-6 6 6 6" /></SvgIcon>
}

export function ArrowRightIcon(props) {
  return <SvgIcon {...props}><path d="M5 12h14m-6-6 6 6-6 6" /></SvgIcon>
}

export function HomeIcon(props) {
  return <SvgIcon {...props}><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 8.5V21h13V8.5M9.5 21v-7h5v7" /></SvgIcon>
}

export function UserIcon(props) {
  return <SvgIcon {...props}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 21c.5-4.3 2.7-6.4 6.5-6.4s6 2.1 6.5 6.4" /></SvgIcon>
}

export function PlusIcon(props) {
  return <SvgIcon {...props}><path d="M12 5v14M5 12h14" /></SvgIcon>
}

export function MinusIcon(props) {
  return <SvgIcon {...props}><path d="M5 12h14" /></SvgIcon>
}

export function CloseIcon(props) {
  return <SvgIcon {...props}><path d="m6 6 12 12M18 6 6 18" /></SvgIcon>
}

export function UndoIcon(props) {
  return <SvgIcon {...props}><path d="M9 8H4V3" /><path d="M4.5 8.5A8 8 0 1 1 4 15" /></SvgIcon>
}

export function CardsIcon(props) {
  return <SvgIcon {...props}><rect x="8.5" y="4" width="10" height="15" rx="1.5" transform="rotate(7 13.5 11.5)" /><path d="m6.5 6-1.4.2a1.5 1.5 0 0 0-1.3 1.7l1.5 11.9a1.5 1.5 0 0 0 1.7 1.3l7.8-1" /><path d="m13.5 9 1.4 1.6-1.8 1.1" /></SvgIcon>
}

export function DoorIcon(props) {
  return <SvgIcon {...props}><path d="M5 21V4h11v17M8 21V7l8-2v16" /><circle cx="13.5" cy="13" r=".6" fill="currentColor" stroke="none" /><path d="M3 21h16" /></SvgIcon>
}

export function StarIcon({ size = 18, className = '' }) {
  return (
    <svg aria-hidden="true" className={className} height={size} viewBox="0 0 24 24" width={size}>
      <path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9L12 2.8Z" fill="currentColor" />
    </svg>
  )
}

export function TrophyIcon(props) {
  return <SvgIcon {...props}><path d="M8 4h8v4.5c0 3-1.6 5-4 5s-4-2-4-5V4Z" /><path d="M8 6H4.5v2c0 2 1.3 3.5 3.7 3.7M16 6h3.5v2c0 2-1.3 3.5-3.7 3.7M12 13.5V18m-4 3h8m-6-3h4" /></SvgIcon>
}

export function CheckIcon(props) {
  return <SvgIcon {...props}><path d="m5 12.5 4.2 4.2L19 7" /></SvgIcon>
}
