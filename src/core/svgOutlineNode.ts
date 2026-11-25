/**
 * Domain model representing a single SVG/XML element node in the document outline.
 * Stores character offsets so the VSCode adapter can convert them via TextDocument.positionAt().
 */
export interface SvgOutlineNode {
  /** Element tag name, e.g. "svg", "g", "rect", "svg:rect". */
  readonly tagName: string;
  /** Trimmed non-empty id attribute value, if present. */
  readonly id?: string;
  /** Inclusive start character offset of '<'. */
  readonly startOffset: number;
  /** Exclusive end character offset right after closing '>'. */
  readonly endOffset: number;
  /** Inclusive start character offset of the opening tag name (for selectionRange). */
  readonly nameStartOffset: number;
  /** Exclusive end character offset of the opening tag name (for selectionRange). */
  readonly nameEndOffset: number;
  /** Direct child element nodes in source order. */
  readonly children: SvgOutlineNode[];
}
