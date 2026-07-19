import { Outlet } from 'react-router-dom'

/** The standard page frame: the width cage every dashboard route renders inside.
 *  Routes outside this layout (the narrative front page) manage their own <main>. */
export function ContainedLayout() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Outlet />
    </main>
  )
}
