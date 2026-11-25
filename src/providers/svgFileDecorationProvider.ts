import * as vscode from 'vscode';
import { FileStatReader, SvgFileRule } from '../core/svgFileRule';

const IGNORED_SCHEMES = new Set(['untitled', 'output', 'debug', 'git']);

/**
 * VSCode FileDecorationProvider adapter for attaching the "[]" badge to .svg files.
 */
export class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  public static readonly BADGE_TEXT = '[]';
  public static readonly TOOLTIP_TEXT = 'SVG file';

  public constructor(
    private readonly rule: SvgFileRule,
    private readonly statReader?: FileStatReader
  ) {}

  public async provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<vscode.FileDecoration | undefined> {
    if (token.isCancellationRequested || IGNORED_SCHEMES.has(uri.scheme)) {
      return undefined;
    }

    const reader: FileStatReader = this.statReader ?? {
      isRegularFile: async (): Promise<boolean> => {
        const stat = await vscode.workspace.fs.stat(uri);
        const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;
        const isFile = (stat.type & vscode.FileType.File) !== 0;
        return !isDirectory && isFile;
      },
    };

    const decorate = await this.rule.shouldDecorate(uri.path, reader);
    if (token.isCancellationRequested || !decorate) {
      return undefined;
    }

    const decoration = new vscode.FileDecoration(
      SvgFileDecorationProvider.BADGE_TEXT,
      SvgFileDecorationProvider.TOOLTIP_TEXT
    );
    decoration.propagate = false;
    return decoration;
  }
}
