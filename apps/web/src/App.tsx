import React from 'react';
import {
    getNudgeAuditTrail,
    sendStatusNudge,
    type IssueStatusNudgeRequested
} from './nudgeService';

type IssueStatus = 'todo' | 'in_progress' | 'parked' | 'done';

type Issue = {
    id: string;
    title: string;
    owner: string;
    status: IssueStatus;
};

type IssueComment = {
    id: string;
    issueId: string;
    author: string;
    body: string;
    createdAt: string;
};

type CommunicationThreadItem = {
    id: string;
    kind: 'nudge' | 'comment';
    createdAt: string;
    author: string;
    text: string;
};

const statusOrder: IssueStatus[] = ['todo', 'in_progress', 'parked', 'done'];

const statusLabel: Record<IssueStatus, string> = {
    todo: 'Todo',
    in_progress: 'In Progress',
    parked: 'Parked',
    done: 'Done'
};

const seedIssues: Issue[] = [
    { id: 'KAN-101', title: 'Build command palette shell', owner: 'Shashank', status: 'todo' },
    { id: 'KAN-102', title: 'Add bulk-select checkboxes', owner: 'Ariana', status: 'in_progress' },
    { id: 'KAN-103', title: 'Wire in-app status nudge', owner: 'Max', status: 'parked' },
    { id: 'KAN-104', title: 'Create audit event schema', owner: 'Nina', status: 'done' }
];

const ISSUE_STORAGE_KEY = 'kanban.issues.v1';
const NUDGE_READ_STORAGE_KEY = 'kanban.nudge-read.v1';
const ISSUE_COMMENT_STORAGE_KEY = 'kanban.issue-comments.v1';

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

function getNextStatus(currentStatus: IssueStatus): IssueStatus {
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex < 0 || currentIndex === statusOrder.length - 1) {
        return 'done';
    }

    return statusOrder[currentIndex + 1]!;
}

function getPreviousStatus(currentStatus: IssueStatus): IssueStatus {
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex <= 0) {
        return 'todo';
    }

    return statusOrder[currentIndex - 1]!;
}

function moveIssue(issues: Issue[], issueId: string, targetStatus: IssueStatus): Issue[] {
    return issues.map((issue): Issue => {
        if (issue.id !== issueId) {
            return issue;
        }

        return { ...issue, status: targetStatus };
    });
}

function moveIssuesToNextBucket(issues: Issue[], issueIds: Set<string>): Issue[] {
    return issues.map((issue): Issue => {
        if (!issueIds.has(issue.id)) {
            return issue;
        }

        return { ...issue, status: getNextStatus(issue.status) };
    });
}

function moveIssuesToPreviousBucket(issues: Issue[], issueIds: Set<string>): Issue[] {
    return issues.map((issue): Issue => {
        if (!issueIds.has(issue.id)) {
            return issue;
        }

        return { ...issue, status: getPreviousStatus(issue.status) };
    });
}

function reorderIssueWithinBucket(issues: Issue[], issueId: string, direction: 'up' | 'down'): Issue[] {
    const targetIssue = issues.find((issue): boolean => issue.id === issueId);
    if (!targetIssue) {
        return issues;
    }

    const statusIssues = issues.filter((issue): boolean => issue.status === targetIssue.status);
    const currentIndex = statusIssues.findIndex((issue): boolean => issue.id === issueId);
    if (currentIndex < 0) {
        return issues;
    }

    const targetIndex =
        direction === 'up'
            ? Math.max(0, currentIndex - 1)
            : Math.min(statusIssues.length - 1, currentIndex + 1);
    if (targetIndex === currentIndex) {
        return issues;
    }

    const reorderedStatusIssues = [...statusIssues];
    const [movedIssue] = reorderedStatusIssues.splice(currentIndex, 1);
    if (!movedIssue) {
        return issues;
    }
    reorderedStatusIssues.splice(targetIndex, 0, movedIssue);

    let statusPointer = 0;
    return issues.map((issue): Issue => {
        if (issue.status !== targetIssue.status) {
            return issue;
        }

        const nextIssue = reorderedStatusIssues[statusPointer];
        statusPointer += 1;
        return nextIssue ?? issue;
    });
}

function moveIssueByDrop(
    issues: Issue[],
    draggedIssueId: string,
    targetStatus: IssueStatus,
    targetIndex: number,
): Issue[] {
    const draggedIssue = issues.find((issue): boolean => issue.id === draggedIssueId);
    if (!draggedIssue) {
        return issues;
    }

    const withoutDragged = issues.filter((issue): boolean => issue.id !== draggedIssueId);
    const targetBucketIssues = withoutDragged.filter((issue): boolean => issue.status === targetStatus);
    const targetPosition = Math.max(0, Math.min(targetIndex, targetBucketIssues.length));
    const movedIssue: Issue = { ...draggedIssue, status: targetStatus };

    const reorderedTargetBucket = [...targetBucketIssues];
    reorderedTargetBucket.splice(targetPosition, 0, movedIssue);

    const byStatus = new Map<IssueStatus, Issue[]>();
    for (const status of statusOrder) {
        if (status === targetStatus) {
            byStatus.set(status, reorderedTargetBucket);
            continue;
        }
        byStatus.set(
            status,
            withoutDragged.filter((issue): boolean => issue.status === status),
        );
    }

    return statusOrder.flatMap((status): Issue[] => byStatus.get(status) ?? []);
}

function getNextIssueId(issues: Issue[]): string {
    const numericIds = issues
        .map((issue): number => {
            const match = issue.id.match(/KAN-(\d+)/);
            if (!match) {
                return 0;
            }

            const numericPortion = match.at(1);
            if (!numericPortion) {
                return 0;
            }

            return Number.parseInt(numericPortion, 10);
        })
        .filter((value): boolean => Number.isFinite(value));

    const currentMax = numericIds.length === 0 ? 100 : Math.max(...numericIds);
    return `KAN-${currentMax + 1}`;
}

export function App(): React.ReactElement {
    const [issues, setIssues] = React.useState<Issue[]>((): Issue[] => {
        const storedValue = window.localStorage.getItem(ISSUE_STORAGE_KEY);
        if (!storedValue) {
            return seedIssues;
        }

        try {
            const parsedValue: unknown = JSON.parse(storedValue);
            if (!Array.isArray(parsedValue)) {
                return seedIssues;
            }

            const parsedIssues = parsedValue.filter((item): item is Issue => {
                if (typeof item !== 'object' || item === null) {
                    return false;
                }

                const issue = item as Partial<Issue>;
                return (
                    typeof issue.id === 'string' &&
                    typeof issue.title === 'string' &&
                    typeof issue.owner === 'string' &&
                    (issue.status === 'todo' ||
                        issue.status === 'in_progress' ||
                        issue.status === 'parked' ||
                        issue.status === 'done')
                );
            });

            return parsedIssues.length > 0 ? parsedIssues : seedIssues;
        } catch {
            return seedIssues;
        }
    });
    const [selectedIssueIds, setSelectedIssueIds] = React.useState<Set<string>>(new Set());

    const [isCommandModeOpen, setIsCommandModeOpen] = React.useState<boolean>(false);
    const [lastShortcutEvent, setLastShortcutEvent] = React.useState<string>('none');
    const [commandSearch, setCommandSearch] = React.useState<string>('');
    const [activeResultIndex, setActiveResultIndex] = React.useState<number>(0);

    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState<boolean>(false);
    const [newIssueTitle, setNewIssueTitle] = React.useState<string>('');
    const [newIssueOwner, setNewIssueOwner] = React.useState<string>('Shashank');

    const [openedIssueId, setOpenedIssueId] = React.useState<string | null>(null);
    const [commentDraft, setCommentDraft] = React.useState<string>('');
    const [draggedIssueId, setDraggedIssueId] = React.useState<string | null>(null);
    const [isNudging, setIsNudging] = React.useState<boolean>(false);
    const [nudgeFeedback, setNudgeFeedback] = React.useState<string>('');
    const [latestNudgeEvent, setLatestNudgeEvent] = React.useState<IssueStatusNudgeRequested | null>(null);
    const [commentFeedback, setCommentFeedback] = React.useState<string>('');
    const [issueComments, setIssueComments] = React.useState<Record<string, IssueComment[]>>((): Record<string, IssueComment[]> => {
        const raw = window.localStorage.getItem(ISSUE_COMMENT_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        try {
            const parsed = JSON.parse(raw) as unknown;
            if (typeof parsed !== 'object' || parsed === null) {
                return {};
            }

            const record = parsed as Record<string, unknown>;
            const next: Record<string, IssueComment[]> = {};
            for (const [issueId, value] of Object.entries(record)) {
                if (!Array.isArray(value)) {
                    continue;
                }

                next[issueId] = value.filter((entry): entry is IssueComment => {
                    if (typeof entry !== 'object' || entry === null) {
                        return false;
                    }
                    const maybe = entry as Partial<IssueComment>;
                    return (
                        typeof maybe.id === 'string' &&
                        typeof maybe.issueId === 'string' &&
                        typeof maybe.author === 'string' &&
                        typeof maybe.body === 'string' &&
                        typeof maybe.createdAt === 'string'
                    );
                });
            }

            return next;
        } catch {
            return {};
        }
    });
    const [nudgeAuditEvents, setNudgeAuditEvents] = React.useState<IssueStatusNudgeRequested[]>((): IssueStatusNudgeRequested[] =>
        getNudgeAuditTrail(),
    );
    const [currentViewer, setCurrentViewer] = React.useState<string>('Shashank');
    const [isNotificationOpen, setIsNotificationOpen] = React.useState<boolean>(false);
    const [readNudgeIds, setReadNudgeIds] = React.useState<Set<string>>((): Set<string> => {
        const raw = window.localStorage.getItem(NUDGE_READ_STORAGE_KEY);
        if (!raw) {
            return new Set<string>();
        }

        try {
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) {
                return new Set<string>();
            }
            return new Set<string>(
                parsed.filter((item): item is string => typeof item === 'string'),
            );
        } catch {
            return new Set<string>();
        }
    });

    const commandInputReference = React.useRef<HTMLInputElement | null>(null);
    const createTitleInputReference = React.useRef<HTMLInputElement | null>(null);
    const commentInputReference = React.useRef<HTMLTextAreaElement | null>(null);

    const filteredIssues = React.useMemo((): Issue[] => {
        const query = commandSearch.trim().toLowerCase();
        if (query.length === 0) {
            return issues;
        }

        return issues.filter((issue): boolean => {
            return (
                issue.id.toLowerCase().includes(query) ||
                issue.title.toLowerCase().includes(query) ||
                issue.owner.toLowerCase().includes(query)
            );
        });
    }, [commandSearch, issues]);

    const openedIssue = React.useMemo((): Issue | null => {
        if (!openedIssueId) {
            return null;
        }

        return issues.find((issue): boolean => issue.id === openedIssueId) ?? null;
    }, [issues, openedIssueId]);

    const ownerOptions = React.useMemo((): string[] => {
        return Array.from(new Set(issues.map((issue): string => issue.owner))).sort((a, b): number =>
            a.localeCompare(b),
        );
    }, [issues]);

    const notificationsForViewer = React.useMemo((): IssueStatusNudgeRequested[] => {
        return nudgeAuditEvents.filter((event): boolean => event.owner === currentViewer);
    }, [currentViewer, nudgeAuditEvents]);

    const unreadNotificationCount = React.useMemo((): number => {
        return notificationsForViewer.filter((event): boolean => !readNudgeIds.has(event.id)).length;
    }, [notificationsForViewer, readNudgeIds]);

    const openedIssueNudges = React.useMemo((): IssueStatusNudgeRequested[] => {
        if (!openedIssueId) {
            return [];
        }
        return nudgeAuditEvents.filter((event): boolean => event.issueId === openedIssueId);
    }, [nudgeAuditEvents, openedIssueId]);

    const openedIssueComments = React.useMemo((): IssueComment[] => {
        if (!openedIssueId) {
            return [];
        }
        return issueComments[openedIssueId] ?? [];
    }, [issueComments, openedIssueId]);

    const communicationThread = React.useMemo((): CommunicationThreadItem[] => {
        const items: CommunicationThreadItem[] = [
            ...openedIssueNudges.map((event): CommunicationThreadItem => ({
                id: event.id,
                kind: 'nudge',
                createdAt: event.createdAt,
                author: event.requestedBy,
                text: event.message
            })),
            ...openedIssueComments.map((comment): CommunicationThreadItem => ({
                id: comment.id,
                kind: 'comment',
                createdAt: comment.createdAt,
                author: comment.author,
                text: comment.body
            }))
        ];

        return items.sort((a, b): number => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [openedIssueComments, openedIssueNudges]);

    React.useEffect((): void => {
        window.localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));
    }, [issues]);

    React.useEffect((): void => {
        window.localStorage.setItem(NUDGE_READ_STORAGE_KEY, JSON.stringify(Array.from(readNudgeIds)));
    }, [readNudgeIds]);

    React.useEffect((): void => {
        window.localStorage.setItem(ISSUE_COMMENT_STORAGE_KEY, JSON.stringify(issueComments));
    }, [issueComments]);

    React.useEffect((): void => {
        if (activeResultIndex >= filteredIssues.length) {
            setActiveResultIndex(0);
        }
    }, [activeResultIndex, filteredIssues.length]);

    const closeCommandMode = React.useCallback((reason: string): void => {
        setIsCommandModeOpen(false);
        setCommandSearch('');
        setActiveResultIndex(0);
        setLastShortcutEvent(reason);
    }, []);

    const openIssueDetail = React.useCallback((issueId: string): void => {
        setOpenedIssueId(issueId);
        setCommentDraft('');
        setCommentFeedback('');
        setNudgeFeedback('');
        setLastShortcutEvent(`Opened issue detail (${issueId})`);
    }, []);

    const openCreateModal = React.useCallback((reason: string): void => {
        setIsCreateModalOpen(true);
        setNewIssueTitle('');
        setLastShortcutEvent(reason);
    }, []);

    const openIssueFromNotification = React.useCallback((event: IssueStatusNudgeRequested): void => {
        setReadNudgeIds((current): Set<string> => {
            const next = new Set(current);
            next.add(event.id);
            return next;
        });
        setIsNotificationOpen(false);
        openIssueDetail(event.issueId);
        setLastShortcutEvent(`Opened nudged issue (${event.issueId}) from notifications`);
        window.requestAnimationFrame((): void => {
            commentInputReference.current?.focus();
        });
    }, [openIssueDetail]);

    const submitComment = React.useCallback((): void => {
        if (!openedIssueId) {
            return;
        }

        const body = commentDraft.trim();
        if (body.length === 0) {
            setCommentFeedback('Comment is empty.');
            return;
        }

        const nextComment: IssueComment = {
            id: `comment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            issueId: openedIssueId,
            author: currentViewer,
            body,
            createdAt: new Date().toISOString()
        };

        setIssueComments((current): Record<string, IssueComment[]> => {
            const existing = current[openedIssueId] ?? [];
            return {
                ...current,
                [openedIssueId]: [nextComment, ...existing]
            };
        });
        setCommentDraft('');
        setCommentFeedback('Comment posted.');
        setLastShortcutEvent(`Posted status update comment (${openedIssueId})`);
    }, [commentDraft, currentViewer, openedIssueId]);

    const runMoveShortcut = React.useCallback(
        (direction: 'next' | 'previous', reason: string): void => {
            if (selectedIssueIds.size > 0) {
                setIssues((currentIssues): Issue[] => {
                    if (direction === 'next') {
                        return moveIssuesToNextBucket(currentIssues, selectedIssueIds);
                    }

                    return moveIssuesToPreviousBucket(currentIssues, selectedIssueIds);
                });
                setLastShortcutEvent(
                    `Moved ${selectedIssueIds.size} selected issue(s) to ${direction} bucket (${reason})`,
                );
                return;
            }

            if (isCommandModeOpen && filteredIssues.length > 0) {
                const issueToMove = filteredIssues[activeResultIndex] ?? filteredIssues[0];
                if (issueToMove) {
                    setIssues((currentIssues): Issue[] => {
                        return moveIssue(
                            currentIssues,
                            issueToMove.id,
                            direction === 'next'
                                ? getNextStatus(issueToMove.status)
                                : getPreviousStatus(issueToMove.status),
                        );
                    });
                    setLastShortcutEvent(
                        `Moved highlighted issue (${issueToMove.id}) to ${direction} bucket (${reason})`,
                    );
                    return;
                }
            }

            setLastShortcutEvent(`Move ignored: no selected issue (${reason})`);
        },
        [activeResultIndex, filteredIssues, isCommandModeOpen, selectedIssueIds],
    );

    const runReorderShortcut = React.useCallback(
        (direction: 'up' | 'down', reason: string, explicitIssueId?: string): void => {
            const selectedIssue =
                issues.find((issue): boolean => selectedIssueIds.has(issue.id)) ?? null;
            const commandIssue =
                isCommandModeOpen && filteredIssues.length > 0
                    ? (filteredIssues[activeResultIndex] ?? filteredIssues[0] ?? null)
                    : null;
            const explicitIssue =
                explicitIssueId
                    ? (issues.find((issue): boolean => issue.id === explicitIssueId) ?? null)
                    : null;
            const issueToReorder = explicitIssue ?? selectedIssue ?? commandIssue;

            if (!issueToReorder) {
                setLastShortcutEvent(`Reorder ignored: no selected issue (${reason})`);
                return;
            }

            const reordered = reorderIssueWithinBucket(issues, issueToReorder.id, direction);
            if (reordered === issues) {
                setLastShortcutEvent(
                    `Reorder ignored: already at ${direction === 'up' ? 'top' : 'bottom'} (${reason})`,
                );
                return;
            }

            setIssues(reordered);
            setLastShortcutEvent(
                `Reordered issue (${issueToReorder.id}) ${direction} in ${statusLabel[issueToReorder.status]} (${reason})`,
            );
        },
        [activeResultIndex, filteredIssues, isCommandModeOpen, issues, selectedIssueIds],
    );

    React.useEffect((): (() => void) => {
        const onKeyDown = (event: KeyboardEvent): void => {
            const key = event.key.toLowerCase();
            const code = event.code;

            if (event.repeat) {
                return;
            }

            if (key === 'escape') {
                if (isNotificationOpen) {
                    event.preventDefault();
                    setIsNotificationOpen(false);
                    setLastShortcutEvent('Closed notifications (Esc)');
                    return;
                }

                if (isCreateModalOpen) {
                    event.preventDefault();
                    setIsCreateModalOpen(false);
                    setLastShortcutEvent('Closed create ticket modal (Esc)');
                    return;
                }

                if (openedIssueId) {
                    event.preventDefault();
                    setOpenedIssueId(null);
                    setLastShortcutEvent('Closed issue detail (Esc)');
                    return;
                }

                if (isCommandModeOpen) {
                    event.preventDefault();
                    closeCommandMode('Closed command mode (Esc)');
                    return;
                }
            }

            if (event.altKey && code === 'KeyK') {
                event.preventDefault();
                setIsCommandModeOpen(true);
                setActiveResultIndex(0);
                setLastShortcutEvent('Opened command mode (Option + K)');
                return;
            }

            if (event.altKey && code === 'KeyN') {
                event.preventDefault();
                runMoveShortcut('next', 'Option + N');
                return;
            }

            if (event.altKey && code === 'KeyB') {
                event.preventDefault();
                runMoveShortcut('previous', 'Option + B');
                return;
            }

            if (event.altKey && event.shiftKey && code === 'ArrowUp') {
                event.preventDefault();
                runReorderShortcut('up', 'Option + Shift + ArrowUp');
                return;
            }

            if (event.altKey && event.shiftKey && code === 'ArrowDown') {
                event.preventDefault();
                runReorderShortcut('down', 'Option + Shift + ArrowDown');
                return;
            }

            if (isCreateModalOpen || openedIssueId) {
                return;
            }

            const typingTarget = isTypingTarget(event.target);

            if (isCommandModeOpen) {
                if (key === 'arrowdown' && filteredIssues.length > 0) {
                    event.preventDefault();
                    setActiveResultIndex((current): number => (current + 1) % filteredIssues.length);
                    return;
                }

                if (key === 'arrowup' && filteredIssues.length > 0) {
                    event.preventDefault();
                    setActiveResultIndex((current): number => {
                        if (current === 0) {
                            return filteredIssues.length - 1;
                        }

                        return current - 1;
                    });
                    return;
                }

                if (key === 'enter' && filteredIssues.length > 0) {
                    event.preventDefault();
                    const issueToOpen = filteredIssues[activeResultIndex] ?? filteredIssues[0];
                    if (issueToOpen) {
                        closeCommandMode(`Opened issue from command mode (${issueToOpen.id})`);
                        openIssueDetail(issueToOpen.id);
                    }
                    return;
                }

                if (commandSearch.trim().length === 0 && key === 'c') {
                    event.preventDefault();
                    closeCommandMode('Closed command mode (Create flow)');
                    openCreateModal('Opened create ticket modal (Command mode + c)');
                    return;
                }

                if (key === 'n') {
                    event.preventDefault();
                    runMoveShortcut('next', 'Command mode + n');
                    return;
                }

                if (key === 'b') {
                    event.preventDefault();
                    runMoveShortcut('previous', 'Command mode + b');
                    return;
                }
            }

            if (typingTarget) {
                return;
            }

            if (key === 'c' && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                openCreateModal('Opened create ticket modal (Global c)');
                return;
            }

            if (key === 'n' && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                runMoveShortcut('next', 'Global n');
                return;
            }

            if (key === 'b' && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                runMoveShortcut('previous', 'Global b');
            }
        };

        document.addEventListener('keydown', onKeyDown, true);

        return (): void => {
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [
        activeResultIndex,
        closeCommandMode,
        filteredIssues,
        isCommandModeOpen,
        isCreateModalOpen,
        isNotificationOpen,
        openCreateModal,
        openIssueDetail,
        openedIssueId,
        runReorderShortcut,
        runMoveShortcut,
        selectedIssueIds
    ]);

    React.useEffect((): void => {
        if (!isCommandModeOpen || !commandInputReference.current) {
            return;
        }

        commandInputReference.current.focus();
    }, [isCommandModeOpen]);

    React.useEffect((): void => {
        if (!isCreateModalOpen || !createTitleInputReference.current) {
            return;
        }

        createTitleInputReference.current.focus();
    }, [isCreateModalOpen]);

    React.useEffect((): void => {
        if (!openedIssueId || !commentInputReference.current) {
            return;
        }

        commentInputReference.current.focus();
    }, [openedIssueId]);

    React.useEffect((): void => {
        if (!openedIssueId) {
            setLatestNudgeEvent(null);
            return;
        }

        const lastForIssue = nudgeAuditEvents.find((event): boolean => event.issueId === openedIssueId) ?? null;
        setLatestNudgeEvent(lastForIssue);
    }, [nudgeAuditEvents, openedIssueId]);

    return (
        <main className="kanban-page theme-light">
            <div className={`kanban-layout ${openedIssue ? 'with-detail' : ''}`}>
                <section className="kanban-main">
                    <header className="kanban-header">
                        <div>
                            <h1>Kanban Board</h1>
                            <p>Simple board with Todo, In Progress, Parked, and Done.</p>
                        </div>
                        <div className="header-actions">
                            <label className="viewer-switch">
                                Viewer
                                <select
                                    value={currentViewer}
                                    onChange={(event): void => {
                                        setCurrentViewer(event.target.value);
                                    }}
                                    aria-label="Current viewer"
                                >
                                    {ownerOptions.map((owner): React.ReactElement => (
                                        <option key={owner} value={owner}>
                                            {owner}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                className="bell-button"
                                aria-label="Open notifications"
                                onClick={(): void => {
                                    setIsNotificationOpen((current): boolean => !current);
                                }}
                            >
                                <span className="bell-icon" aria-hidden="true">
                                    🔔
                                </span>
                                {unreadNotificationCount > 0 ? (
                                    <span className="bell-badge">{unreadNotificationCount}</span>
                                ) : null}
                            </button>
                        </div>
                    </header>

                    <section className="shortcut-status" aria-live="polite">
                        <p>
                            <strong>Shortcut manager:</strong> {isCommandModeOpen ? 'Command mode open' : 'Idle'}
                        </p>
                        <p>
                            <strong>Last shortcut:</strong> {lastShortcutEvent}
                        </p>
                        <p className="shortcut-help">
                            Try `Option + K`, `Esc`, `c`, `Option + N`, `Option + B`, `Option + Shift + ↑/↓`, and
                            `Enter`.
                        </p>
                    </section>

                    {isNotificationOpen ? (
                        <section className="notification-panel" aria-label="Nudge notifications">
                            <header className="notification-head">
                                <h2>Nudges for {currentViewer}</h2>
                                <button
                                    type="button"
                                    onClick={(): void => {
                                        setReadNudgeIds((current): Set<string> => {
                                            const next = new Set(current);
                                            for (const event of notificationsForViewer) {
                                                next.add(event.id);
                                            }
                                            return next;
                                        });
                                        setLastShortcutEvent(`Marked nudges as read (${currentViewer})`);
                                    }}
                                >
                                    Mark all read
                                </button>
                            </header>
                            <div className="notification-list">
                                {notificationsForViewer.length === 0 ? (
                                    <p className="notification-empty">No nudges for this viewer.</p>
                                ) : (
                                    notificationsForViewer.map((event): React.ReactElement => (
                                        <button
                                            key={event.id}
                                            type="button"
                                            className={`notification-item ${readNudgeIds.has(event.id) ? '' : 'is-unread'}`}
                                            onClick={(): void => {
                                                openIssueFromNotification(event);
                                            }}
                                        >
                                            <strong>{event.issueId}</strong>
                                            <span>{event.message}</span>
                                            <small>{new Date(event.createdAt).toLocaleString()}</small>
                                        </button>
                                    ))
                                )}
                            </div>
                        </section>
                    ) : null}

                    <section className="kanban-grid" aria-label="Kanban board">
                        {statusOrder.map((status): React.ReactElement => {
                            const columnIssues = issues.filter((issue): boolean => issue.status === status);

                            return (
                                <article
                                    key={status}
                                    className="kanban-column"
                                    onDragOver={(event): void => {
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(event): void => {
                                        event.preventDefault();
                                        const dragId = draggedIssueId || event.dataTransfer.getData('text/plain');
                                        if (!dragId) {
                                            return;
                                        }

                                        setIssues((currentIssues): Issue[] =>
                                            moveIssueByDrop(currentIssues, dragId, status, columnIssues.length),
                                        );
                                        setSelectedIssueIds(new Set([dragId]));
                                        setDraggedIssueId(null);
                                        setLastShortcutEvent(
                                            `Dropped issue (${dragId}) to end of ${statusLabel[status]}`,
                                        );
                                    }}
                                >
                                    <div className="column-head">
                                        <h2>{statusLabel[status]}</h2>
                                        <span>{columnIssues.length}</span>
                                    </div>

                                    <div
                                        className="column-body"
                                        onDragOver={(event): void => {
                                            event.preventDefault();
                                            event.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDrop={(event): void => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            if (event.target !== event.currentTarget) {
                                                return;
                                            }
                                            const dragId =
                                                draggedIssueId || event.dataTransfer.getData('text/plain');
                                            if (!dragId) {
                                                return;
                                            }

                                            setIssues((currentIssues): Issue[] =>
                                                moveIssueByDrop(
                                                    currentIssues,
                                                    dragId,
                                                    status,
                                                    columnIssues.length,
                                                ),
                                            );
                                            setSelectedIssueIds(new Set([dragId]));
                                            setDraggedIssueId(null);
                                            setLastShortcutEvent(
                                                `Dropped issue (${dragId}) to end of ${statusLabel[status]}`,
                                            );
                                        }}
                                    >
                                        {columnIssues.map((issue): React.ReactElement => (
                                            <div
                                                key={issue.id}
                                                className={`issue-card ${selectedIssueIds.has(issue.id) ? 'issue-card-selected' : ''
                                                    }`}
                                                role="button"
                                                tabIndex={0}
                                                onClick={(): void => {
                                                    setSelectedIssueIds((current): Set<string> => {
                                                        const next = new Set(current);
                                                        if (next.has(issue.id)) {
                                                            next.delete(issue.id);
                                                        } else {
                                                            next.add(issue.id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                onDoubleClick={(): void => {
                                                    openIssueDetail(issue.id);
                                                }}
                                                onKeyDown={(event): void => {
                                                    if (event.key === 'Enter' && event.metaKey) {
                                                        event.preventDefault();
                                                        openIssueDetail(issue.id);
                                                        return;
                                                    }

                                                    if (event.key !== 'Enter' && event.key !== ' ') {
                                                        return;
                                                    }

                                                    event.preventDefault();
                                                    setSelectedIssueIds((current): Set<string> => {
                                                        const next = new Set(current);
                                                        if (next.has(issue.id)) {
                                                            next.delete(issue.id);
                                                        } else {
                                                            next.add(issue.id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                aria-pressed={selectedIssueIds.has(issue.id)}
                                                aria-label={`Issue ${issue.id}: ${issue.title}`}
                                                draggable
                                                onDragStart={(event): void => {
                                                    setDraggedIssueId(issue.id);
                                                    event.dataTransfer.effectAllowed = 'move';
                                                    event.dataTransfer.setData('text/plain', issue.id);
                                                    setLastShortcutEvent(`Dragging issue (${issue.id})`);
                                                }}
                                                onDragEnd={(): void => {
                                                    setDraggedIssueId(null);
                                                }}
                                                onDragOver={(event): void => {
                                                    event.preventDefault();
                                                    event.dataTransfer.dropEffect = 'move';
                                                }}
                                                onDrop={(event): void => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    const dragId =
                                                        draggedIssueId || event.dataTransfer.getData('text/plain');
                                                    if (!dragId) {
                                                        return;
                                                    }

                                                    const targetIndex = columnIssues.findIndex(
                                                        (columnIssue): boolean => columnIssue.id === issue.id,
                                                    );

                                                    setIssues((currentIssues): Issue[] =>
                                                        moveIssueByDrop(currentIssues, dragId, status, targetIndex),
                                                    );
                                                    setSelectedIssueIds(new Set([dragId]));
                                                    setDraggedIssueId(null);
                                                    setLastShortcutEvent(
                                                        `Dropped issue (${dragId}) in ${statusLabel[status]}`,
                                                    );
                                                }}
                                            >
                                                <p className="issue-id">{issue.id}</p>
                                                <h3>{issue.title}</h3>
                                                <p className="issue-owner">Owner: {issue.owner}</p>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                </section>

                {openedIssue ? (
                    <aside className="issue-detail-panel" aria-label="Issue detail panel">
                        <header className="issue-detail-header">
                            <h2>
                                {openedIssue.id} - {openedIssue.title}
                            </h2>
                            <button
                                type="button"
                                onClick={(): void => {
                                    setOpenedIssueId(null);
                                    setLastShortcutEvent(`Closed issue detail (${openedIssue.id})`);
                                }}
                            >
                                Close
                            </button>
                        </header>
                        <p className="detail-meta">
                            Owner: {openedIssue.owner} | Status: {statusLabel[openedIssue.status]}
                        </p>
                        <div className="panel-actions">
                            <button
                                type="button"
                                className="nudge-button"
                                onClick={async (): Promise<void> => {
                                    setIsNudging(true);
                                    setNudgeFeedback('');

                                    const result = await sendStatusNudge({
                                        issueId: openedIssue.id,
                                        issueTitle: openedIssue.title,
                                        owner: openedIssue.owner,
                                        requestedBy: 'Shashank',
                                        channel: 'in_app'
                                    });

                                    if (!result.ok) {
                                        setNudgeFeedback(`Nudge failed: ${result.error}`);
                                        setIsNudging(false);
                                        return;
                                    }

                                    setLatestNudgeEvent(result.event);
                                    setNudgeAuditEvents(getNudgeAuditTrail());
                                    setNudgeFeedback(`Nudge sent to @${result.event.owner} (in-app notification).`);
                                    setLastShortcutEvent(`Nudged owner for status (${openedIssue.id})`);
                                    setIsNudging(false);
                                }}
                                disabled={isNudging}
                            >
                                {isNudging ? 'Sending nudge...' : 'Nudge owner for status'}
                            </button>
                            {nudgeFeedback ? <p className="nudge-feedback">{nudgeFeedback}</p> : null}
                            {latestNudgeEvent ? (
                                <p className="nudge-meta">
                                    Last nudge: {new Date(latestNudgeEvent.createdAt).toLocaleString()} via{' '}
                                    {latestNudgeEvent.channel}
                                </p>
                            ) : null}
                        </div>
                        <label className="comment-label">
                            Comment
                            <textarea
                                ref={commentInputReference}
                                value={commentDraft}
                                onChange={(event): void => {
                                    setCommentDraft(event.target.value);
                                    if (commentFeedback) {
                                        setCommentFeedback('');
                                    }
                                }}
                                onKeyDown={(event): void => {
                                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                                        event.preventDefault();
                                        submitComment();
                                    }
                                }}
                                placeholder="Write your comment..."
                            />
                            <div className="comment-actions">
                                <button type="button" onClick={submitComment}>
                                    Post update
                                </button>
                                {commentFeedback ? <p className="comment-feedback">{commentFeedback}</p> : null}
                            </div>
                        </label>
                        <section className="communication-thread">
                            <h3>Communication thread</h3>
                            <div className="communication-list">
                                {communicationThread.length === 0 ? (
                                    <p className="comment-empty">No communication yet.</p>
                                ) : (
                                    communicationThread.map((item): React.ReactElement => (
                                        <article key={item.id} className="communication-item">
                                            <p>
                                                <span
                                                    className={`communication-badge ${item.kind === 'nudge' ? 'is-nudge' : 'is-comment'}`}
                                                >
                                                    {item.kind === 'nudge' ? 'NUDGE' : 'COMMENT'}
                                                </span>{' '}
                                                {item.text}
                                            </p>
                                            <small>
                                                {new Date(item.createdAt).toLocaleString()} by {item.author}
                                            </small>
                                        </article>
                                    ))
                                )}
                            </div>
                        </section>
                    </aside>
                ) : null}
            </div>

            {isCommandModeOpen ? (
                <div
                    className="command-palette-overlay"
                    onClick={(): void => {
                        closeCommandMode('Closed command mode (Backdrop click)');
                    }}
                    role="presentation"
                >
                    <section
                        className="command-palette"
                        onClick={(event): void => {
                            event.stopPropagation();
                        }}
                        aria-label="Command palette"
                    >
                        <header className="command-header">
                            <h2>Command Palette</h2>
                            <button
                                type="button"
                                onClick={(): void => {
                                    closeCommandMode('Closed command mode (Close button)');
                                }}
                            >
                                Esc
                            </button>
                        </header>
                        <input
                            ref={commandInputReference}
                            className="command-search"
                            value={commandSearch}
                            onChange={(event): void => {
                                setCommandSearch(event.target.value);
                                setActiveResultIndex(0);
                            }}
                            placeholder="Search issue by id, title, or owner..."
                            aria-label="Search issues"
                        />
                        <div className="command-results">
                            {filteredIssues.length === 0 ? (
                                <p className="command-empty">No matching issues.</p>
                            ) : (
                                filteredIssues.map((issue, index): React.ReactElement => (
                                    <button
                                        key={issue.id}
                                        type="button"
                                        className={`command-result-item ${index === activeResultIndex ? 'is-active' : ''
                                            }`}
                                        onMouseEnter={(): void => {
                                            setActiveResultIndex(index);
                                        }}
                                        onClick={(): void => {
                                            closeCommandMode(`Opened issue from command click (${issue.id})`);
                                            openIssueDetail(issue.id);
                                        }}
                                    >
                                        <span>{issue.id}</span>
                                        <strong>{issue.title}</strong>
                                        <small>{issue.owner}</small>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            ) : null}

            {isCreateModalOpen ? (
                <div
                    className="dialog-overlay"
                    role="presentation"
                    onClick={(): void => {
                        setIsCreateModalOpen(false);
                        setLastShortcutEvent('Closed create ticket modal (Backdrop click)');
                    }}
                >
                    <section
                        className="dialog"
                        onClick={(event): void => {
                            event.stopPropagation();
                        }}
                    >
                        <header className="dialog-header">
                            <h2>Create Ticket</h2>
                            <button
                                type="button"
                                onClick={(): void => {
                                    setIsCreateModalOpen(false);
                                    setLastShortcutEvent('Closed create ticket modal (Close button)');
                                }}
                            >
                                Close
                            </button>
                        </header>
                        <form
                            className="dialog-form"
                            onSubmit={(event): void => {
                                event.preventDefault();
                                const title = newIssueTitle.trim();
                                const owner = newIssueOwner.trim();

                                if (title.length === 0) {
                                    return;
                                }

                                const nextIssue: Issue = {
                                    id: getNextIssueId(issues),
                                    title,
                                    owner: owner.length === 0 ? 'Unassigned' : owner,
                                    status: 'todo'
                                };

                                setIssues((currentIssues): Issue[] => [nextIssue, ...currentIssues]);
                                setSelectedIssueIds((current): Set<string> => {
                                    const next = new Set(current);
                                    next.add(nextIssue.id);
                                    return next;
                                });
                                setIsCreateModalOpen(false);
                                setLastShortcutEvent(`Created ticket (${nextIssue.id})`);
                            }}
                        >
                            <label>
                                Title
                                <input
                                    ref={createTitleInputReference}
                                    value={newIssueTitle}
                                    onChange={(event): void => {
                                        setNewIssueTitle(event.target.value);
                                    }}
                                    placeholder="Enter ticket title"
                                />
                            </label>
                            <label>
                                Owner
                                <input
                                    value={newIssueOwner}
                                    onChange={(event): void => {
                                        setNewIssueOwner(event.target.value);
                                    }}
                                    placeholder="Enter owner"
                                />
                            </label>
                            <button type="submit">Create ticket</button>
                        </form>
                    </section>
                </div>
            ) : null}

        </main>
    );
}
