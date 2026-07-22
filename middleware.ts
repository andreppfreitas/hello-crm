import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "hello_crm_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/verify-code", "/api/auth/resend-code"];

// sha256 via WebCrypto (Edge runtime)
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Valida o token de sessão contra o Redis (Upstash REST — funciona no Edge).
// O cookie carrega um token opaco; sessão real vive no servidor.
async function sessionExists(token: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const auth = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !auth) return true; // sem Redis configurado, não bloqueia (dev)
  try {
    const id = await sha256Hex(token);
    const res = await fetch(`${url}/exists/${encodeURIComponent(`crm:session:${id}`)}`, {
      headers: { Authorization: `Bearer ${auth}` },
    });
    if (!res.ok) return true; // falha de infra não derruba o app
    const data = await res.json();
    return data.result === 1;
  } catch {
    return true;
  }
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const valid = token ? await sessionExists(token) : false;

  if (!valid && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json({ error: "Not authenticated" }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    if (token) redirect.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" }); // limpa cookie inválido
    return withSecurityHeaders(redirect);
  }

  if (valid && pathname === "/login") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|hello-logo.png).*)"],
};
