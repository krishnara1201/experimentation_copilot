export function decodeUsername(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
