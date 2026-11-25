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
  public isSvgFilePath(filePath: string): boolean {
    // TODO: Implement case-insensitive .svg suffix check excluding bare ".svg" hidden files.
    void filePath;
    return false;
  }

  public async shouldDecorate(
    filePath: string,
    statReader: FileStatReader
  ): Promise<boolean> {
    // TODO: Combine path check with FileStatReader and safe error handling.
    void filePath;
    void statReader;
    return false;
  }
}
