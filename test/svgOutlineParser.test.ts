import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SvgOutlineParser } from '../src/core/svgOutlineParser';

describe('SvgOutlineParser', () => {
  const parser = new SvgOutlineParser();

  it('parses nested groups and leaf elements in exact source order with accurate offsets', () => {
    const svg = [
      '<svg id="root" width="800" height="600">',
      '  <g id="flowchart">',
      '    <g id="n1">',
      '      <rect id="n1-r" x="10" y="20" />',
      '      <text>Start</text>',
      '    </g>',
      '    <line id="e1" x1="0" y1="0" x2="10" y2="10"/>',
      '  </g>',
      '</svg>',
    ].join('\n');

    const roots = parser.parse(svg);
    expect(roots).toHaveLength(1);

    const root = roots[0];
    expect(root.tagName).toBe('svg');
    expect(root.id).toBe('root');
    expect(svg.slice(root.startOffset, root.endOffset)).toBe(svg);
    expect(svg.slice(root.nameStartOffset, root.nameEndOffset)).toBe('svg');

    expect(root.children).toHaveLength(1);
    const flowchart = root.children[0];
    expect(flowchart.tagName).toBe('g');
    expect(flowchart.id).toBe('flowchart');
    expect(flowchart.children).toHaveLength(2);

    const n1 = flowchart.children[0];
    expect(n1.tagName).toBe('g');
    expect(n1.id).toBe('n1');
    expect(n1.children.map((c) => [c.tagName, c.id])).toEqual([
      ['rect', 'n1-r'],
      ['text', undefined],
    ]);

    const rect = n1.children[0];
    expect(svg.slice(rect.startOffset, rect.endOffset)).toBe(
      '<rect id="n1-r" x="10" y="20" />'
    );
    expect(svg.slice(rect.nameStartOffset, rect.nameEndOffset)).toBe('rect');

    const text = n1.children[1];
    expect(svg.slice(text.startOffset, text.endOffset)).toBe(
      '<text>Start</text>'
    );

    const line = flowchart.children[1];
    expect(line.tagName).toBe('line');
    expect(line.id).toBe('e1');
  });

  it('extracts id from single quotes, double quotes, spaced equals, and ignores empty id', () => {
    const svg = [
      '<svg>',
      "  <g id='single-quote'>",
      '    <rect id = "spaced-eq" />',
      '    <circle id="" r="5"/>',
      '    <ellipse id="   " rx="4" ry="2"/>',
      '    <svg:rect id="ns-rect" width="10" height="10"/>',
      '    <text>No ID</text>',
      '  </g>',
      '</svg>',
    ].join('\n');

    const roots = parser.parse(svg);
    expect(roots).toHaveLength(1);
    const g = roots[0].children[0];
    expect(g.id).toBe('single-quote');
    expect(g.children.map((c) => [c.tagName, c.id])).toEqual([
      ['rect', 'spaced-eq'],
      ['circle', undefined],
      ['ellipse', undefined],
      ['svg:rect', 'ns-rect'],
      ['text', undefined],
    ]);
  });

  it('ignores XML declarations, DOCTYPE with internal subset, comments, and CDATA', () => {
    const svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [',
      '  <!ENTITY label "fake <rect id=\'entity\'/>">',
      ']>',
      '<!-- <rect id="commented-out"/> -->',
      '<svg id="main">',
      '  <style><![CDATA[ .box > rect { fill: red; } <circle id="in-cdata"/> ]]></style>',
      '  <!-- nested comment <g><line/></g> -->',
      '  <rect id="real-rect"/>',
      '</svg>',
    ].join('\n');

    const roots = parser.parse(svg);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('main');
    expect(roots[0].children.map((c) => [c.tagName, c.id])).toEqual([
      ['style', undefined],
      ['rect', 'real-rect'],
    ]);
  });

  it('handles multiline opening tags and attribute values containing > or /', () => {
    const svg = [
      '<svg',
      '  xmlns="http://www.w3.org/2000/svg"',
      '  data-expr="a > b && c / d"',
      '  id="multi-root"',
      '>',
      '  <rect',
      "    data-note='x > 0 / y < 1'",
      '    id="multi-rect"',
      '  />',
      '  <text>10 > 5</text>',
      '</svg>',
    ].join('\n');

    const roots = parser.parse(svg);
    expect(roots).toHaveLength(1);
    expect(roots[0].tagName).toBe('svg');
    expect(roots[0].id).toBe('multi-root');
    expect(roots[0].children.map((c) => [c.tagName, c.id])).toEqual([
      ['rect', 'multi-rect'],
      ['text', undefined],
    ]);
  });

  it('allows balanced multi-root SVG fragments per confirmed requirement', () => {
    const fragment = '<rect id="r1"/><circle id="c1"/><g id="g1"><text>hi</text></g>';
    const roots = parser.parse(fragment);
    expect(roots.map((n) => [n.tagName, n.id])).toEqual([
      ['rect', 'r1'],
      ['circle', 'c1'],
      ['g', 'g1'],
    ]);
    expect(roots[2].children[0].tagName).toBe('text');
  });

  it('returns empty array safely without throwing on incomplete or malformed XML', () => {
    const malformedInputs = [
      '',
      '   \n\t  ',
      '<',
      '<re',
      '<svg><rect id="unclosed',
      '<svg><rect id="unclosed"/></svg',
      '<svg><rect id="r1">',
      '<svg><g><rect/></svg>',
      '<svg></g></svg>',
      '</svg>',
      '<svg><!-- unclosed comment</svg>',
      '<svg><![CDATA[ unclosed</svg>',
      '<?xml version="1.0"',
      '<!DOCTYPE svg',
      '<svg><rect id/></svg>',
      '<svg><rect id=bare/></svg>',
      '<svg><rect / ></svg>',
      '<svg><text>a < b</text></svg>',
    ];

    for (const input of malformedInputs) {
      expect(() => parser.parse(input)).not.toThrow();
      expect(parser.parse(input), `Expected [] for input: ${JSON.stringify(input)}`).toEqual([]);
    }
  });

  it('recovers full outline tree after an editing sequence breaks and fixes XML', () => {
    const validInitial = '<svg id="s1"><rect id="start"/></svg>';
    expect(parser.parse(validInitial)[0].children[0].id).toBe('start');

    // User deletes closing tag mid-edit
    const brokenMidEdit = '<svg id="s1"><rect id="start"/>';
    expect(parser.parse(brokenMidEdit)).toEqual([]);

    // User renames id and adds closing tag back
    const fixedAfterEdit =
      '<svg id="s1"><rect id="begin"/><circle id="c1"/></svg>';
    const recovered = parser.parse(fixedAfterEdit);
    expect(recovered).toHaveLength(1);
    expect(recovered[0].children.map((c) => [c.tagName, c.id])).toEqual([
      ['rect', 'begin'],
      ['circle', 'c1'],
    ]);
  });

  it('parses 1000+ line SVG documents well within performance budget (< 50ms)', () => {
    const lines = ['<svg id="perf-root">'];
    for (let i = 0; i < 1000; i++) {
      lines.push(`  <rect id="r-${i}" x="${i}" y="${i}" width="10" height="10" />`);
    }
    lines.push('</svg>');
    const largeSvg = lines.join('\n');

    const start = performance.now();
    const roots = parser.parse(largeSvg);
    const elapsedMs = performance.now() - start;

    expect(roots).toHaveLength(1);
    expect(roots[0].children).toHaveLength(1000);
    expect(elapsedMs).toBeLessThan(50);
  });

  it('handles UTF-8 BOM, Unicode ids/text, and keeps the first non-empty id on duplicate attributes', () => {
    const svg =
      '\uFEFF<svg id="画布"><rect id="开始" id="第二个"/><text>处理数据</text></svg>';
    const roots = parser.parse(svg);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('画布');
    expect(roots[0].children.map((c) => [c.tagName, c.id])).toEqual([
      ['rect', '开始'],
      ['text', undefined],
    ]);
  });

  it('parses examples/demo.svg cleanly and returns [] for examples/malformed.svg', () => {
    const demoPath = path.resolve(__dirname, '../examples/demo.svg');
    const malformedPath = path.resolve(__dirname, '../examples/malformed.svg');

    const demoRoots = parser.parse(fs.readFileSync(demoPath, 'utf8'));
    expect(demoRoots).toHaveLength(1);
    expect(demoRoots[0].tagName).toBe('svg');
    expect(demoRoots[0].id).toBe('canvas');
    expect(demoRoots[0].children[0].id).toBe('flowchart');
    expect(
      demoRoots[0].children[0].children.map((c) => [c.tagName, c.id])
    ).toEqual([
      ['g', 'node-start'],
      ['line', 'arrow-1'],
      ['circle', undefined],
    ]);

    const malformedRoots = parser.parse(fs.readFileSync(malformedPath, 'utf8'));
    expect(malformedRoots).toEqual([]);
  });
});
