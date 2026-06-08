// Server-side only — never import in client components

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: "admin" | "consultant";
}

export const AUTH_USERS: AuthUser[] = [
  {
    id: "andre",
    name: "André Perez",
    username: "andreperez",
    password: process.env.AUTH_PASS_ANDRE ?? "hello2025",
    role: "admin",
  },
  {
    id: "andrew",
    name: "Andrew Oliveira",
    username: "andrew",
    password: process.env.AUTH_PASS_ANDREW ?? "hello2025",
    role: "consultant",
  },
];

export const SESSION_COOKIE = "hello_crm_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
