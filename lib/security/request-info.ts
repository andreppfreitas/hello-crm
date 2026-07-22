// Extrai IP, geolocalização (headers da Vercel) e dispositivo a partir da request
import type { NextRequest } from "next/server";

export interface RequestInfo {
  ip: string;
  city: string;
  country: string;
  browser: string;
  os: string;
  device: string;
  userAgent: string;
}

function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = "Desconhecido";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/firefox/i.test(ua)) browser = "Firefox";

  let os = "Desconhecido";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  const device = /iphone|android.*mobile/i.test(ua) ? "Celular" : /ipad|tablet/i.test(ua) ? "Tablet" : "Computador";
  return { browser, os, device };
}

export function getRequestInfo(request: NextRequest): RequestInfo {
  const ua = request.headers.get("user-agent") ?? "";
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "0.0.0.0";
  const city = decodeURIComponent(request.headers.get("x-vercel-ip-city") ?? "") || "—";
  const country = request.headers.get("x-vercel-ip-country") ?? "—";
  return { ip, city, country, ...parseUA(ua), userAgent: ua };
}

/** 203.45.67.81 → "203...81" */
export function maskIP(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}...${parts[3]}`;
  // IPv6
  return ip.length > 8 ? `${ip.slice(0, 4)}...${ip.slice(-4)}` : ip;
}

/** andre@hello.com → "an*****@hello.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(3, user.length - 2))}@${domain}`;
}
