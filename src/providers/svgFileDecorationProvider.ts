import * as vscode from 'vscode';
import { FileStatReader, SvgFileRule } from '../core/svgFileRule';

/**
 * VSCode FileDecorationProvider adapter for attaching the "[]" badge to .svg files.
 */
export class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  public constructor(
    private readonly rule: SvgFileRule,
    private readonly statReader?: FileStatReader
  ) {}

  public async provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<vscode.FileDecoration | undefined> {
    // TODO: Implement decoration check with token cancellation and workspace.fs.stat fallback.
    void uri;
    void token;
    void this.rule;
    void this.statReader;
    return undefined;
  }
}
