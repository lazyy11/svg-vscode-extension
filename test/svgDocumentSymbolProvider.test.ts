import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  class Position {
    public constructor(
      public readonly line: number,
      public readonly character: number
    ) {}
  }

  class Range {
    public constructor(
      public readonly start: Position,
      public readonly end: Position
    ) {}

    public contains(other: Range): boolean {
      const startsAfterOrAt =
        other.start.line > this.start.line ||
        (other.start.line === this.start.line &&
          other.start.character >= this.start.character);
      const endsBeforeOrAt =
        other.end.line < this.end.line ||
        (other.end.line === this.end.line &&
          other.end.character <= this.end.character);
      return startsAfterOrAt && endsBeforeOrAt;
    }
  }

  class DocumentSymbol {
    public children: DocumentSymbol[] = [];
    public constructor(
      public readonly name: string,
      public readonly detail: string,
      public readonly kind: number,
      public readonly range: Range,
      public readonly selectionRange: Range
    ) {}
  }

  const SymbolKind = {
    Namespace: 2,
    String: 14,
    Object: 18,
    Struct: 22,
  };

  return { Position, Range, DocumentSymbol, SymbolKind };
});

import * as vscode from 'vscode';
import { SvgOutlineParser } from '../src/core/svgOutlineParser';
import { SvgDocumentSymbolProvider } from '../src/providers/svgDocumentSymbolProvider';

function createMockTextDocument(content: string): vscode.TextDocument {
  const lineStarts: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  return {
    getText: () => content,
    positionAt: (offset: number): vscode.Position => {
      let low = 0;
      let high = lineStarts.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (lineStarts[mid] <= offset) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const line = Math.max(0, high);
      return new vscode.Position(line, offset - lineStarts[line]);
    },
  } as unknown as vscode.TextDocument;
}

function createToken(cancelled = false): vscode.CancellationToken {
  return {
    isCancellationRequested: cancelled,
    onCancellationRequested: vi.fn(),
  } as unknown as vscode.CancellationToken;
}

describe('SvgDocumentSymbolProvider', () => {
  const provider = new SvgDocumentSymbolProvider(new SvgOutlineParser());

  it('formats node names as tag#id or tag and maps SymbolKind accurately', () => {
    const svg = [
      '<svg id="canvas">',
      '  <g id="layer1">',
      '    <rect id="start" x="10" y="20"/>',
      '    <text>Hello</text>',
      '    <customTag/>',
      '  </g>',
      '</svg>',
    ].join('\n');

    const symbols = provider.provideDocumentSymbols(
      createMockTextDocument(svg),
      createToken(false)
    );

    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('svg#canvas');
    expect(symbols[0].kind).toBe(vscode.SymbolKind.Namespace);

    const layer = symbols[0].children[0];
    expect(layer.name).toBe('g#layer1');
    expect(layer.kind).toBe(vscode.SymbolKind.Namespace);

    expect(layer.children.map((s) => [s.name, s.kind])).toEqual([
      ['rect#start', vscode.SymbolKind.Object],
      ['text', vscode.SymbolKind.String],
      ['customTag', vscode.SymbolKind.Struct],
    ]);
  });

  it('computes accurate ranges with selectionRange strictly inside range for LF and CRLF', () => {
    for (const eol of ['\n', '\r\n']) {
      const svg = [
        '<svg id="root">',
        '  <g id="box">',
        '    <rect id="start" x="10" y="20"/>',
        '  </g>',
        '</svg>',
      ].join(eol);

      const symbols = provider.provideDocumentSymbols(
        createMockTextDocument(svg),
        createToken(false)
      );

      const root = symbols[0];
      const box = root.children[0];
      const rect = box.children[0];

      // rect is on line 2 (0-indexed), starting at column 4 ("    <rect...")
      expect(rect.selectionRange.start.line).toBe(2);
      expect(rect.selectionRange.start.character).toBe(5);
      expect(rect.selectionRange.end.line).toBe(2);
      expect(rect.selectionRange.end.character).toBe(9);

      expect(root.range.contains(root.selectionRange)).toBe(true);
      expect(box.range.contains(box.selectionRange)).toBe(true);
      expect(rect.range.contains(rect.selectionRange)).toBe(true);
    }
  });

  it('returns empty array on malformed XML and when cancellation is requested', () => {
    const malformedDoc = createMockTextDocument('<svg><rect id="broken"');
    expect(
      provider.provideDocumentSymbols(malformedDoc, createToken(false))
    ).toEqual([]);

    const validDoc = createMockTextDocument('<svg id="ok"><rect/></svg>');
    expect(
      provider.provideDocumentSymbols(validDoc, createToken(true))
    ).toEqual([]);
  });

  it('supports multiline opening tags and live edit -> break -> recover transitions', () => {
    const multilineSvg = [
      '<svg',
      '  id="root"',
      '  width="800"',
      '>',
      '  <rect',
      '    id="start"',
      '    x="10"',
      '  />',
      '</svg>',
    ].join('\n');

    const initial = provider.provideDocumentSymbols(
      createMockTextDocument(multilineSvg),
      createToken(false)
    );
    expect(initial[0].name).toBe('svg#root');
    expect(initial[0].selectionRange.start.line).toBe(0);
    expect(initial[0].children[0].name).toBe('rect#start');
    expect(initial[0].children[0].selectionRange.start.line).toBe(4);
    expect(initial[0].children[0].range.contains(initial[0].children[0].selectionRange)).toBe(true);

    const broken = provider.provideDocumentSymbols(
      createMockTextDocument(multilineSvg.replace('</svg>', '')),
      createToken(false)
    );
    expect(broken).toEqual([]);

    const recovered = provider.provideDocumentSymbols(
      createMockTextDocument(multilineSvg.replace('id="start"', 'id="begin"')),
      createToken(false)
    );
    expect(recovered[0].children[0].name).toBe('rect#begin');
  });
});
