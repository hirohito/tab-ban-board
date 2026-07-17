/**
 * Root-domain extraction for grouping tabs into board columns.
 *
 * We approximate eTLD+1 with a small list of common multi-part public
 * suffixes (co.uk, co.jp, github.io, ...) instead of shipping the full
 * Public Suffix List. Hosting platforms like github.io are treated as
 * suffixes so `alice.github.io` and `bob.github.io` get separate columns.
 */

const MULTI_PART_SUFFIXES = new Set([
  // country-code second-level domains
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp', 'lg.jp',
  'com.au', 'net.au', 'org.au', 'edu.au',
  'co.nz', 'org.nz',
  'co.kr', 'or.kr',
  'com.br', 'com.mx', 'com.ar', 'com.tr', 'com.cn', 'com.tw', 'com.hk',
  'co.in', 'co.za', 'co.id', 'co.th',
  // hosting platforms where each subdomain is its own site
  'github.io', 'gitlab.io', 'vercel.app', 'netlify.app',
  'pages.dev', 'workers.dev', 'web.app', 'firebaseapp.com',
  'herokuapp.com', 'onrender.com', 'fly.dev', 'surge.sh',
])

/** Column keys for tabs that aren't ordinary web hosts. */
export const LOCALHOST_GROUP = 'localhost'
export const FILES_GROUP = 'local files'

/**
 * rootDomain(url)
 *
 * Returns the column key for a tab URL:
 *   https://mail.google.com/...      -> "google.com"
 *   https://gist.github.com/...      -> "github.com"
 *   https://alice.github.io/...      -> "alice.github.io"
 *   http://localhost:3000/           -> "localhost"
 *   file:///Users/me/notes.html      -> "local files"
 *   http://192.168.1.5/              -> "192.168.1.5"
 */
export function rootDomain(url: string): string {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return 'other'
  }

  if (u.protocol === 'file:') return FILES_GROUP

  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return LOCALHOST_GROUP
  }

  // Bare IP addresses group by the IP itself
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
    return host
  }

  const labels = host.split('.')
  if (labels.length <= 2) return host

  const lastTwo = labels.slice(-2).join('.')
  const lastThree = labels.slice(-3).join('.')

  // "alice.github.io" -> suffix is "github.io", root is "alice.github.io"
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return lastThree
  return lastTwo
}

/**
 * pathLabel(url)
 *
 * Short secondary line for a tab card: hostname (when it differs from
 * the root) plus path. "mail.google.com/mail/u/0" beats a bare URL.
 */
export function pathLabel(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol === 'file:') return decodeURIComponent(u.pathname)
    const path = u.pathname === '/' ? '' : decodeURIComponent(u.pathname)
    return `${u.hostname.replace(/^www\./, '')}${path}${u.search ? '?…' : ''}`
  } catch {
    return url
  }
}

/**
 * localhostPort(url)
 *
 * Port for localhost URLs — lets you tell dev servers apart at a glance.
 */
export function localhostPort(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return u.port || (u.protocol === 'https:' ? '443' : '80')
    }
  } catch {
    /* not a URL */
  }
  return null
}
