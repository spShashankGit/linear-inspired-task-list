import { describe, expect, it } from 'vitest';

import {
    getNextIssueId,
    getNextStatus,
    getPreviousStatus,
    moveIssue,
    moveIssuesToNextBucket,
    moveIssuesToPreviousBucket,
    reorderIssueWithinBucket,
    type Issue
} from './kanbanLogic';

const seedIssues: Issue[] = [
    { id: 'KAN-101', title: 'A', owner: 'Shashank', status: 'todo' },
    { id: 'KAN-102', title: 'B', owner: 'Ariana', status: 'in_progress' },
    { id: 'KAN-103', title: 'C', owner: 'Max', status: 'parked' },
    { id: 'KAN-104', title: 'D', owner: 'Nina', status: 'done' }
];

describe('kanbanLogic', (): void => {
    it('moves status to next bucket with done clamp', (): void => {
        expect(getNextStatus('todo')).toBe('in_progress');
        expect(getNextStatus('in_progress')).toBe('parked');
        expect(getNextStatus('parked')).toBe('done');
        expect(getNextStatus('done')).toBe('done');
    });

    it('moves status to previous bucket with todo clamp', (): void => {
        expect(getPreviousStatus('done')).toBe('parked');
        expect(getPreviousStatus('parked')).toBe('in_progress');
        expect(getPreviousStatus('in_progress')).toBe('todo');
        expect(getPreviousStatus('todo')).toBe('todo');
    });

    it('moves one issue to explicit status', (): void => {
        const moved = moveIssue(seedIssues, 'KAN-101', 'done');
        expect(moved.find((issue): boolean => issue.id === 'KAN-101')?.status).toBe('done');
        expect(moved.find((issue): boolean => issue.id === 'KAN-102')?.status).toBe('in_progress');
    });

    it('moves selected issues to next bucket', (): void => {
        const moved = moveIssuesToNextBucket(seedIssues, new Set(['KAN-101', 'KAN-103']));
        expect(moved.find((issue): boolean => issue.id === 'KAN-101')?.status).toBe('in_progress');
        expect(moved.find((issue): boolean => issue.id === 'KAN-103')?.status).toBe('done');
    });

    it('moves selected issues to previous bucket', (): void => {
        const moved = moveIssuesToPreviousBucket(seedIssues, new Set(['KAN-102', 'KAN-104']));
        expect(moved.find((issue): boolean => issue.id === 'KAN-102')?.status).toBe('todo');
        expect(moved.find((issue): boolean => issue.id === 'KAN-104')?.status).toBe('parked');
    });

    it('builds next issue id from max numeric value', (): void => {
        expect(getNextIssueId(seedIssues)).toBe('KAN-105');
        expect(getNextIssueId([])).toBe('KAN-101');
        expect(getNextIssueId([{ id: 'KAN-999', title: 'x', owner: 'x', status: 'todo' }])).toBe(
            'KAN-1000',
        );
    });

    it('reorders issue down within the same bucket only', (): void => {
        const issues: Issue[] = [
            { id: 'KAN-101', title: 'A', owner: 'Shashank', status: 'todo' },
            { id: 'KAN-102', title: 'B', owner: 'Ariana', status: 'todo' },
            { id: 'KAN-103', title: 'C', owner: 'Max', status: 'in_progress' },
            { id: 'KAN-104', title: 'D', owner: 'Nina', status: 'todo' }
        ];

        const reordered = reorderIssueWithinBucket(issues, 'KAN-101', 'down');
        const todoOrder = reordered
            .filter((issue): boolean => issue.status === 'todo')
            .map((issue): string => issue.id);

        expect(todoOrder).toEqual(['KAN-102', 'KAN-101', 'KAN-104']);
        expect(reordered.find((issue): boolean => issue.id === 'KAN-103')?.status).toBe('in_progress');
    });

    it('does not reorder when already at the top or bottom', (): void => {
        const issues: Issue[] = [
            { id: 'KAN-101', title: 'A', owner: 'Shashank', status: 'todo' },
            { id: 'KAN-102', title: 'B', owner: 'Ariana', status: 'todo' },
            { id: 'KAN-103', title: 'C', owner: 'Max', status: 'todo' }
        ];

        expect(reorderIssueWithinBucket(issues, 'KAN-101', 'up')).toBe(issues);
        expect(reorderIssueWithinBucket(issues, 'KAN-103', 'down')).toBe(issues);
    });
});
