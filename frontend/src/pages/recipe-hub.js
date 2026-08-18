/*
 * Recipe Hub page entry.
 *
 * Boots the shared stylesheet/fonts + header/auth layout, then runs the
 * existing recipe-hub logic (single-sourced in frontend/html/recipe-hub.js,
 * also used by the legacy CDN page).
 */
import { mountLayout } from '../bootstrap.js'

mountLayout({ activeNav: 'recipes' })

import '../../html/recipe-hub.js'