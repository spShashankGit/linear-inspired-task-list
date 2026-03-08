import crypto from 'node:crypto';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

import { createYoga } from 'graphql-yoga';

import { schema } from './graphql.js';
import { cleanupExpiredSessions, loadSessionState, saveSessionState } from './sessionStore.js';
import type { SessionState } from './types.js';

type CookieMap = Record<string, string>;

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const host = process.env.HOST ?? '127.0.0.1';
const cookieSecret = process.env.SESSION_COOKIE_SECRET ?? 'change-me-in-prod';
const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((item): string => item.trim())
    .filter((item): boolean => item.length > 0);

function parseCookies(header: string | null): CookieMap {
    if (!header) {
        return {};
    }

    return Object.fromEntries(
        header
            .split(';')
            .map((item): [string, string] | null => {
                const [rawKey, ...rawValue] = item.trim().split('=');
                if (!rawKey || rawValue.length === 0) {
                    return null;
                }

                try {
                    return [rawKey, decodeURIComponent(rawValue.join('='))];
                } catch {
                    return null;
                }
            })
            .filter((entry): entry is [string, string] => Boolean(entry)),
    );
}

function createSignature(value: string): string {
    return crypto.createHmac('sha256', cookieSecret).update(value).digest('base64url');
}

function signSessionId(sessionId: string): string {
    return `${sessionId}.${createSignature(sessionId)}`;
}

function verifySignedSessionId(signed: string): string | null {
    const [sessionId, signature] = signed.split('.');
    if (!sessionId || !signature) {
        return null;
    }

    const expected = createSignature(sessionId);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) {
        return null;
    }
    if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
        return null;
    }

    return sessionId;
}

function buildCookieHeader(signedSessionId: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = isProduction ? 'Secure; ' : '';
    return `sid=${encodeURIComponent(signedSessionId)}; Path=/; HttpOnly; ${secure}SameSite=Lax; Max-Age=86400`;
}

function resolveSessionFromRequest(request: IncomingMessage): {
    sessionId: string;
    shouldSetCookie: boolean;
    signedSessionId: string;
} {
    const cookieValue = typeof request.headers.cookie === 'string' ? request.headers.cookie : null;
    const cookies = parseCookies(cookieValue);
    const verified = cookies.sid ? verifySignedSessionId(cookies.sid) : null;

    const sessionId = verified ?? crypto.randomUUID();
    return {
        sessionId,
        shouldSetCookie: !verified,
        signedSessionId: signSessionId(sessionId)
    };
}

const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    cors: {
        origin: allowedOrigins,
        credentials: true
    },
    context: async ({ request }) => {
        const sessionId = request.headers.get('x-session-id') ?? crypto.randomUUID();
        const state = await loadSessionState(sessionId);
        return {
            sessionId,
            state,
            saveState: async (nextState: SessionState): Promise<void> => {
                await saveSessionState(sessionId, nextState);
            }
        };
    }
});

const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

    if (request.method === 'GET' && request.url === '/healthz') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ ok: true, service: 'api' }));
        return;
    }

    const session = resolveSessionFromRequest(request);
    request.headers['x-session-id'] = session.sessionId;

    if (session.shouldSetCookie) {
        response.setHeader('Set-Cookie', buildCookieHeader(session.signedSessionId));
    }

    yoga(request, response);
});

server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] GraphQL running on http://${host}:${port}/graphql`);
});

setInterval(async () => {
    const deleted = await cleanupExpiredSessions();
    if (deleted > 0) {
        // eslint-disable-next-line no-console
        console.log(`[api] cleaned up ${deleted} expired session file(s)`);
    }
}, 15 * 60 * 1000).unref();
