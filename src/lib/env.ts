// Lazy Zugriff auf Umgebungsvariablen, damit der Build ohne Secrets funktioniert.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function siteUrl(): string {
  return (optionalEnv("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}

export function fromBase64(name: string): Buffer | undefined {
  const v = optionalEnv(name);
  return v ? Buffer.from(v, "base64") : undefined;
}
