"""Unit tests for the SSE event hub (deterministic, no ClickHouse needed)."""

from __future__ import annotations

import asyncio

from app.core.events import EventHub


def test_check_once_broadcasts_only_on_change():
    async def scenario() -> None:
        seq = iter(["t1", "t1", "t2"])
        hub = EventHub(lambda: next(seq), interval=999)
        queue: asyncio.Queue[str] = asyncio.Queue()
        hub._subscribers.add(queue)  # bypass the auto-poller for determinism

        await hub._check_once()  # t1 -> broadcast
        assert queue.get_nowait() == "t1"
        assert hub.current == "t1"

        await hub._check_once()  # t1 again -> no broadcast
        assert queue.empty()

        await hub._check_once()  # t2 -> broadcast
        assert queue.get_nowait() == "t2"

    asyncio.run(scenario())


def test_poller_runs_only_while_subscribed():
    async def scenario() -> None:
        hub = EventHub(lambda: None, interval=999)
        assert hub._poller is None

        q1 = await hub.subscribe()
        assert hub._poller is not None

        q2 = await hub.subscribe()
        await hub.unsubscribe(q1)
        assert hub._poller is not None  # q2 still connected

        await hub.unsubscribe(q2)
        assert hub._poller is None  # last client gone -> poller stopped

    asyncio.run(scenario())
