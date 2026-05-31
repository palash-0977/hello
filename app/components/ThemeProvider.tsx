'use client'

import { useEffect } from 'react'

/**
 * Drop this inside your RootLayout (as a client component child).
 * It reads localStorage on mount and applies the dark class to <html>
 * so the theme is restored on every page load / refresh.
 *
 * Usage in app/layout.tsx:
 *   import ThemeProvider from './components/ThemeProvider'
 *   ...
 *   <body>
 *     <ThemeProvider />
 *     {children}
 *   </body>
 */
export default function ThemeProvider() {
  useEffect(() => {
    const theme = localStorage.getItem('theme')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return null
}