import { test, expect } from '@playwright/test'

test.describe('Admin auth', () => {
  test('login page renders all form elements', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /Admin Access/i })).toBeVisible()
    await expect(page.getByPlaceholder('Admin password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Enter Admin Panel/i })).toBeVisible()
  })

  test('wrong password shows an error message', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByPlaceholder('Admin password').fill('wrong-password-xyz')
    await page.getByRole('button', { name: /Enter Admin Panel/i }).click()
    // Expect some error text to appear — exact text depends on server response
    await expect(page.locator('text=/invalid|incorrect|failed|unauthorized/i')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('unauthenticated access to /admin redirects to login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('unauthenticated API call returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/niches')
    expect(res.status()).toBe(401)
  })
})
