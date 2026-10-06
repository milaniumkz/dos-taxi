import { NextRequest, NextResponse } from "next/server";

const REALM = "DOS Admin";

export function middleware(request: NextRequest) {
  const expectedUsername = process.env.ADMIN_BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.ADMIN_BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    const credentials = decodeBasicCredentials(authorization);
    if (
      credentials?.username === expectedUsername &&
      credentials.password === expectedPassword
    ) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

function decodeBasicCredentials(
  authorization: string,
): { username: string; password: string } | null {
  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
