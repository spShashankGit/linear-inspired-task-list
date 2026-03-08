export type IssueStatus = 'todo' | 'in_progress' | 'parked' | 'done';

export type ApiIssue = {
    id: string;
    title: string;
    owner: string;
    status: IssueStatus;
};

export type ApiNudgeEvent = {
    id: string;
    createdAt: string;
    issueId: string;
    issueTitle: string;
    owner: string;
    requestedBy: string;
    channel: 'in_app';
    message: string;
};

export type ApiIssueComment = {
    id: string;
    issueId: string;
    author: string;
    body: string;
    createdAt: string;
};

export type ApiCommunicationItem = {
    id: string;
    kind: 'NUDGE' | 'COMMENT';
    createdAt: string;
    author: string;
    text: string;
};

export type ApiNotificationItem = {
    event: ApiNudgeEvent;
    unread: boolean;
};

const endpoint = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/graphql';

type GraphQLErrorItem = { message: string };

type GraphQLResponse<T> = {
    data?: T;
    errors?: GraphQLErrorItem[];
};

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
        throw new Error(`GraphQL HTTP error: ${response.status}`);
    }

    const payload = (await response.json()) as GraphQLResponse<T>;
    if (payload.errors && payload.errors.length > 0) {
        throw new Error(payload.errors.map((item): string => item.message).join('; '));
    }
    if (!payload.data) {
        throw new Error('GraphQL response missing data.');
    }

    return payload.data;
}

export async function fetchBoard(): Promise<ApiIssue[]> {
    const data = await gql<{ board: { issues: ApiIssue[] } }>(`
        query Board {
            board {
                issues {
                    id
                    title
                    owner
                    status
                }
            }
        }
    `);

    return data.board.issues;
}

export async function fetchIssueDetail(issueId: string): Promise<{
    issue: ApiIssue;
    comments: ApiIssueComment[];
    nudges: ApiNudgeEvent[];
    communication: ApiCommunicationItem[];
} | null> {
    const data = await gql<{ issueDetail: {
        issue: ApiIssue;
        comments: ApiIssueComment[];
        nudges: ApiNudgeEvent[];
        communication: ApiCommunicationItem[];
    } | null }>(`
        query IssueDetail($issueId: String!) {
            issueDetail(issueId: $issueId) {
                issue {
                    id
                    title
                    owner
                    status
                }
                comments {
                    id
                    issueId
                    author
                    body
                    createdAt
                }
                nudges {
                    id
                    createdAt
                    issueId
                    issueTitle
                    owner
                    requestedBy
                    channel
                    message
                }
                communication {
                    id
                    kind
                    createdAt
                    author
                    text
                }
            }
        }
    `, { issueId });

    return data.issueDetail;
}

export async function fetchNotifications(viewer: string): Promise<ApiNotificationItem[]> {
    const data = await gql<{ notificationsForViewer: ApiNotificationItem[] }>(`
        query Notifications($viewer: String!) {
            notificationsForViewer(viewer: $viewer) {
                unread
                event {
                    id
                    createdAt
                    issueId
                    issueTitle
                    owner
                    requestedBy
                    channel
                    message
                }
            }
        }
    `, { viewer });

    return data.notificationsForViewer;
}

export async function createIssue(input: { title: string; owner: string }): Promise<ApiIssue> {
    const data = await gql<{ createIssue: ApiIssue }>(`
        mutation CreateIssue($input: CreateIssueInput!) {
            createIssue(input: $input) {
                id
                title
                owner
                status
            }
        }
    `, { input });

    return data.createIssue;
}

export async function moveIssueStatus(input: { issueId: string; status: IssueStatus }): Promise<ApiIssue> {
    const data = await gql<{ moveIssue: ApiIssue }>(`
        mutation MoveIssue($input: MoveIssueInput!) {
            moveIssue(input: $input) {
                id
                title
                owner
                status
            }
        }
    `, { input });

    return data.moveIssue;
}

export async function nudgeIssueOwner(input: {
    issueId: string;
    requestedBy: string;
    channel: 'in_app';
}): Promise<ApiNudgeEvent> {
    const data = await gql<{ nudgeOwner: ApiNudgeEvent }>(`
        mutation NudgeOwner($input: NudgeOwnerInput!) {
            nudgeOwner(input: $input) {
                id
                createdAt
                issueId
                issueTitle
                owner
                requestedBy
                channel
                message
            }
        }
    `, { input });

    return data.nudgeOwner;
}

export async function postIssueComment(input: {
    issueId: string;
    author: string;
    body: string;
}): Promise<ApiIssueComment> {
    const data = await gql<{ postComment: ApiIssueComment }>(`
        mutation PostComment($input: PostCommentInput!) {
            postComment(input: $input) {
                id
                issueId
                author
                body
                createdAt
            }
        }
    `, { input });

    return data.postComment;
}

export async function markNudgesRead(input: { viewer: string; nudgeIds: string[] }): Promise<boolean> {
    const data = await gql<{ markNudgesRead: boolean }>(`
        mutation MarkNudgesRead($input: MarkNudgesReadInput!) {
            markNudgesRead(input: $input)
        }
    `, { input });

    return data.markNudgesRead;
}
