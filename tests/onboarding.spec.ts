import { test, expect } from '@playwright/test'

test.describe('StockBuddy Onboarding Flow', () => {
  test('should complete onboarding and reach portfolio page', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8000')
    
    // Should see the home page
    await expect(page.locator('h1')).toContainText('Build your portfolio the smart SA way')
    
    // Click get started
    await page.click('text=Get Started')
    
    // Should be on onboarding page
    await expect(page.locator('h2')).toContainText('Tell us about yourself')
    
    // Fill step 1
    await page.fill('input[placeholder="Enter your first name"]', 'Test User')
    await page.click('text=25-34')
    await page.click('text=Intermediate')
    
    // Go to step 2
    await page.click('text=Next')
    
    // Fill step 2
    await page.click('text=Balanced')
    await page.click('text=Medium (3-7 years)')
    await page.selectOption('select', 'SBK.JO')
    
    // Go to step 3
    await page.click('text=Next')
    
    // Fill step 3
    await page.click('text=Banks')
    await page.click('text=Moderate detail')
    
    // Complete onboarding
    await page.click('text=Complete Setup')
    
    // Should redirect to portfolio page
    await expect(page.locator('h1')).toContainText('My Portfolio')
    
    // Should see compliance banner
    await expect(page.locator('.compliance-banner')).toContainText('Educational Platform Notice')
  })
  
  test('should show compliance banner on all pages', async ({ page }) => {
    await page.goto('http://localhost:8000')
    
    // Check home page has compliance banner
    await expect(page.locator('.compliance-banner')).toContainText('Educational Platform Notice')
    
    // Navigate to learn page
    await page.goto('http://localhost:8000/learn')
    await expect(page.locator('.compliance-banner')).toContainText('Educational Platform Notice')
  })
})
