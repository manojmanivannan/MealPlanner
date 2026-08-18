/*
 * Ingredients page entry.
 *
 * Boots the shared stylesheet/fonts + header/auth layout, then runs the
 * existing ingredients logic (single-sourced in frontend/html/ingredients.js,
 * also used by the legacy CDN page).
 */
import { mountLayout } from '../bootstrap.js'

mountLayout({ activeNav: 'ingredients' })

import '../../html/ingredients.js'