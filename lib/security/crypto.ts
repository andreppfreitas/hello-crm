// Server-side only — primitivas de criptografia da camada de segurança
import crypto from "crypto";

/** Hash de senha com scrypt + salt aleatório por usuário. Formato: "scrypt$<salt>$<hash>" */
export function hashPasswordSecure(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const LEGACY_SALT = "hello_crm_salt_2025";

/** Verifica senha em ambos os formatos (scrypt novo e sha256 legado). */
export function verifyPassword(plain: string, stored: string): boolean {
  if (stored.startsWith("scrypt$")) {
    const [, salt, hash] = stored.split("$");
    const candidate = crypto.scryptSync(plain, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  }
  // legado: sha256(password + salt fixo)
  const legacy = crypto.createHash("sha256").update(plain + LEGACY_SALT).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(legacy, "hex"));
}

export function needsRehash(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}

/** Token opaco aleatório (sessões, dispositivos confiáveis). */
export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Código numérico de 6 dígitos para 2FA por e-mail. */
export function generateLoginCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/** sha256 hex — usado para indexar tokens/códigos no Redis sem armazená-los em claro. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
