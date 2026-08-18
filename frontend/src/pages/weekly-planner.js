/*
 * Weekly Planner page entry.
 *
 * Boots the shared stylesheet/fonts + the shared header/auth layout, then
 * runs the existing weekly-plan grid logic and the PDF-export handler.
 * The page-content logic stays single-sourced in frontend/html/weekly-plan.js
 * (also used by the legacy CDN page).
 */
import { mountLayout } from '../bootstrap.js'

// Shared nav header + auth bootstrap (replaces the per-page header/auth IIFE).
mountLayout({ activeNav: 'planner' })

// Existing weekly-plan grid logic — single source, shared with the legacy page.
import '../../html/weekly-plan.js'

// PDF export — moved here from the old inline <script> in index.html.
document.getElementById('export-pdf-btn').addEventListener('click', () => {
  const token = localStorage.getItem('token')
  if (!token) {
    alert('You must be logged in to export the plan.')
    return
  }
  fetch('/api/weekly-plan/pdf', { headers: { Authorization: 'Bearer ' + token } })
    .then((response) => {
      if (!response.ok) throw new Error('Failed to generate PDF')
      return response.blob()
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'weekly_meal_plan.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    })
    .catch((error) => {
      console.error('Error exporting PDF:', error)
      alert('Could not export PDF. Please try again.')
    })
})