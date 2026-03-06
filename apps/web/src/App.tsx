import React from 'react';

type IssueStatus = 'todo' | 'in_progress' | 'parked' | 'done';

type Issue = {
    id: string;
    title: string;
    owner: string;
    status: IssueStatus;
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

function moveIssue(
    issues: Issue[],
    issueId: string,
    targetStatus: IssueStatus,
): Issue[] {
    return issues.map((issue): Issue => {
        if (issue.id !== issueId) {
            return issue;
        }

        return { ...issue, status: targetStatus };
    });
}

export function App(): JSX.Element {
    const [issues, setIssues] = React.useState<Issue[]>(seedIssues);

    return (
        <main className="kanban-page theme-light">
            <header className="kanban-header">
                <div>
                    <h1>Kanban Board</h1>
                    <p>Simple board with Todo, In Progress, Parked, and Done.</p>
                </div>
            </header>

            <section className="kanban-grid" aria-label="Kanban board">
                {statusOrder.map((status): JSX.Element => {
                    const columnIssues = issues.filter((issue): boolean => issue.status === status);

                    return (
                        <article key={status} className="kanban-column">
                            <div className="column-head">
                                <h2>{statusLabel[status]}</h2>
                                <span>{columnIssues.length}</span>
                            </div>

                            <div className="column-body">
                                {columnIssues.map((issue): JSX.Element => (
                                    <div key={issue.id} className="issue-card">
                                        <p className="issue-id">{issue.id}</p>
                                        <h3>{issue.title}</h3>
                                        <p className="issue-owner">Owner: {issue.owner}</p>
                                        <div className="issue-actions">
                                            {statusOrder.map((nextStatus): JSX.Element | null => {
                                                if (nextStatus === issue.status) {
                                                    return null;
                                                }

                                                return (
                                                    <button
                                                        key={nextStatus}
                                                        type="button"
                                                        onClick={(): void => {
                                                            setIssues((currentIssues): Issue[] =>
                                                                moveIssue(currentIssues, issue.id, nextStatus),
                                                            );
                                                        }}
                                                    >
                                                        Move to {statusLabel[nextStatus]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
