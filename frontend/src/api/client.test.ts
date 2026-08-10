import { apiRequest, ApiError, setUnauthorizedHandler } from './client';

vi.mock('./tokenStore', () => ({
  getToken: vi.fn(() => 'token-value'),
}));

describe('apiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends auth header and query params', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await apiRequest<{ ok: boolean }>('/v1/items', {
      params: { page: 2, enabled: true },
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/items?page=2&enabled=true'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      })
    );
  });

  it('invokes unauthorized handler on 401 responses', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(apiRequest('/secured')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });

  it('extracts detailed validation errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: [{ msg: 'Field required' }] }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(apiRequest('/bad-request')).rejects.toMatchObject({
      message: 'Field required',
    });
  });
});
