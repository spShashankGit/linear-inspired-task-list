export type IssueStatus = 'todo' | 'in_progress' | 'parked' | 'done';

export type Issue = {
    id: string;
    title: string;
    owner: string;
    status: IssueStatus;
};

export const statusOrder: IssueStatus[] = ['todo', 'in_progress', 'parked', 'done'];

export function getNextStatus(currentStatus: IssueStatus): IssueStatus {
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex < 0 || currentIndex === statusOrder.length - 1) {
        return 'done';
    }

    return statusOrder[currentIndex + 1]!;
}

export function getPreviousStatus(currentStatus: IssueStatus): IssueStatus {
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex <= 0) {
        return 'todo';
    }

    return statusOrder[currentIndex - 1]!;
}

export function moveIssue(issues: Issue[], issueId: string, targetStatus: IssueStatus): Issue[] {
    return issues.map((issue): Issue => {
        if (issue.id !== issueId) {
            return issue;
        }

        return { ...issue, status: targetStatus };
    });
}

export function moveIssuesToNextBucket(issues: Issue[], issueIds: Set<string>): Issue[] {
    return issues.map((issue): Issue => {
        if (!issueIds.has(issue.id)) {
            return issue;
        }

        return { ...issue, status: getNextStatus(issue.status) };
    });
}

export function moveIssuesToPreviousBucket(issues: Issue[], issueIds: Set<string>): Issue[] {
    return issues.map((issue): Issue => {
        if (!issueIds.has(issue.id)) {
            return issue;
        }

        return { ...issue, status: getPreviousStatus(issue.status) };
    });
}

export function reorderIssueWithinBucket(issues: Issue[], issueId: string, direction: 'up' | 'down'): Issue[] {
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

export function getNextIssueId(issues: Issue[]): string {
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
