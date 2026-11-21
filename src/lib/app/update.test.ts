import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNewer, published } from './update';

describe('version check', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls a different version or build newer', () => {
    const running = { version: '0.1.2', build: 'abc1234' };
    expect(isNewer({ version: '0.1.2', build: 'abc1234' }, running)).toBe(false);
    expect(isNewer({ version: '0.1.3', build: 'def5678' }, running)).toBe(true);
    expect(isNewer({ version: '0.1.2', build: 'def5678' }, running)).toBe(true);
  });

  it('reads version.json and gives null when the site is unreachable or the file is wrong', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"version":"0.2.0","build":"1234567"}')));
    expect(await published()).toEqual({ version: '0.2.0', build: '1234567' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 404 })));
    expect(await published()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"v":1}')));
    expect(await published()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    expect(await published()).toBeNull();
  });
});
