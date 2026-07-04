import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import AddClothes from './pages/AddClothes'
import Calendar from './pages/Calendar'
import Laundry from './pages/Laundry'

// HashRouter is used deliberately: WearNext is a fully offline PWA with no
// server, so there is no backend to handle deep-link rewrites for a
// history-based router. Hash routing works from a single static index.html
// with zero server configuration, on any host.
export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <div className="mx-auto max-w-md" style={{ background: 'var(--color-canvas)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddClothes />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/laundry" element={<Laundry />} />
          </Routes>
          <Navigation />
        </div>
      </AppProvider>
    </HashRouter>
  )
}
