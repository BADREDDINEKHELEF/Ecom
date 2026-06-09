import { test, expect } from '@playwright/test'

test.describe('Seller auth & portal', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/seller/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /login|sign in|connexion|دخول/i })).toBeVisible()
  })

  test('unauthenticated access to /seller/dashboard redirects to login', async ({ page }) => {
    await page.goto('/seller/dashboard')
    // Should redirect to seller login or a generic login page
    await expect(page).toHaveURL(/login/i)
  })

  test('invalid credentials show an error', async ({ page }) => {
    await page.goto('/seller/login')
    await page.getByPlaceholder('you@example.com').fill('notaseller@example.com')
    await page.locator('input[type="password"]').fill('badpassword123')
    await page.getByRole('button', { name: /login|sign in|connexion|دخول/i }).click()
    await expect(page.locator('[class*="red"], [class*="error"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
