import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRegisterFileDecorationProvider = vi.fn();
const mockRegisterDocumentSymbolProvider = vi.fn();

vi.mock('vscode', () => ({
  window: {
    registerFileDecorationProvider: (...args: unknown[]) =>
      mockRegisterFileDecorationProvider(...args),
  },
  languages: {
    registerDocumentSymbolProvider: (...args: unknown[]) =>
      mockRegisterDocumentSymbolProvider(...args),
  },
}));

import * as vscode from 'vscode';
import { activate, deactivate } from '../src/extension';

describe('extension entry', () => {
  beforeEach(() => {
    mockRegisterFileDecorationProvider.mockReset();
    mockRegisterDocumentSymbolProvider.mockReset();
  });

  it('registers both providers and tracks their disposables in context.subscriptions', () => {
    const decoDisposable = { dispose: vi.fn() };
    const symDisposable = { dispose: vi.fn() };
    mockRegisterFileDecorationProvider.mockReturnValue(decoDisposable);
    mockRegisterDocumentSymbolProvider.mockReturnValue(symDisposable);

    const subscriptions: vscode.Disposable[] = [];
    const context = { subscriptions } as unknown as vscode.ExtensionContext;

    activate(context);

    expect(mockRegisterFileDecorationProvider).toHaveBeenCalledTimes(1);
    expect(mockRegisterDocumentSymbolProvider).toHaveBeenCalledTimes(1);
    expect(mockRegisterDocumentSymbolProvider.mock.calls[0][0]).toEqual([
      { scheme: 'file', pattern: '**/*.[sS][vV][gG]' },
      { scheme: 'vscode-remote', pattern: '**/*.[sS][vV][gG]' },
    ]);
    expect(subscriptions).toEqual([decoDisposable, symDisposable]);
    expect(() => deactivate()).not.toThrow();
  });

  it('declares onStartupFinished activation and compiled extension entry in package.json', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      publisher?: string;
      activationEvents?: string[];
      main?: string;
      capabilities?: { untrustedWorkspaces?: { supported?: boolean } };
    };

    expect(pkg.publisher).toBe('lazyy11');
    expect(pkg.activationEvents).toContain('onStartupFinished');
    expect(pkg.main).toBe('./out/extension.js');
    expect(pkg.capabilities?.untrustedWorkspaces?.supported).toBe(true);
  });
});
