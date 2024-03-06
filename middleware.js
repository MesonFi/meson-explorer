import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

const { NODE_ENV } = process.env

const getApiAccessRoles = pathname => {
  if (
    pathname.startsWith('/api/v1/swap/pending')
  ) {
    return ['root']
  } else if (
    pathname.startsWith('/api/v1/admin/banner') ||
    pathname.startsWith('/api/v1/admin/server/restart')
  ) {
    return ['root', 'admin', 'operator']
  } else if (
    pathname.startsWith('/api/v1/admin') ||
    pathname.startsWith('/api/v1/stats')
  ) {
    return ['root', 'admin']
  } else if (
    pathname.startsWith('/api/v1/swap/share-with')
  ) {
    return ['root', 'admin', 'lp:']
  }
}

const getPageAccessRoles = pathname => {
  if (
    pathname.startsWith('/pending')
  ) {
    return ['root']
  } else if (
    pathname.startsWith('/relayer') ||
    pathname.startsWith('/premium') ||
    pathname.startsWith('/stats') ||
    pathname.startsWith('/rules')
  ) {
    return ['root', 'admin']
  } else if (
    pathname.startsWith('/lp') ||
    pathname.startsWith('/banners')
  ) {
    return ['root', 'admin', 'operator']
  } else if (
    pathname.startsWith('/pool') ||
    pathname.startsWith('/swap/share-with')
  ) {
    return ['root', 'admin', 'lp:']
  }
}

export const middleware = withAuth(
  async function middleware(req) {
    if (NODE_ENV !== 'production') {
      return
    }

    if (req.headers.get('x-forwarded-proto') !== 'https') {
      return NextResponse.redirect(`https://${req.headers.get('host')}${req.nextUrl.pathname}`)
    }

    const token = req.nextauth.token
    const roles = token?.roles || []
    const pathname = req.nextUrl.pathname

    if (pathname.startsWith('/api/v1')) {
      const apiRoles = getApiAccessRoles(pathname)
      if (apiRoles && !apiRoles.some(ar => roles.find(r => r === ar || r.startsWith(ar)))) {
        return NextResponse.rewrite(new URL('/api/401', req.url))
      }
    } else {
      const pageRoles = getPageAccessRoles(pathname)
      if (pageRoles) {
        if (!token) {
          return NextResponse.redirect(new URL('/', req.url))
        } else if (!pageRoles.some(pr => roles.find(r => r === pr || r.startsWith(pr)))) {
          return NextResponse.rewrite(new URL('/unauthorized', req.url))
        }
      }
    }
  },
  {
    callbacks: {
      authorized: () => true
    }
  }
)
