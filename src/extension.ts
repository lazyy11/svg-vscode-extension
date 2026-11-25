import * as vscode from 'vscode';
import { SvgFileRule } from './core/svgFileRule';
import { SvgOutlineParser } from './core/svgOutlineParser';
import { SvgDocumentSymbolProvider } from './providers/svgDocumentSymbolProvider';
import { SvgFileDecorationProvider } from './providers/svgFileDecorationProvider';

const SVG_DOCUMENT_SELECTOR: vscode.DocumentSelector = [
  { pattern: '**/*.[sS][vV][gG]' },
];

export function activate(context: vscode.ExtensionContext): void {
  const fileRule = new SvgFileRule();
  const decorationProvider = new SvgFileDecorationProvider(fileRule);
  const outlineParser = new SvgOutlineParser();
  const symbolProvider = new SvgDocumentSymbolProvider(outlineParser);

  const decorationDisposable =
    vscode.window.registerFileDecorationProvider(decorationProvider);
  const symbolDisposable = vscode.languages.registerDocumentSymbolProvider(
    SVG_DOCUMENT_SELECTOR,
    symbolProvider
  );

  context.subscriptions.push(decorationDisposable, symbolDisposable);
}

export function deactivate(): void {
  // Registered disposables are cleaned up automatically via context.subscriptions.
}
