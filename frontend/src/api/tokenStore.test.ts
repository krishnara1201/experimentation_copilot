import { getToken, setToken } from './tokenStore';

describe('tokenStore', () => {
  beforeEach(() => localStorage.clear());

  it('persists and clears token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');

    setToken(null);
    expect(getToken()).toBeNull();
  });
});
