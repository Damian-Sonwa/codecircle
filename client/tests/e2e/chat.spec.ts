import {test, expect} from '@playwright/test';

test.describe('Realtime chat', () => {
  test.skip('two clients exchange messages (requires server running)', async ({browser}) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/login');
    await expect(pageA.getByText('Welcome back to GlassChat')).toBeVisible();

    // Placeholder steps for when backend is running during CI/CD
    // await pageA.fill('input[type="text"]', 'juliet@example.com');
    // await pageA.fill('input[type="password"]', 'Password123!');
    // await pageA.click('button:has-text("Sign in")');

    await contextA.close();
  });
});


