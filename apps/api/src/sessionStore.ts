import { promises as fs } from 'node:fs';
import path from 'node:path';

import { createInitialSessionState, type SessionState } from './types.js';

const SESSION_DIRECTORY = '/tmp/sessions';
const TTL_MILLISECONDS = 8 * 60 * 60 * 1000;

function getSessionFilePath(sessionId: string): string {
    return path.join(SESSION_DIRECTORY, `${sessionId}.json`);
}

async function ensureSessionDirectory(): Promise<void> {
    await fs.mkdir(SESSION_DIRECTORY, { recursive: true });
}

export async function loadSessionState(sessionId: string): Promise<SessionState> {
    await ensureSessionDirectory();

    const filePath = getSessionFilePath(sessionId);
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as SessionState;
        return { ...parsed, lastSeenAt: new Date().toISOString() };
    } catch {
        return createInitialSessionState();
    }
}

export async function saveSessionState(sessionId: string, state: SessionState): Promise<void> {
    await ensureSessionDirectory();

    const filePath = getSessionFilePath(sessionId);
    const nextState: SessionState = {
        ...state,
        lastSeenAt: new Date().toISOString()
    };
    await fs.writeFile(filePath, JSON.stringify(nextState), 'utf8');
}

export async function cleanupExpiredSessions(now: Date = new Date()): Promise<number> {
    await ensureSessionDirectory();

    const entries = await fs.readdir(SESSION_DIRECTORY);
    let deleted = 0;

    await Promise.all(
        entries.map(async (entry): Promise<void> => {
            const filePath = path.join(SESSION_DIRECTORY, entry);
            try {
                const raw = await fs.readFile(filePath, 'utf8');
                const parsed = JSON.parse(raw) as Partial<SessionState>;
                const lastSeen = parsed.lastSeenAt ? new Date(parsed.lastSeenAt).getTime() : 0;
                if (!Number.isFinite(lastSeen)) {
                    return;
                }

                if (now.getTime() - lastSeen > TTL_MILLISECONDS) {
                    await fs.unlink(filePath);
                    deleted += 1;
                }
            } catch {
                // Ignore malformed files.
            }
        }),
    );

    return deleted;
}
