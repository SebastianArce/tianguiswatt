import { EngineRoomSection } from '@/components/story/EngineRoomSection'
import { HeroSection } from '@/components/story/HeroSection'

/** The narrative front page: from the live half-hour to the value of orchestrated
 *  home flexibility, argued with the project's own backtested data. Sections land
 *  incrementally; this shell carries the opening and closing moves. */
export function StoryPage() {
  return (
    <main>
      <HeroSection />
      {/* sections: the half-hour grid · the retail wedge · one home armed ·
          the fleet multiplier · why the grid pays — arriving next */}
      <EngineRoomSection />
    </main>
  )
}
