import { expect, test } from '@playwright/test';

test('keyboard-first happy path: create, move, open detail, comment, nudge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible();

    await page.keyboard.press('Alt+KeyK');
    await expect(page.getByRole('heading', { name: 'Command Palette', exact: true })).toBeVisible();

    await page.keyboard.press('c');
    await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();

    await page.getByLabel('Title').fill('E2E happy path issue');
    await page.getByLabel('Owner').fill('Shashank');
    await page.getByRole('button', { name: 'Create ticket' }).click();

    const createdCard = page.getByRole('button', { name: /Issue KAN-\d+: E2E happy path issue/ });
    await expect(createdCard).toBeVisible();

    await page.keyboard.press('Alt+KeyK');
    await page.getByLabel('Search issues').fill('E2E happy path issue');
    await page.keyboard.press('n');
    await page.keyboard.press('Escape');

    const inProgressColumn = page.locator('.kanban-column').filter({
        has: page.getByRole('heading', { name: 'In Progress' })
    });
    const movedCard = inProgressColumn.getByRole('button', { name: /Issue KAN-\d+: E2E happy path issue/ });
    await expect(movedCard).toBeVisible();
    await movedCard.dblclick();

    await expect(page.getByLabel('Issue detail panel')).toBeVisible();
    await expect(page.getByText(/Status: In Progress/)).toBeVisible();

    await page.getByPlaceholder('Write your comment...').fill('Status updated from E2E.');
    await page.getByRole('button', { name: 'Post update' }).click();
    await expect(page.getByText('Status updated from E2E.')).toBeVisible();

    await page.getByRole('button', { name: 'Nudge owner for status' }).click();
    await expect(page.getByText(/Nudge sent to @Shashank/)).toBeVisible();

    await page.getByRole('button', { name: 'Open notifications' }).click();
    await expect(page.getByText(/can you share a quick status update/i)).toBeVisible();
});
