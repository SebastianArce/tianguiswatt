"""Server-Sent Events endpoint streaming "data updated" notifications."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()

HEARTBEAT_SECONDS = 15


def _format(event_type: str, data: str, event_id: str) -> str:
    return f"id: {event_id}\nevent: {event_type}\ndata: {data}\n\n"


@router.get("/events")
async def events(request: Request) -> StreamingResponse:
    """Stream update events; the client refetches the affected endpoints on each."""
    hub = request.app.state.hub
    queue = await hub.subscribe()

    async def stream():
        try:
            yield ": connected\n\n"
            if hub.current is not None:
                yield _format("update", hub.current, hub.current)
            while not await request.is_disconnected():
                try:
                    latest = await asyncio.wait_for(
                        queue.get(), timeout=HEARTBEAT_SECONDS
                    )
                    yield _format("update", latest, latest)
                except TimeoutError:
                    yield ": keep-alive\n\n"  # comment line keeps proxies from dropping us
        finally:
            await hub.unsubscribe(queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
