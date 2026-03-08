import { describe, expect, it } from 'vitest';

import {
    createMemoryStorage,
    getNudgeAuditTrail,
    sendStatusNudge,
    validateNudgeRequest
} from './nudgeService';

describe('nudgeService', (): void => {
    it('validates required fields', (): void => {
        expect(
            validateNudgeRequest({
                issueId: '',
                issueTitle: 'Test',
                owner: 'Max',
                requestedBy: 'Shashank',
                channel: 'in_app'
            }),
        ).toBe('Issue id is required.');

        expect(
            validateNudgeRequest({
                issueId: 'KAN-999',
                issueTitle: '',
                owner: 'Max',
                requestedBy: 'Shashank',
                channel: 'in_app'
            }),
        ).toBe('Issue title is required.');
    });

    it('creates and stores typed nudge audit event', async (): Promise<void> => {
        const storage = createMemoryStorage();
        const result = await sendStatusNudge(
            {
                issueId: 'KAN-201',
                issueTitle: 'Improve command flow',
                owner: 'Ariana',
                requestedBy: 'Shashank',
                channel: 'in_app'
            },
            storage,
        );

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.event.type).toBe('IssueStatusNudgeRequested');
        expect(result.event.channel).toBe('in_app');
        expect(result.event.message).toContain('@Ariana');
        expect(result.event.message).toContain('KAN-201');

        const audit = getNudgeAuditTrail(storage);
        expect(audit).toHaveLength(1);
        expect(audit[0]?.id).toBe(result.event.id);
    });
});
