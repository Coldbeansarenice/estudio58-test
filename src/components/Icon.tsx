// Inline icons (no icon library needed). Stroke icons on a 24px grid.
const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  library: 'M4 4h4v16H4zM10 4h4v16h-4zM16.5 4.5l3.8 1-3.9 15-3.8-1z',
  courses: 'M3 5h8a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  ask: 'M4 5h16v11H9l-5 4z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  check: 'M4.5 12.5l5 5 10-11',
  bookmark: 'M6 3h12v18l-6-4.5L6 21z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  plane: 'M2 13l20-8-6 16-3-7z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  logout: 'M15 4h4v16h-4M10 16l4-4-4-4M14 12H4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
};

export function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }: { name: keyof typeof P | string; size?: number; className?: string; strokeWidth?: number }) {
  const filled = name === 'play' || name === 'pause';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name] ?? ''} />
    </svg>
  );
}
