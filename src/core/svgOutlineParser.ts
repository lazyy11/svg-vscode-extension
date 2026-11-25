import { SvgOutlineNode } from './svgOutlineNode';

/**
 * Lightweight, fault-tolerant single-pass SVG/XML scanner and stack parser.
 * Returns an empty list on malformed or incomplete XML without throwing.
 */
export class SvgOutlineParser {
  public parse(source: string): SvgOutlineNode[] {
    // TODO: Implement single-pass scanner and element stack per docs/design.md §3.4.
    void source;
    return [];
  }
}
