/*
 * Shared page bootstrap (T2).
 *
 * Pulls in the self-hosted Inter weights + the compiled stylesheet and
 * re-exports the shared layout injector, so every authenticated page entry
 * is the same three lines: import this, call mountLayout({ activeNav }), then
 * import the page-content logic. Keeps the per-page entries DRY.
 */
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

import './styles.css'

export { mountLayout } from './layout.js'