import { NextResponse } from 'next/server'

export function middleware(request) {
    // admin login redirect
    if (request.nextUrl.pathname.startsWith('/auth/admin/login')) {
        const adminToken = request.cookies.get('admin_token')
        if (adminToken) {
            return NextResponse.redirect(new URL('/admin-dashboard', request.url))
        }
    }
}

export const config = {
    matcher: '/auth/admin/login',
}
