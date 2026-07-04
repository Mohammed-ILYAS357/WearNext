import { NavLink } from 'react-router-dom'
import { Shirt, Plus, CalendarDays, Droplets } from 'lucide-react'
import { useApp } from '../context/AppContext'

const tabs = [
  { to: '/', label: 'Home', icon: Shirt },
  { to: '/add', label: 'Add', icon: Plus },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/laundry', label: 'Laundry', icon: Droplets },
]

export default function Navigation() {
  const { laundryOutfits } = useApp()
  const laundryCount = laundryOutfits.length

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl"
      style={{
        background: 'rgba(251, 252, 254, 0.85)',
        borderColor: 'var(--color-mist-2)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-[var(--color-blue)]' : 'text-[var(--color-ink-soft)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                    {to === '/laundry' && laundryCount > 0 && (
                      <span
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                        style={{ background: 'var(--color-blue)' }}
                      >
                        {laundryCount}
                      </span>
                    )}
                  </span>
                  {label}
                  {isActive && (
                    <span
                      className="absolute -bottom-0 h-0.5 w-8 rounded-full"
                      style={{ background: 'var(--color-blue)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
