import store from 'store2'
import type { ContentWindow, SearchEngineData } from './types'

export function encodeXor(str: string) {
  if (!str) return str
  return encodeURIComponent(
    str
      .toString()
      .split('')
      .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(Number.NaN) ^ 2) : char))
      .join('')
  )
}

export function formatSearch(input: string): string {
  if (input.startsWith('/cdn')) {
    return new URL(input, window.location.href).href
  }

  try {
    return new URL(input).toString()
  } catch (e) {}

  try {
    const url = new URL(`http://${input}`)
    if (url.hostname.includes('.')) return url.toString()
  } catch (e) {}

  const searchEngineData = store('searchEngine') as SearchEngineData

  if (searchEngineData?.engine === 'custom' && searchEngineData.url) {
    const template = searchEngineData.url
    if (template.includes('%s')) {
      return new URL(template.replace('%s', encodeURIComponent(input))).toString()
    } else {
      return new URL(`${template}${encodeURIComponent(input)}`).toString()
    }
  }

  switch (searchEngineData?.engine) {
    case 'duckduckgo':
      return new URL(`https://duckduckgo.com/?q=${encodeURIComponent(input)}`).toString()
    case 'ecosia':
      return new URL(`https://www.ecosia.org/search?q=${encodeURIComponent(input)}`).toString()
    case 'bing':
      return new URL(`https://bing.com/search?q=${encodeURIComponent(input)}`).toString()
    case 'google':
    default:
      return new URL(`https://google.com/search?q=${encodeURIComponent(input)}`).toString()
  }
}

export function getFavicon(contentWindow: ContentWindow): Promise<string> {
  return new Promise((resolve) => {
    const origin =
      (contentWindow as any).__uv$location?.origin ??
      (contentWindow as any).__scramjet$location?.origin ??
      contentWindow.location.origin

    const image = new Image()
    image.src = `${origin}/favicon.ico`

    image.onload = () => {
      resolve(`${origin}/favicon.ico`)
    }

    image.onerror = () => {
      resolve((contentWindow.document.querySelector("link[rel*='icon']") as HTMLLinkElement)?.href || '/globe.svg')
    }
  })
}
