/**
 * Abstraction for checking whether a path corresponds to a regular (non-directory) file.
 * Decouples domain rules from vscode.workspace.fs for unit testing.
 */
export interface FileStatReader {
  isRegularFile(filePath: string): Promise<boolean>;
}

/**
 * Pure domain rules for deciding whether an Explorer entry should receive the SVG badge.
 */
export class SvgFileRule {
  private static readonly SVG_EXTENSION = '.svg';

  /**
   * Checks whether the given path refers to a filename ending in ".svg" (case-insensitive),
   * excluding trailing-slash directory paths and bare ".svg" hidden files with no stem.
   * Performs pure string inspection with zero disk I/O.
   */
  public isSvgFilePath(filePath: string): boolean {
    if (!filePath || filePath.endsWith('/') || filePath.endsWith('\\')) {
      return false;
    }

    const lastSlash = Math.max(
      filePath.lastIndexOf('/'),
      filePath.lastIndexOf('\\')
    );
    const baseName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;

    // Require at least one character before ".svg" so bare ".svg" dotfiles are excluded.
    return (
      baseName.length > SvgFileRule.SVG_EXTENSION.length &&
      baseName.toLowerCase().endsWith(SvgFileRule.SVG_EXTENSION)
    );
  }

  /**
   * Determines whether a file path should be decorated with the SVG badge.
   * Non-SVG paths short-circuit immediately without touching the filesystem.
   */
  public async shouldDecorate(
    filePath: string,
    statReader: FileStatReader
  ): Promise<boolean> {
    if (!this.isSvgFilePath(filePath)) {
      return false;
    }

    try {
      return await statReader.isRegularFile(filePath);
    } catch {
      return false;
    }
  }
}
