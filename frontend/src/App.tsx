import { Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/components/RootLayout'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { LearnPage } from '@/pages/LearnPage'

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="learn" element={<LearnPage />} />
      </Route>
    </Routes>
  )
}
