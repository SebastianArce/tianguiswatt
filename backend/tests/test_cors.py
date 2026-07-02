"""CORS is applied when origins are configured (RP_BACKEND_CORS_ORIGINS, set in conftest)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

_ORIGIN = "https://tianguiswatt.com"  # matches conftest's RP_BACKEND_CORS_ORIGINS


def test_cors_echoes_configured_origin():
    resp = TestClient(app).get("/api/health", headers={"Origin": _ORIGIN})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == _ORIGIN


def test_cors_omits_header_for_unknown_origin():
    resp = TestClient(app).get(
        "/api/health", headers={"Origin": "https://evil.example"}
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") is None
