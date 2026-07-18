import { Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/components/RootLayout'
import { BatteryLabPage } from '@/pages/BatteryLabPage'
import { BidStackPage } from '@/pages/BidStackPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { LearnPage } from '@/pages/LearnPage'
import { TrendsPage } from '@/pages/TrendsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="bid-stack" element={<BidStackPage />} />
        <Route path="trends" element={<TrendsPage />} />
        <Route path="battery" element={<BatteryLabPage />} />
        <Route path="learn" element={<LearnPage />} />
      </Route>
    </Routes>
  )
}
