import * as vscode from 'vscode';
import { SvgOutlineParser } from '../core/svgOutlineParser';

/**
 * VSCode DocumentSymbolProvider adapter mapping SvgOutlineNode trees to DocumentSymbol trees.
 */
export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public constructor(private readonly parser: SvgOutlineParser) {}

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    // TODO: Delegate to SvgOutlineParser and recursively map offsets to vscode.DocumentSymbol.
    void document;
    void token;
    void this.parser;
    return [];
  }
}
