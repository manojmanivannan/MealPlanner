/*
 * Weekly Planner page entry (T2 demo page).
 *
 * Imports the self-hosted Inter weights + the compiled stylesheet, mounts
 * the shared layout (header + auth), then runs the existing weekly-plan
 * logic and the PDF-export handler. This is the single place that wires
 * the page into the new Vite build; the page-content logic stays in the
 * shared frontend/html/weekly-plan.js (also used by the legacy CDN page).
 */
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

import '../styles.css'
import { mountLayout } from '../layout.js'

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