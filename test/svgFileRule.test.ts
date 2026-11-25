import { describe, it } from 'vitest';

describe('SvgFileRule', () => {
  it.todo('matches regular .svg files case-insensitively');
  it.todo('rejects non-svg files and bare .svg hidden files without calling statReader');
  it.todo('rejects directories even when named with .svg suffix');
  it.todo('returns false safely when statReader throws');
});
