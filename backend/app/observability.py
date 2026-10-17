"""Correlation IDs, structured request logs and safe errors around every API route."""
import json
import logging
import os
import time
import uuid
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.responses import JSONResponse

class JsonFormatter(logging.Formatter):
    def format(self, record):
        item = {'timestamp': self.formatTime(record), 'level': record.levelname,
                'event': record.getMessage()}
        for key in ('request_id', 'method', 'route', 'status', 'duration_ms', 'error_type'):
            if hasattr(record, key):
                item[key] = getattr(record, key)
        return json.dumps(item)

logging.getLogger('uvicorn.access').disabled = True
logger = logging.getLogger('community_help_hub')
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

class ObservabilityMiddleware:
    def __init__(self, app):
        self.app = app
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        request_id = uuid.uuid4().hex
        scope.setdefault('state', {})['request_id'] = request_id
        started = False
        status = 500
        start = time.monotonic()
        async def observed_send(message):
            nonlocal started, status
            if message['type'] == 'http.response.start':
                started = True
                status = message['status']
                message['headers'] = [(k,v) for k,v in message['headers'] if k.lower() not in {b'x-request-id',b'x-content-type-options',b'cache-control',b'strict-transport-security'}]
                message['headers'] += [(b'x-request-id', request_id.encode()),
                    (b'x-content-type-options', b'nosniff'), (b'cache-control', b'no-store')]
                if os.getenv('APP_ENV') == 'production':
                    message['headers'].append((b'strict-transport-security', b'max-age=31536000'))
            await send(message)
        try:
            await self.app(scope, receive, observed_send)
        except Exception as exc:
            # Never log exception messages, SQL parameters, tokens, bodies, or raw query strings.
            logger.error('request_failed', extra={'request_id':request_id, 'error_type':type(exc).__name__})
            if not started:
                if isinstance(exc, OperationalError):
                    code, detail = 503, 'The database is temporarily busy. Please try again.'
                elif isinstance(exc, IntegrityError):
                    code, detail = 409, 'This operation conflicts with an existing record. Refresh and try again.'
                else:
                    code, detail = 500, 'Something went wrong. Please try again or contact support with this reference.'
                await JSONResponse({'detail':detail, 'request_id':request_id}, status_code=code)(scope, receive, observed_send)
            # A disconnected/SSE response cannot be replaced with a second HTTP response.
        finally:
            route = getattr(scope.get('route'), 'path', 'unmatched')
            logger.info('request_completed', extra={'request_id':request_id, 'method':scope['method'],
                'route':route, 'status':status, 'duration_ms':round((time.monotonic()-start)*1000, 2)})
