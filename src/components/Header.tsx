import { useEffect, useState } from 'react'

export function Header() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="bg-[#1a1a2e] text-white flex items-center justify-between px-4 py-3 shrink-0">
      <span className="font-bold text-lg tracking-tight">🍽 Table Tracker</span>
      <span className="text-sm text-blue-200 font-medium">
        {time.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
        {' · '}
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </header>
  )
}
