"""In-process SSE event hub.

A single background poller watches the latest data timestamp and fans out a
"data updated" event to every connected SSE client. The poller runs **only while at
least one client is connected** (started on the first subscribe, stopped on the last
unsubscribe), so there is no idle database polling.

Polling is the right fit for this system's ~5-minute data cadence — there is no
cross-process message bus, and it scales to multiple FastAPI workers (each polls and
notifies its own clients). If the cadence ever became sub-second, this is the seam to
replace with an event bus (Redis/Kafka).
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable

logger = logging.getLogger(__name__)

DEFAULT_INTERVAL = 20.0


class EventHub:
    def __init__(
        self,
        fetch_latest: Callable[[], str | None],
        interval: float = DEFAULT_INTERVAL,
    ) -> None:
        self._fetch_latest = fetch_latest
        self._interval = interval
        self._subscribers: set[asyncio.Queue[str]] = set()
        self._poller: asyncio.Task[None] | None = None
        self._last: str | None = None

    @property
    def current(self) -> str | None:
        """The latest timestamp seen so far (for priming a new connection)."""
        return self._last

    async def subscribe(self) -> asyncio.Queue[str]:
        queue: asyncio.Queue[str] = asyncio.Queue()
        self._subscribers.add(queue)
        if self._poller is None:
            self._poller = asyncio.create_task(self._run())
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[str]) -> None:
        self._subscribers.discard(queue)
        if not self._subscribers:
            await self._stop_poller()

    async def aclose(self) -> None:
        self._subscribers.clear()
        await self._stop_poller()

    async def _stop_poller(self) -> None:
        if self._poller is not None:
            self._poller.cancel()
            try:
                await self._poller
            except asyncio.CancelledError:
                pass
            self._poller = None

    def _broadcast(self, latest: str) -> None:
        for queue in self._subscribers:
            queue.put_nowait(latest)

    async def _check_once(self) -> None:
        latest = await asyncio.to_thread(self._fetch_latest)
        if latest is not None and latest != self._last:
            self._last = latest
            self._broadcast(latest)

    async def _run(self) -> None:
        while True:
            try:
                await self._check_once()
            except Exception:
                logger.exception("SSE poller check failed")
            await asyncio.sleep(self._interval)
