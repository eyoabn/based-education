import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const url = request.nextUrl.clone();

  // If there's no token, redirect dashboard requests to login
  if (!token) {
    if (url.pathname.startsWith('/dashboard')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Verify the token
  const payload = await verifyToken(token);

  if (!payload) {
    if (url.pathname.startsWith('/dashboard')) {
      url.pathname = '/login';
      // Clear invalid cookie
      const response = NextResponse.redirect(url);
      response.cookies.delete('token');
      return response;
    }
    return NextResponse.next();
  }

  const { role, teacherStatus } = payload;

  // Student Protection
  if (url.pathname.startsWith('/dashboard/student')) {
    if (role !== 'STUDENT') {
      url.pathname = `/dashboard/${role.toLowerCase()}`;
      return NextResponse.redirect(url);
    }
  }

  // Teacher Protection
  if (url.pathname.startsWith('/dashboard/teacher')) {
    if (role !== 'TEACHER') {
      url.pathname = `/dashboard/${role.toLowerCase()}`;
      return NextResponse.redirect(url);
    }
    if (teacherStatus === 'PENDING') {
      url.pathname = '/pending-approval';
      return NextResponse.redirect(url);
    }
  }

  // Admin Protection
  if (url.pathname.startsWith('/dashboard/admin')) {
    if (role !== 'ADMIN') {
      url.pathname = `/dashboard/${role.toLowerCase()}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
