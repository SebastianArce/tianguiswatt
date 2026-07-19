import { Route, Routes } from 'react-router-dom'
import { ContainedLayout } from '@/components/ContainedLayout'
import { RootLayout } from '@/components/RootLayout'
import { BatteryLabPage } from '@/pages/BatteryLabPage'
import { BidStackPage } from '@/pages/BidStackPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { LivePage } from '@/pages/LivePage'
import { LearnPage } from '@/pages/LearnPage'
import { StoryPage } from '@/pages/StoryPage'
import { TrendsPage } from '@/pages/TrendsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<StoryPage />} />
        <Route element={<ContainedLayout />}>
          <Route path="live" element={<LivePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="bid-stack" element={<BidStackPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="battery" element={<BatteryLabPage />} />
          <Route path="learn" element={<LearnPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
