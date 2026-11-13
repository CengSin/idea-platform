import crypto from "node:crypto";

/**
 * Single-owner session: a signed, expiring cookie. No account table.
 * Changing ADMIN_PASSWORD (without SESSION_SECRET) signs every session out.
 */

export const SESSION_COOKIE = "showcase_session";
export const SESSION_DAYS = 30;

export type SessionEnv = Record<string, string | undefined> & {
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
};

export function adminPassword(env: SessionEnv = process.env) {
  return env.ADMIN_PASSWORD?.trim() ?? "";
}

function secret(env: SessionEnv) {
  const explicit = env.SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const password = adminPassword(env);
  if (!password) return "";
  return crypto.createHash("sha256").update(`showcase-session:${password}`).digest("hex");
}

function sign(payload: string, key: string) {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = crypto.createHash("sha256").update(a).digest();
  const right = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

export function checkPassword(input: string, env: SessionEnv = process.env) {
  const password = adminPassword(env);
  return Boolean(password) && safeEqual(input, password);
}

/** `Authorization: Bearer <ADMIN_PASSWORD>`, for scripts acting as the owner. */
export function checkBearer(header: string | null | undefined, env: SessionEnv = process.env) {
  const match = /^Bearer (.+)$/.exec(header?.trim() ?? "");
  return match ? checkPassword(match[1], env) : false;
}

export function issueSession(env: SessionEnv = process.env, now = Date.now()) {
  const key = secret(env);
  if (!key) throw new Error("未设置 ADMIN_PASSWORD");
  const expires = now + SESSION_DAYS * 86_400_000;
  const payload = `owner.${expires}`;
  return { value: `${payload}.${sign(payload, key)}`, expires: new Date(expires) };
}

export function verifySession(value: string | undefined, env: SessionEnv = process.env, now = Date.now()) {
  const key = secret(env);
  if (!value || !key) return false;
  const [role, expires, signature] = value.split(".");
  if (role !== "owner" || !expires || !signature) return false;
  if (!(Number(expires) > now)) return false;
  return safeEqual(signature, sign(`${role}.${expires}`, key));
}
