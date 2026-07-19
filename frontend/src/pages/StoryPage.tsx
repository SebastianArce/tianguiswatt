import { EngineRoomSection } from '@/components/story/EngineRoomSection'
import { FleetSection } from '@/components/story/FleetSection'
import { HalfHoursSection } from '@/components/story/HalfHoursSection'
import { HeroSection } from '@/components/story/HeroSection'
import { OneHomeSection } from '@/components/story/OneHomeSection'
import { WedgeSection } from '@/components/story/WedgeSection'

/** The narrative front page: from the live half-hour to the value of orchestrated
 *  home flexibility, argued with the project's own backtested data. Sections land
 *  incrementally; this shell carries the opening and closing moves. */
export function StoryPage() {
  return (
    <main>
      <HeroSection />
      <HalfHoursSection />
      <WedgeSection />
      <OneHomeSection />
      <FleetSection />
      {/* section: why the grid pays — arriving next */}
      <EngineRoomSection />
    </main>
  )
}
