import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const statusOrder = ['todo', 'in_progress', 'parked', 'done'];
const statusLabel = {
    todo: 'Todo',
    in_progress: 'In Progress',
    parked: 'Parked',
    done: 'Done'
};
const seedIssues = [
    { id: 'KAN-101', title: 'Build command palette shell', owner: 'Shashank', status: 'todo' },
    { id: 'KAN-102', title: 'Add bulk-select checkboxes', owner: 'Ariana', status: 'in_progress' },
    { id: 'KAN-103', title: 'Wire in-app status nudge', owner: 'Max', status: 'parked' },
    { id: 'KAN-104', title: 'Create audit event schema', owner: 'Nina', status: 'done' }
];
const ISSUE_STORAGE_KEY = 'kanban.issues.v1';
function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}
function getNextStatus(currentStatus) {
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex < 0 || currentIndex === statusOrder.length - 1) {
        return 'done';
    }
    return statusOrder[currentIndex + 1];
}
function getPreviousStatus(currentStatus) {
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex <= 0) {
        return 'todo';
    }
    return statusOrder[currentIndex - 1];
}
function moveIssue(issues, issueId, targetStatus) {
    return issues.map((issue) => {
        if (issue.id !== issueId) {
            return issue;
        }
        return { ...issue, status: targetStatus };
    });
}
function moveIssuesToNextBucket(issues, issueIds) {
    return issues.map((issue) => {
        if (!issueIds.has(issue.id)) {
            return issue;
        }
        return { ...issue, status: getNextStatus(issue.status) };
    });
}
function moveIssuesToPreviousBucket(issues, issueIds) {
    return issues.map((issue) => {
        if (!issueIds.has(issue.id)) {
            return issue;
        }
        return { ...issue, status: getPreviousStatus(issue.status) };
    });
}
function getNextIssueId(issues) {
    const numericIds = issues
        .map((issue) => {
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
        .filter((value) => Number.isFinite(value));
    const currentMax = numericIds.length === 0 ? 100 : Math.max(...numericIds);
    return `KAN-${currentMax + 1}`;
}
export function App() {
    const [issues, setIssues] = React.useState(() => {
        const storedValue = window.localStorage.getItem(ISSUE_STORAGE_KEY);
        if (!storedValue) {
            return seedIssues;
        }
        try {
            const parsedValue = JSON.parse(storedValue);
            if (!Array.isArray(parsedValue)) {
                return seedIssues;
            }
            const parsedIssues = parsedValue.filter((item) => {
                if (typeof item !== 'object' || item === null) {
                    return false;
                }
                const issue = item;
                return (typeof issue.id === 'string' &&
                    typeof issue.title === 'string' &&
                    typeof issue.owner === 'string' &&
                    (issue.status === 'todo' ||
                        issue.status === 'in_progress' ||
                        issue.status === 'parked' ||
                        issue.status === 'done'));
            });
            return parsedIssues.length > 0 ? parsedIssues : seedIssues;
        }
        catch {
            return seedIssues;
        }
    });
    const [selectedIssueIds, setSelectedIssueIds] = React.useState(new Set());
    const [isCommandModeOpen, setIsCommandModeOpen] = React.useState(false);
    const [lastShortcutEvent, setLastShortcutEvent] = React.useState('none');
    const [commandSearch, setCommandSearch] = React.useState('');
    const [activeResultIndex, setActiveResultIndex] = React.useState(0);
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [newIssueTitle, setNewIssueTitle] = React.useState('');
    const [newIssueOwner, setNewIssueOwner] = React.useState('Shashank');
    const [openedIssueId, setOpenedIssueId] = React.useState(null);
    const [commentDraft, setCommentDraft] = React.useState('');
    const commandInputReference = React.useRef(null);
    const createTitleInputReference = React.useRef(null);
    const commentInputReference = React.useRef(null);
    const filteredIssues = React.useMemo(() => {
        const query = commandSearch.trim().toLowerCase();
        if (query.length === 0) {
            return issues;
        }
        return issues.filter((issue) => {
            return (issue.id.toLowerCase().includes(query) ||
                issue.title.toLowerCase().includes(query) ||
                issue.owner.toLowerCase().includes(query));
        });
    }, [commandSearch, issues]);
    const openedIssue = React.useMemo(() => {
        if (!openedIssueId) {
            return null;
        }
        return issues.find((issue) => issue.id === openedIssueId) ?? null;
    }, [issues, openedIssueId]);
    React.useEffect(() => {
        window.localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));
    }, [issues]);
    React.useEffect(() => {
        if (activeResultIndex >= filteredIssues.length) {
            setActiveResultIndex(0);
        }
    }, [activeResultIndex, filteredIssues.length]);
    const closeCommandMode = React.useCallback((reason) => {
        setIsCommandModeOpen(false);
        setCommandSearch('');
        setActiveResultIndex(0);
        setLastShortcutEvent(reason);
    }, []);
    const openIssueDetail = React.useCallback((issueId) => {
        setOpenedIssueId(issueId);
        setCommentDraft('');
        setLastShortcutEvent(`Opened issue detail (${issueId})`);
    }, []);
    const openCreateModal = React.useCallback((reason) => {
        setIsCreateModalOpen(true);
        setNewIssueTitle('');
        setLastShortcutEvent(reason);
    }, []);
    const runMoveShortcut = React.useCallback((direction, reason) => {
        if (selectedIssueIds.size > 0) {
            setIssues((currentIssues) => {
                if (direction === 'next') {
                    return moveIssuesToNextBucket(currentIssues, selectedIssueIds);
                }
                return moveIssuesToPreviousBucket(currentIssues, selectedIssueIds);
            });
            setLastShortcutEvent(`Moved ${selectedIssueIds.size} selected issue(s) to ${direction} bucket (${reason})`);
            return;
        }
        if (isCommandModeOpen && filteredIssues.length > 0) {
            const issueToMove = filteredIssues[activeResultIndex] ?? filteredIssues[0];
            if (issueToMove) {
                setIssues((currentIssues) => {
                    return moveIssue(currentIssues, issueToMove.id, direction === 'next'
                        ? getNextStatus(issueToMove.status)
                        : getPreviousStatus(issueToMove.status));
                });
                setLastShortcutEvent(`Moved highlighted issue (${issueToMove.id}) to ${direction} bucket (${reason})`);
                return;
            }
        }
        setLastShortcutEvent(`Move ignored: no selected issue (${reason})`);
    }, [activeResultIndex, filteredIssues, isCommandModeOpen, selectedIssueIds]);
    React.useEffect(() => {
        const onKeyDown = (event) => {
            const key = event.key.toLowerCase();
            const code = event.code;
            if (event.repeat) {
                return;
            }
            if (key === 'escape') {
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
            if (isCreateModalOpen || openedIssueId) {
                return;
            }
            const typingTarget = isTypingTarget(event.target);
            if (isCommandModeOpen) {
                if (key === 'arrowdown' && filteredIssues.length > 0) {
                    event.preventDefault();
                    setActiveResultIndex((current) => (current + 1) % filteredIssues.length);
                    return;
                }
                if (key === 'arrowup' && filteredIssues.length > 0) {
                    event.preventDefault();
                    setActiveResultIndex((current) => {
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
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [
        activeResultIndex,
        closeCommandMode,
        filteredIssues,
        isCommandModeOpen,
        isCreateModalOpen,
        openCreateModal,
        openIssueDetail,
        openedIssueId,
        runMoveShortcut,
        selectedIssueIds
    ]);
    React.useEffect(() => {
        if (!isCommandModeOpen || !commandInputReference.current) {
            return;
        }
        commandInputReference.current.focus();
    }, [isCommandModeOpen]);
    React.useEffect(() => {
        if (!isCreateModalOpen || !createTitleInputReference.current) {
            return;
        }
        createTitleInputReference.current.focus();
    }, [isCreateModalOpen]);
    React.useEffect(() => {
        if (!openedIssueId || !commentInputReference.current) {
            return;
        }
        commentInputReference.current.focus();
    }, [openedIssueId]);
    return (_jsxs("main", {
        className: "kanban-page theme-light", children: [_jsx("header", { className: "kanban-header", children: _jsxs("div", { children: [_jsx("h1", { children: "Kanban Board" }), _jsx("p", { children: "Simple board with Todo, In Progress, Parked, and Done." })] }) }), _jsxs("section", { className: "shortcut-status", "aria-live": "polite", children: [_jsxs("p", { children: [_jsx("strong", { children: "Shortcut manager:" }), " ", isCommandModeOpen ? 'Command mode open' : 'Idle'] }), _jsxs("p", { children: [_jsx("strong", { children: "Last shortcut:" }), " ", lastShortcutEvent] }), _jsx("p", { className: "shortcut-help", children: "Try `Option + K`, `Esc`, `c`, `Option + N`, `Option + B`, and `Enter`." })] }), _jsx("section", {
            className: "kanban-grid", "aria-label": "Kanban board", children: statusOrder.map((status) => {
                const columnIssues = issues.filter((issue) => issue.status === status);
                return (_jsxs("article", {
                    className: "kanban-column", children: [_jsxs("div", { className: "column-head", children: [_jsx("h2", { children: statusLabel[status] }), _jsx("span", { children: columnIssues.length })] }), _jsx("div", {
                        className: "column-body", children: columnIssues.map((issue) => (_jsxs("div", {
                            className: `issue-card ${selectedIssueIds.has(issue.id) ? 'issue-card-selected' : ''}`, role: "button", tabIndex: 0, onClick: () => {
                                setSelectedIssueIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(issue.id)) {
                                        next.delete(issue.id);
                                    }
                                    else {
                                        next.add(issue.id);
                                    }
                                    return next;
                                });
                            }, onKeyDown: (event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') {
                                    return;
                                }
                                event.preventDefault();
                                setSelectedIssueIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(issue.id)) {
                                        next.delete(issue.id);
                                    }
                                    else {
                                        next.add(issue.id);
                                    }
                                    return next;
                                });
                            }, "aria-pressed": selectedIssueIds.has(issue.id), "aria-label": `Issue ${issue.id}: ${issue.title}`, children: [_jsx("p", { className: "issue-id", children: issue.id }), _jsx("h3", { children: issue.title }), _jsxs("p", { className: "issue-owner", children: ["Owner: ", issue.owner] }), _jsx("div", {
                                className: "issue-actions", children: statusOrder.map((nextStatus) => {
                                    if (nextStatus === issue.status) {
                                        return null;
                                    }
                                    return (_jsxs("button", {
                                        type: "button", onClick: (event) => {
                                            event.stopPropagation();
                                            setIssues((currentIssues) => moveIssue(currentIssues, issue.id, nextStatus));
                                        }, children: ["Move to ", statusLabel[nextStatus]]
                                    }, nextStatus));
                                })
                            })]
                        }, issue.id)))
                    })]
                }, status));
            })
        }), isCommandModeOpen ? (_jsx("div", {
            className: "command-palette-overlay", onClick: () => {
                closeCommandMode('Closed command mode (Backdrop click)');
            }, role: "presentation", children: _jsxs("section", {
                className: "command-palette", onClick: (event) => {
                    event.stopPropagation();
                }, "aria-label": "Command palette", children: [_jsxs("header", {
                    className: "command-header", children: [_jsx("h2", { children: "Command Palette" }), _jsx("button", {
                        type: "button", onClick: () => {
                            closeCommandMode('Closed command mode (Close button)');
                        }, children: "Esc"
                    })]
                }), _jsx("input", {
                    ref: commandInputReference, className: "command-search", value: commandSearch, onChange: (event) => {
                        setCommandSearch(event.target.value);
                        setActiveResultIndex(0);
                    }, placeholder: "Search issue by id, title, or owner...", "aria-label": "Search issues"
                }), _jsx("div", {
                    className: "command-results", children: filteredIssues.length === 0 ? (_jsx("p", { className: "command-empty", children: "No matching issues." })) : (filteredIssues.map((issue, index) => (_jsxs("button", {
                        type: "button", className: `command-result-item ${index === activeResultIndex ? 'is-active' : ''}`, onMouseEnter: () => {
                            setActiveResultIndex(index);
                        }, onClick: () => {
                            closeCommandMode(`Opened issue from command click (${issue.id})`);
                            openIssueDetail(issue.id);
                        }, children: [_jsx("span", { children: issue.id }), _jsx("strong", { children: issue.title }), _jsx("small", { children: issue.owner })]
                    }, issue.id))))
                })]
            })
        })) : null, isCreateModalOpen ? (_jsx("div", {
            className: "dialog-overlay", role: "presentation", onClick: () => {
                setIsCreateModalOpen(false);
                setLastShortcutEvent('Closed create ticket modal (Backdrop click)');
            }, children: _jsxs("section", {
                className: "dialog", onClick: (event) => {
                    event.stopPropagation();
                }, children: [_jsxs("header", {
                    className: "dialog-header", children: [_jsx("h2", { children: "Create Ticket" }), _jsx("button", {
                        type: "button", onClick: () => {
                            setIsCreateModalOpen(false);
                            setLastShortcutEvent('Closed create ticket modal (Close button)');
                        }, children: "Close"
                    })]
                }), _jsxs("form", {
                    className: "dialog-form", onSubmit: (event) => {
                        event.preventDefault();
                        const title = newIssueTitle.trim();
                        const owner = newIssueOwner.trim();
                        if (title.length === 0) {
                            return;
                        }
                        const nextIssue = {
                            id: getNextIssueId(issues),
                            title,
                            owner: owner.length === 0 ? 'Unassigned' : owner,
                            status: 'todo'
                        };
                        setIssues((currentIssues) => [nextIssue, ...currentIssues]);
                        setSelectedIssueIds((current) => {
                            const next = new Set(current);
                            next.add(nextIssue.id);
                            return next;
                        });
                        setIsCreateModalOpen(false);
                        setLastShortcutEvent(`Created ticket (${nextIssue.id})`);
                    }, children: [_jsxs("label", {
                        children: ["Title", _jsx("input", {
                            ref: createTitleInputReference, value: newIssueTitle, onChange: (event) => {
                                setNewIssueTitle(event.target.value);
                            }, placeholder: "Enter ticket title"
                        })]
                    }), _jsxs("label", {
                        children: ["Owner", _jsx("input", {
                            value: newIssueOwner, onChange: (event) => {
                                setNewIssueOwner(event.target.value);
                            }, placeholder: "Enter owner"
                        })]
                    }), _jsx("button", { type: "submit", children: "Create ticket" })]
                })]
            })
        })) : null, openedIssue ? (_jsx("div", {
            className: "dialog-overlay", role: "presentation", onClick: () => {
                setOpenedIssueId(null);
                setLastShortcutEvent(`Closed issue detail (${openedIssue.id})`);
            }, children: _jsxs("section", {
                className: "dialog", onClick: (event) => {
                    event.stopPropagation();
                }, children: [_jsxs("header", {
                    className: "dialog-header", children: [_jsxs("h2", { children: [openedIssue.id, " - ", openedIssue.title] }), _jsx("button", {
                        type: "button", onClick: () => {
                            setOpenedIssueId(null);
                            setLastShortcutEvent(`Closed issue detail (${openedIssue.id})`);
                        }, children: "Close"
                    })]
                }), _jsxs("p", { className: "detail-meta", children: ["Owner: ", openedIssue.owner, " | Status: ", statusLabel[openedIssue.status]] }), _jsxs("label", {
                    className: "comment-label", children: ["Comment", _jsx("textarea", {
                        ref: commentInputReference, value: commentDraft, onChange: (event) => {
                            setCommentDraft(event.target.value);
                        }, placeholder: "Write your comment..."
                    })]
                })]
            })
        })) : null]
    }));
}
