import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStat = vi.fn();

vi.mock('vscode', () => {
  class FileDecoration {
    public propagate?: boolean;
    public constructor(
      public readonly badge?: string,
      public readonly tooltip?: string
    ) {}
  }

  const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  };

  return {
    FileDecoration,
    FileType,
    workspace: {
      fs: {
        stat: (...args: unknown[]) => mockStat(...args),
      },
    },
  };
});

import * as vscode from 'vscode';
import { SvgFileRule } from '../src/core/svgFileRule';
import { SvgFileDecorationProvider } from '../src/providers/svgFileDecorationProvider';

function createUri(path: string, scheme = 'file'): vscode.Uri {
  return { scheme, path, fsPath: path } as unknown as vscode.Uri;
}

function createToken(cancelled = false): vscode.CancellationToken {
  return {
    isCancellationRequested: cancelled,
    onCancellationRequested: vi.fn(),
  } as unknown as vscode.CancellationToken;
}

describe('SvgFileDecorationProvider', () => {
  beforeEach(() => {
    mockStat.mockReset();
  });

  it('returns [] FileDecoration for regular .svg files and symlinks to .svg files', async () => {
    const provider = new SvgFileDecorationProvider(new SvgFileRule());

    mockStat.mockResolvedValueOnce({ type: vscode.FileType.File });
    const fileDeco = await provider.provideFileDecoration(
      createUri('/workspace/example.svg'),
      createToken(false)
    );
    expect(fileDeco?.badge).toBe('[]');
    expect(fileDeco?.tooltip).toBe('SVG file');
    expect(fileDeco?.propagate).toBe(false);

    mockStat.mockResolvedValueOnce({
      type: vscode.FileType.SymbolicLink | vscode.FileType.File,
    });
    const symlinkFileDeco = await provider.provideFileDecoration(
      createUri('/workspace/link.SVG'),
      createToken(false)
    );
    expect(symlinkFileDeco?.badge).toBe('[]');
  });

  it('returns undefined for directories and symlinks to directories named .svg', async () => {
    const provider = new SvgFileDecorationProvider(new SvgFileRule());

    mockStat.mockResolvedValueOnce({ type: vscode.FileType.Directory });
    expect(
      await provider.provideFileDecoration(
        createUri('/workspace/fake.svg'),
        createToken(false)
      )
    ).toBeUndefined();

    mockStat.mockResolvedValueOnce({
      type: vscode.FileType.SymbolicLink | vscode.FileType.Directory,
    });
    expect(
      await provider.provideFileDecoration(
        createUri('/workspace/dirlink.svg'),
        createToken(false)
      )
    ).toBeUndefined();
  });

  it('returns undefined without calling workspace.fs.stat for non-svg files, ignored schemes, or cancelled tokens', async () => {
    const provider = new SvgFileDecorationProvider(new SvgFileRule());

    expect(
      await provider.provideFileDecoration(
        createUri('/workspace/notes.txt'),
        createToken(false)
      )
    ).toBeUndefined();

    expect(
      await provider.provideFileDecoration(
        createUri('/workspace/example.svg', 'git'),
        createToken(false)
      )
    ).toBeUndefined();

    expect(
      await provider.provideFileDecoration(
        createUri('/workspace/example.svg'),
        createToken(true)
      )
    ).toBeUndefined();

    expect(mockStat).not.toHaveBeenCalled();
  });

  it('returns undefined safely when workspace.fs.stat throws', async () => {
    const provider = new SvgFileDecorationProvider(new SvgFileRule());
    mockStat.mockRejectedValueOnce(new Error('FileNotFound'));

    await expect(
      provider.provideFileDecoration(
        createUri('/workspace/missing.svg'),
        createToken(false)
      )
    ).resolves.toBeUndefined();
  });
});
