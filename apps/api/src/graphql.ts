import { createSchema } from 'graphql-yoga';
import { z } from 'zod';

import type { Issue, IssueComment, IssueStatus, NudgeEvent, SessionState } from './types.js';

export type GraphQLContext = {
    sessionId: string;
    state: SessionState;
    saveState: (nextState: SessionState) => Promise<void>;
};

const issueStatusOrder = ['todo', 'in_progress', 'parked', 'done'] as const;
const issueStatusSet = new Set<IssueStatus>(issueStatusOrder);

function getNextIssueId(issues: Issue[]): string {
    const numericIds = issues
        .map((issue): number => {
            const match = issue.id.match(/KAN-(\d+)/);
            if (!match?.[1]) {
                return 0;
            }

            return Number.parseInt(match[1], 10);
        })
        .filter((value): boolean => Number.isFinite(value));

    const currentMax = numericIds.length === 0 ? 100 : Math.max(...numericIds);
    return `KAN-${currentMax + 1}`;
}

function mergeCommunicationThread(issueId: string, comments: IssueComment[], nudges: NudgeEvent[]) {
    return [
        ...comments
            .filter((comment): boolean => comment.issueId === issueId)
            .map((comment) => ({
                id: comment.id,
                kind: 'COMMENT' as const,
                createdAt: comment.createdAt,
                author: comment.author,
                text: comment.body
            })),
        ...nudges
            .filter((nudge): boolean => nudge.issueId === issueId)
            .map((nudge) => ({
                id: nudge.id,
                kind: 'NUDGE' as const,
                createdAt: nudge.createdAt,
                author: nudge.requestedBy,
                text: nudge.message
            }))
    ].sort((a, b): number => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const createIssueInputSchema = z.object({
    title: z.string().trim().min(1),
    owner: z.string().trim().min(1)
});

const moveIssueInputSchema = z.object({
    issueId: z.string().trim().min(1),
    status: z.string().trim().refine((value): value is IssueStatus => issueStatusSet.has(value as IssueStatus), {
        message: 'Invalid issue status.'
    })
});

const nudgeInputSchema = z.object({
    issueId: z.string().trim().min(1),
    requestedBy: z.string().trim().min(1),
    channel: z.literal('in_app')
});

const postCommentInputSchema = z.object({
    issueId: z.string().trim().min(1),
    author: z.string().trim().min(1),
    body: z.string().trim().min(1)
});

const markReadInputSchema = z.object({
    viewer: z.string().trim().min(1),
    nudgeIds: z.array(z.string().trim().min(1)).min(1)
});

export const schema = createSchema<GraphQLContext>({
    typeDefs: /* GraphQL */ `
        type Issue {
            id: ID!
            title: String!
            owner: String!
            status: String!
        }

        type NudgeEvent {
            id: ID!
            createdAt: String!
            issueId: String!
            issueTitle: String!
            owner: String!
            requestedBy: String!
            channel: String!
            message: String!
        }

        type IssueComment {
            id: ID!
            issueId: String!
            author: String!
            body: String!
            createdAt: String!
        }

        type CommunicationItem {
            id: ID!
            kind: String!
            createdAt: String!
            author: String!
            text: String!
        }

        type NotificationItem {
            event: NudgeEvent!
            unread: Boolean!
        }

        type IssueDetail {
            issue: Issue!
            comments: [IssueComment!]!
            nudges: [NudgeEvent!]!
            communication: [CommunicationItem!]!
        }

        type BoardView {
            issues: [Issue!]!
        }

        type Query {
            board: BoardView!
            issueDetail(issueId: String!): IssueDetail
            notificationsForViewer(viewer: String!): [NotificationItem!]!
        }

        input CreateIssueInput {
            title: String!
            owner: String!
        }

        input MoveIssueInput {
            issueId: String!
            status: String!
        }

        input NudgeOwnerInput {
            issueId: String!
            requestedBy: String!
            channel: String!
        }

        input PostCommentInput {
            issueId: String!
            author: String!
            body: String!
        }

        input MarkNudgesReadInput {
            viewer: String!
            nudgeIds: [String!]!
        }

        type Mutation {
            createIssue(input: CreateIssueInput!): Issue!
            moveIssue(input: MoveIssueInput!): Issue!
            nudgeOwner(input: NudgeOwnerInput!): NudgeEvent!
            postComment(input: PostCommentInput!): IssueComment!
            markNudgesRead(input: MarkNudgesReadInput!): Boolean!
        }
    `,
    resolvers: {
        Query: {
            board: (_parent, _args, context) => {
                return { issues: context.state.issues };
            },
            issueDetail: (_parent, args: { issueId: string }, context) => {
                const issue = context.state.issues.find((candidate): boolean => candidate.id === args.issueId);
                if (!issue) {
                    return null;
                }

                const comments = context.state.comments[args.issueId] ?? [];
                const nudges = context.state.nudges.filter((event): boolean => event.issueId === args.issueId);
                return {
                    issue,
                    comments,
                    nudges,
                    communication: mergeCommunicationThread(args.issueId, comments, nudges)
                };
            },
            notificationsForViewer: (_parent, args: { viewer: string }, context) => {
                const viewer = args.viewer.trim();
                const readIds = new Set(context.state.readNudgeIdsByViewer[viewer] ?? []);
                return context.state.nudges
                    .filter((event): boolean => event.owner === viewer)
                    .sort((a, b): number => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((event) => ({ event, unread: !readIds.has(event.id) }));
            }
        },
        Mutation: {
            createIssue: async (_parent, args: { input: unknown }, context) => {
                const parsed = createIssueInputSchema.parse(args.input);
                const nextIssue: Issue = {
                    id: getNextIssueId(context.state.issues),
                    title: parsed.title,
                    owner: parsed.owner,
                    status: 'todo'
                };

                const nextState: SessionState = {
                    ...context.state,
                    issues: [nextIssue, ...context.state.issues]
                };
                await context.saveState(nextState);
                return nextIssue;
            },
            moveIssue: async (_parent, args: { input: unknown }, context) => {
                const parsed = moveIssueInputSchema.parse(args.input);
                const target = context.state.issues.find((issue): boolean => issue.id === parsed.issueId);
                if (!target) {
                    throw new Error(`Issue not found: ${parsed.issueId}`);
                }

                const nextIssue: Issue = { ...target, status: parsed.status };
                const nextState: SessionState = {
                    ...context.state,
                    issues: context.state.issues.map((issue): Issue =>
                        issue.id === parsed.issueId ? nextIssue : issue,
                    )
                };

                await context.saveState(nextState);
                return nextIssue;
            },
            nudgeOwner: async (_parent, args: { input: unknown }, context) => {
                const parsed = nudgeInputSchema.parse(args.input);
                const issue = context.state.issues.find((candidate): boolean => candidate.id === parsed.issueId);
                if (!issue) {
                    throw new Error(`Issue not found: ${parsed.issueId}`);
                }

                const event: NudgeEvent = {
                    id: `nudge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
                    type: 'IssueStatusNudgeRequested',
                    createdAt: new Date().toISOString(),
                    issueId: issue.id,
                    issueTitle: issue.title,
                    owner: issue.owner,
                    requestedBy: parsed.requestedBy,
                    channel: parsed.channel,
                    message: `@${issue.owner} can you share a quick status update on ${issue.id}?`
                };

                const nextState: SessionState = {
                    ...context.state,
                    nudges: [event, ...context.state.nudges]
                };

                await context.saveState(nextState);
                return event;
            },
            postComment: async (_parent, args: { input: unknown }, context) => {
                const parsed = postCommentInputSchema.parse(args.input);
                const issue = context.state.issues.find((candidate): boolean => candidate.id === parsed.issueId);
                if (!issue) {
                    throw new Error(`Issue not found: ${parsed.issueId}`);
                }

                const nextComment: IssueComment = {
                    id: `comment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
                    issueId: parsed.issueId,
                    author: parsed.author,
                    body: parsed.body,
                    createdAt: new Date().toISOString()
                };

                const existing = context.state.comments[parsed.issueId] ?? [];
                const nextState: SessionState = {
                    ...context.state,
                    comments: {
                        ...context.state.comments,
                        [parsed.issueId]: [nextComment, ...existing]
                    }
                };

                await context.saveState(nextState);
                return nextComment;
            },
            markNudgesRead: async (_parent, args: { input: unknown }, context) => {
                const parsed = markReadInputSchema.parse(args.input);
                const existing = new Set(context.state.readNudgeIdsByViewer[parsed.viewer] ?? []);
                for (const nudgeId of parsed.nudgeIds) {
                    existing.add(nudgeId);
                }

                const nextState: SessionState = {
                    ...context.state,
                    readNudgeIdsByViewer: {
                        ...context.state.readNudgeIdsByViewer,
                        [parsed.viewer]: Array.from(existing)
                    }
                };

                await context.saveState(nextState);
                return true;
            }
        }
    }
});
