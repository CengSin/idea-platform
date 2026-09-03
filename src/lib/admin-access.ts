export function adminEmails(raw = process.env.ADMIN_EMAILS ?? "") {
  return raw
    .split(/[;,\n]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string, raw = process.env.ADMIN_EMAILS ?? "") {
  return adminEmails(raw).includes(email.trim().toLowerCase());
}
