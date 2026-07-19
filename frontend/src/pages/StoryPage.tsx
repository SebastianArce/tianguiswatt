import { ErrorBoundary } from '@/components/ErrorBoundary'
import { EngineRoomSection } from '@/components/story/EngineRoomSection'
import { FleetSection } from '@/components/story/FleetSection'
import { HalfHoursSection } from '@/components/story/HalfHoursSection'
import { HeroSection } from '@/components/story/HeroSection'
import { OneHomeSection } from '@/components/story/OneHomeSection'
import { WedgeSection } from '@/components/story/WedgeSection'
import { WhyGridPaysSection } from '@/components/story/WhyGridPaysSection'

/** The narrative front page: from the live half-hour to the value of orchestrated
 *  home flexibility, argued with the project's own backtested data. Each data section
 *  has its own boundary so one bad payload degrades one figure, not the page. */
export function StoryPage() {
  return (
    <main>
      <HeroSection />
      <ErrorBoundary>
        <HalfHoursSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <WedgeSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <OneHomeSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <FleetSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <WhyGridPaysSection />
      </ErrorBoundary>
      <EngineRoomSection />
    </main>
  )
}
