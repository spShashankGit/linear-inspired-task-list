export type NotificationChannel = 'in_app';

export type NudgeRequest = {
    issueId: string;
    issueTitle: string;
    owner: string;
    requestedBy: string;
    channel: NotificationChannel;
};

export type IssueStatusNudgeRequested = {
    id: string;
    type: 'IssueStatusNudgeRequested';
    createdAt: string;
    issueId: string;
    issueTitle: string;
    owner: string;
    requestedBy: string;
    channel: NotificationChannel;
    message: string;
};

export type NudgeResult =
    | { ok: true; event: IssueStatusNudgeRequested }
    | { ok: false; error: string };

type StorageLike = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};

const NUDGE_AUDIT_STORAGE_KEY = 'kanban.nudge-audit.v1';

export function validateNudgeRequest(input: NudgeRequest): string | null {
    if (input.issueId.trim().length === 0) {
        return 'Issue id is required.';
    }
    if (input.issueTitle.trim().length === 0) {
        return 'Issue title is required.';
    }
    if (input.owner.trim().length === 0) {
        return 'Owner is required.';
    }
    if (input.requestedBy.trim().length === 0) {
        return 'Requester is required.';
    }
    if (input.channel !== 'in_app') {
        return 'Unsupported channel.';
    }

    return null;
}

export function createMemoryStorage(): StorageLike {
    const data = new Map<string, string>();
    return {
        getItem(key: string): string | null {
            return data.get(key) ?? null;
        },
        setItem(key: string, value: string): void {
            data.set(key, value);
        }
    };
}

function getDefaultStorage(): StorageLike {
    const maybeStorage = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (maybeStorage) {
        return maybeStorage;
    }

    return createMemoryStorage();
}

function readAuditEvents(storage: StorageLike): IssueStatusNudgeRequested[] {
    const raw = storage.getItem(NUDGE_AUDIT_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((event): event is IssueStatusNudgeRequested => {
            if (typeof event !== 'object' || event === null) {
                return false;
            }

            const maybe = event as Partial<IssueStatusNudgeRequested>;
            return (
                typeof maybe.id === 'string' &&
                maybe.type === 'IssueStatusNudgeRequested' &&
                typeof maybe.createdAt === 'string' &&
                typeof maybe.issueId === 'string' &&
                typeof maybe.issueTitle === 'string' &&
                typeof maybe.owner === 'string' &&
                typeof maybe.requestedBy === 'string' &&
                maybe.channel === 'in_app' &&
                typeof maybe.message === 'string'
            );
        });
    } catch {
        return [];
    }
}

function writeAuditEvents(storage: StorageLike, events: IssueStatusNudgeRequested[]): void {
    storage.setItem(NUDGE_AUDIT_STORAGE_KEY, JSON.stringify(events));
}

export function getNudgeAuditTrail(storage: StorageLike = getDefaultStorage()): IssueStatusNudgeRequested[] {
    return readAuditEvents(storage);
}

function createEvent(request: NudgeRequest): IssueStatusNudgeRequested {
    const normalizedOwner = request.owner.trim();
    return {
        id: `nudge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'IssueStatusNudgeRequested',
        createdAt: new Date().toISOString(),
        issueId: request.issueId.trim(),
        issueTitle: request.issueTitle.trim(),
        owner: normalizedOwner,
        requestedBy: request.requestedBy.trim(),
        channel: request.channel,
        message: `@${normalizedOwner} can you share a quick status update on ${request.issueId.trim()}?`
    };
}

export async function sendStatusNudge(
    request: NudgeRequest,
    storage: StorageLike = getDefaultStorage(),
): Promise<NudgeResult> {
    const validationError = validateNudgeRequest(request);
    if (validationError) {
        return { ok: false, error: validationError };
    }

    const event = createEvent(request);
    const events = readAuditEvents(storage);
    writeAuditEvents(storage, [event, ...events]);
    return { ok: true, event };
}
