import type { Patch } from './types'

export const patches: Patch[] = [
  {
    hostname: 'neal.fun',
    suggestedTransport: 'libcurl'
  },
  {
    hostname: 'instagram.com',
    works: false
  },
  {
    hostname: 'google.com',
    execute(contentWindow) {
      const loc = (contentWindow as any).__uv$location ?? (contentWindow as any).__scramjet$location ?? contentWindow.location
      const currentUrl = new URL(loc.href)
      let changed = false

      // Only add language/geo when missing; never overwrite values Google sets.
      if (!currentUrl.searchParams.has('hl')) {
        currentUrl.searchParams.set('hl', 'en')
        changed = true
      }

      if (!currentUrl.searchParams.has('gl')) {
        currentUrl.searchParams.set('gl', 'us')
        changed = true
      }

      // Avoid reload loops: update the URL without navigation.
      if (changed) {
        try {
          contentWindow.history.replaceState(null, '', currentUrl.toString())
        } catch {
          // Fallback: only navigate if replaceState isn't available in this context.
          try {
            loc.href = currentUrl.toString()
          } catch {}
        }
      }
    }
  }
]
