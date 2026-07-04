import { test, expect } from '@playwright/test'

test('homepage loads with h1 and article cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('article, [data-article-card]').first()).toBeVisible()
})

test('example article page renders', async ({ page }) => {
  await page.goto('/article/example-critical-thinking')
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('[data-qa-question]').first()).toBeVisible()
})

test('/articles page loads', async ({ page }) => {
  await page.goto('/articles')
  await expect(page.locator('h1').first()).toBeVisible()
})

test('/about page loads', async ({ page }) => {
  await page.goto('/about')
  await expect(page.locator('h1').first()).toBeVisible()
})

test('dark mode toggle persists across reload', async ({ page }) => {
  await page.goto('/')
  await page.click('[aria-label="Toggle dark mode"]')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('tag filter shows only matching articles', async ({ page }) => {
  await page.goto('/')
  const initialCount = await page.locator('[data-article-card]').count()
  if (initialCount < 2) return
  const tagPill = page.locator('[data-tag-pill]').first()
  const tag = await tagPill.getAttribute('data-tag')
  await tagPill.click()
  const visible = page.locator('[data-article-card]:visible')
  const count = await visible.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const tags = (await visible.nth(i).getAttribute('data-tags'))?.split(',') ?? []
    expect(tags).toContain(tag)
  }
})

test('404 page renders on unknown URL', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await expect(page.locator('text=404')).toBeVisible()
})
