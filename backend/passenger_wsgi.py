"""
cPanel/Passenger entrypoint for Takta FastAPI.

This wraps the ASGI app into WSGI so it can run in Python App environments
that expose only a WSGI callable (`application`).
"""

from a2wsgi import ASGIMiddleware

from app.main import app as asgi_app

application = ASGIMiddleware(asgi_app)
