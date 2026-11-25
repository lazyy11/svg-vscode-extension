import { describe, it } from 'vitest';

describe('SvgOutlineParser', () => {
  it.todo('parses nested groups and leaf elements in source order');
  it.todo('extracts non-empty id attributes and handles elements without id');
  it.todo('ignores XML declarations, DOCTYPE, comments, and CDATA');
  it.todo('handles multiline tags and attribute values containing > or /');
  it.todo('returns empty array safely on incomplete or mismatched XML');
  it.todo('recovers full outline tree once malformed XML is fixed');
});
