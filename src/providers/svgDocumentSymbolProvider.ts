import * as vscode from 'vscode';
import { SvgOutlineNode } from '../core/svgOutlineNode';
import { SvgOutlineParser } from '../core/svgOutlineParser';

const CONTAINER_TAGS = new Set([
  'svg',
  'g',
  'defs',
  'symbol',
  'clippath',
  'mask',
  'pattern',
  'marker',
  'a',
  'switch',
  'foreignobject',
]);

const TEXT_TAGS = new Set(['text', 'tspan', 'textpath', 'title', 'desc']);

const SHAPE_TAGS = new Set([
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'image',
  'use',
]);

/**
 * VSCode DocumentSymbolProvider adapter mapping SvgOutlineNode trees to DocumentSymbol trees.
 */
export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public constructor(private readonly parser: SvgOutlineParser) {}

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) {
      return [];
    }

    const nodes = this.parser.parse(document.getText());
    if (token.isCancellationRequested || nodes.length === 0) {
      return [];
    }

    return nodes.map((node) => this.toDocumentSymbol(node, document));
  }

  private toDocumentSymbol(
    node: SvgOutlineNode,
    document: vscode.TextDocument
  ): vscode.DocumentSymbol {
    const displayName = node.id ? `${node.tagName}#${node.id}` : node.tagName;
    const kind = this.resolveSymbolKind(node.tagName);
    const range = new vscode.Range(
      document.positionAt(node.startOffset),
      document.positionAt(node.endOffset)
    );
    const selectionRange = new vscode.Range(
      document.positionAt(node.nameStartOffset),
      document.positionAt(node.nameEndOffset)
    );

    const symbol = new vscode.DocumentSymbol(
      displayName,
      '',
      kind,
      range,
      selectionRange
    );
    symbol.children = node.children.map((child) =>
      this.toDocumentSymbol(child, document)
    );
    return symbol;
  }

  private resolveSymbolKind(tagName: string): vscode.SymbolKind {
    const colonIndex = tagName.indexOf(':');
    const localName = (
      colonIndex >= 0 ? tagName.slice(colonIndex + 1) : tagName
    ).toLowerCase();

    if (CONTAINER_TAGS.has(localName)) {
      return vscode.SymbolKind.Namespace;
    }
    if (TEXT_TAGS.has(localName)) {
      return vscode.SymbolKind.String;
    }
    if (SHAPE_TAGS.has(localName)) {
      return vscode.SymbolKind.Object;
    }
    return vscode.SymbolKind.Struct;
  }
}
