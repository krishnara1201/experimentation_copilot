import { decodeUsername } from './jwt';

function toToken(payload: object): string {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `x.${encoded}.y`;
}

describe('decodeUsername', () => {
  it('returns username from valid payload', () => {
    expect(decodeUsername(toToken({ sub: 'alice' }))).toBe('alice');
  });

  it('returns null for invalid token', () => {
    expect(decodeUsername('bad.token')).toBeNull();
  });
});
