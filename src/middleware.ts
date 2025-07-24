import { NextResponse, NextRequest } from 'next/server'

import getOrCreateDB from './models/server/dbSetup'
import getOrCreateStorage from './models/server/storageSetup'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  
    await Promise.all([
        getOrCreateDB(),
        getOrCreateStorage()
    ])
    return NextResponse.next();
}

//middleware will not run on the paths mentioned below 
export const config = {
    /* match all the request paths except for the ones that starts with: 
    - api
    - _next/static
    - _next/image
    - favicon.com
    */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)" //regex
  ],
}