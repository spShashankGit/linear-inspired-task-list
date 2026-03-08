export type IssueStatus = 'todo' | 'in_progress' | 'parked' | 'done';

export type Issue = {
    id: string;
    title: string;
    owner: string;
    status: IssueStatus;
};

export type NotificationChannel = 'in_app';

export type NudgeEvent = {
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

export type IssueComment = {
    id: string;
    issueId: string;
    author: string;
    body: string;
    createdAt: string;
};

export type SessionState = {
    issues: Issue[];
    nudges: NudgeEvent[];
    comments: Record<string, IssueComment[]>;
    readNudgeIdsByViewer: Record<string, string[]>;
    lastSeenAt: string;
};

export const seedIssues: Issue[] = [
    { id: 'KAN-101', title: 'Build command palette shell', owner: 'Shashank', status: 'todo' },
    { id: 'KAN-102', title: 'Add bulk-select checkboxes', owner: 'Ariana', status: 'in_progress' },
    { id: 'KAN-103', title: 'Wire in-app status nudge', owner: 'Max', status: 'parked' },
    { id: 'KAN-104', title: 'Create audit event schema', owner: 'Nina', status: 'done' }
];

export function createInitialSessionState(): SessionState {
    return {
        issues: seedIssues,
        nudges: [],
        comments: {},
        readNudgeIdsByViewer: {},
        lastSeenAt: new Date().toISOString()
    };
}
