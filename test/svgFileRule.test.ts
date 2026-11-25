import { describe, expect, it, vi } from 'vitest';
import { FileStatReader, SvgFileRule } from '../src/core/svgFileRule';

describe('SvgFileRule', () => {
  const rule = new SvgFileRule();

  describe('isSvgFilePath', () => {
    it('matches standard and mixed-case .svg file paths', () => {
      expect(rule.isSvgFilePath('example.svg')).toBe(true);
      expect(rule.isSvgFilePath('LOGO.SVG')).toBe(true);
      expect(rule.isSvgFilePath('Icon.Svg')).toBe(true);
      expect(rule.isSvgFilePath('/workspace/sub/dir/flow.svg')).toBe(true);
      expect(rule.isSvgFilePath('C:\\workspace\\assets\\Chart.SVG')).toBe(true);
      expect(rule.isSvgFilePath('.hidden-icon.svg')).toBe(true);
    });

    it('rejects non-svg files, bare .svg dotfiles, and trailing-slash directory paths', () => {
      expect(rule.isSvgFilePath('notes.txt')).toBe(false);
      expect(rule.isSvgFilePath('data.xml')).toBe(false);
      expect(rule.isSvgFilePath('svg')).toBe(false);
      expect(rule.isSvgFilePath('demo.svg.bak')).toBe(false);
      expect(rule.isSvgFilePath('demo.svg.json')).toBe(false);
      expect(rule.isSvgFilePath('.svg')).toBe(false);
      expect(rule.isSvgFilePath('/workspace/.svg')).toBe(false);
      expect(rule.isSvgFilePath('C:\\workspace\\.SVG')).toBe(false);
      expect(rule.isSvgFilePath('')).toBe(false);
      expect(rule.isSvgFilePath('assets/')).toBe(false);
      expect(rule.isSvgFilePath('icons.svg/')).toBe(false);
      expect(rule.isSvgFilePath('C:\\icons.svg\\')).toBe(false);
    });
  });

  describe('shouldDecorate', () => {
    it('returns true for regular .svg files', async () => {
      const statReader: FileStatReader = {
        isRegularFile: vi.fn().mockResolvedValue(true),
      };

      await expect(
        rule.shouldDecorate('/workspace/example.svg', statReader)
      ).resolves.toBe(true);
      expect(statReader.isRegularFile).toHaveBeenCalledTimes(1);
      expect(statReader.isRegularFile).toHaveBeenCalledWith(
        '/workspace/example.svg'
      );
    });

    it('short-circuits non-svg paths and bare .svg files without touching statReader', async () => {
      const statReader: FileStatReader = {
        isRegularFile: vi.fn().mockResolvedValue(true),
      };

      await expect(
        rule.shouldDecorate('/workspace/readme.txt', statReader)
      ).resolves.toBe(false);
      await expect(
        rule.shouldDecorate('/workspace/.svg', statReader)
      ).resolves.toBe(false);
      await expect(
        rule.shouldDecorate('/workspace/icons.svg/', statReader)
      ).resolves.toBe(false);

      expect(statReader.isRegularFile).not.toHaveBeenCalled();
    });

    it('returns false for directories even when named with .svg suffix', async () => {
      const statReader: FileStatReader = {
        isRegularFile: vi.fn().mockResolvedValue(false),
      };

      await expect(
        rule.shouldDecorate('/workspace/fake.svg', statReader)
      ).resolves.toBe(false);
      expect(statReader.isRegularFile).toHaveBeenCalledTimes(1);
    });

    it('returns false safely when statReader throws', async () => {
      const statReader: FileStatReader = {
        isRegularFile: vi
          .fn()
          .mockRejectedValue(new Error('ENOENT: file not found')),
      };

      await expect(
        rule.shouldDecorate('/workspace/deleted.svg', statReader)
      ).resolves.toBe(false);
    });
  });
});
