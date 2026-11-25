import { SvgOutlineNode } from './svgOutlineNode';

interface MutableOutlineNode {
  readonly tagName: string;
  readonly id?: string;
  readonly startOffset: number;
  endOffset: number;
  readonly nameStartOffset: number;
  readonly nameEndOffset: number;
  readonly children: SvgOutlineNode[];
}

interface ParsedOpeningTag {
  readonly tagName: string;
  readonly id?: string;
  readonly nameStartOffset: number;
  readonly nameEndOffset: number;
  readonly endOffset: number;
  readonly selfClosing: boolean;
}

/**
 * Lightweight, fault-tolerant single-pass SVG/XML scanner and stack parser.
 * Computes exact character offsets for every element and returns an empty list
 * on malformed or incomplete XML without ever throwing.
 */
export class SvgOutlineParser {
  public parse(source: string): SvgOutlineNode[] {
    if (!source || source.trim().length === 0) {
      return [];
    }

    const roots: SvgOutlineNode[] = [];
    const stack: MutableOutlineNode[] = [];
    const len = source.length;
    let pos = 0;

    while (pos < len) {
      const lt = source.indexOf('<', pos);
      if (lt === -1) {
        break;
      }

      pos = lt;
      if (pos + 1 >= len) {
        return [];
      }

      // 1. XML comment: <!-- ... -->
      if (source.startsWith('<!--', pos)) {
        const commentEnd = source.indexOf('-->', pos + 4);
        if (commentEnd === -1) {
          return [];
        }
        pos = commentEnd + 3;
        continue;
      }

      // 2. CDATA section: <![CDATA[ ... ]]>
      if (source.startsWith('<![CDATA[', pos)) {
        const cdataEnd = source.indexOf(']]>', pos + 9);
        if (cdataEnd === -1) {
          return [];
        }
        pos = cdataEnd + 3;
        continue;
      }

      // 3. Processing instruction: <? ... ?>
      if (source.startsWith('<?', pos)) {
        const piEnd = source.indexOf('?>', pos + 2);
        if (piEnd === -1) {
          return [];
        }
        pos = piEnd + 2;
        continue;
      }

      // 4. Declaration (e.g. <!DOCTYPE ...>)
      if (source.startsWith('<!', pos)) {
        const declEnd = this.skipDeclaration(source, pos);
        if (declEnd === -1) {
          return [];
        }
        pos = declEnd;
        continue;
      }

      // 5. Closing tag: </tagName>
      if (source.startsWith('</', pos)) {
        const nameStart = pos + 2;
        const nameEnd = this.readNameEnd(source, nameStart);
        if (nameEnd === -1) {
          return [];
        }

        const closeTagName = source.slice(nameStart, nameEnd);
        const afterWs = this.skipWhitespace(source, nameEnd);
        if (afterWs >= len || source[afterWs] !== '>') {
          return [];
        }

        if (stack.length === 0) {
          return [];
        }

        const openNode = stack.pop()!;
        if (openNode.tagName !== closeTagName) {
          return [];
        }

        pos = afterWs + 1;
        openNode.endOffset = pos;
        continue;
      }

      // 6. Opening or self-closing tag: <tagName ...> or <tagName .../>
      const parsed = this.parseOpeningTag(source, pos);
      if (parsed === null) {
        return [];
      }

      const node: MutableOutlineNode = {
        tagName: parsed.tagName,
        ...(parsed.id !== undefined ? { id: parsed.id } : {}),
        startOffset: pos,
        endOffset: parsed.endOffset,
        nameStartOffset: parsed.nameStartOffset,
        nameEndOffset: parsed.nameEndOffset,
        children: [],
      };

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      } else {
        roots.push(node);
      }

      if (!parsed.selfClosing) {
        stack.push(node);
      }

      pos = parsed.endOffset;
    }

    // Any unclosed opening tag means the XML is incomplete.
    if (stack.length !== 0) {
      return [];
    }

    return roots;
  }

  private parseOpeningTag(
    source: string,
    startPos: number
  ): ParsedOpeningTag | null {
    const len = source.length;
    const nameStartOffset = startPos + 1;
    const nameEndOffset = this.readNameEnd(source, nameStartOffset);
    if (nameEndOffset === -1) {
      return null;
    }

    const tagName = source.slice(nameStartOffset, nameEndOffset);
    let cur = nameEndOffset;
    let id: string | undefined;

    while (cur < len) {
      const beforeWs = cur;
      cur = this.skipWhitespace(source, cur);
      if (cur >= len) {
        return null;
      }

      const ch = source[cur];
      if (ch === '>') {
        return {
          tagName,
          id,
          nameStartOffset,
          nameEndOffset,
          endOffset: cur + 1,
          selfClosing: false,
        };
      }

      if (ch === '/') {
        if (cur + 1 >= len || source[cur + 1] !== '>') {
          return null;
        }
        return {
          tagName,
          id,
          nameStartOffset,
          nameEndOffset,
          endOffset: cur + 2,
          selfClosing: true,
        };
      }

      // Ensure separation right after tag name before reading attributes.
      if (beforeWs === nameEndOffset && cur === beforeWs) {
        return null;
      }

      const attrNameEnd = this.readNameEnd(source, cur);
      if (attrNameEnd === -1) {
        return null;
      }

      const attrName = source.slice(cur, attrNameEnd);
      cur = this.skipWhitespace(source, attrNameEnd);
      if (cur >= len || source[cur] !== '=') {
        return null;
      }

      cur = this.skipWhitespace(source, cur + 1);
      if (cur >= len) {
        return null;
      }

      const quote = source[cur];
      if (quote !== '"' && quote !== "'") {
        return null;
      }

      const closeQuote = source.indexOf(quote, cur + 1);
      if (closeQuote === -1) {
        return null;
      }

      if (attrName === 'id' && id === undefined) {
        const trimmed = source.slice(cur + 1, closeQuote).trim();
        if (trimmed.length > 0) {
          id = trimmed;
        }
      }

      cur = closeQuote + 1;
    }

    return null;
  }

  private skipDeclaration(source: string, startPos: number): number {
    const len = source.length;
    let cur = startPos + 2;
    if (cur >= len || !this.isAsciiLetter(source.charCodeAt(cur))) {
      return -1;
    }

    let quote: '"' | "'" | null = null;
    let bracketDepth = 0;

    while (cur < len) {
      const ch = source[cur];
      if (quote !== null) {
        if (ch === quote) {
          quote = null;
        }
      } else {
        if (ch === '"' || ch === "'") {
          quote = ch;
        } else if (ch === '[') {
          bracketDepth++;
        } else if (ch === ']') {
          if (bracketDepth === 0) {
            return -1;
          }
          bracketDepth--;
        } else if (ch === '>' && bracketDepth === 0) {
          return cur + 1;
        }
      }
      cur++;
    }

    return -1;
  }

  private readNameEnd(source: string, startPos: number): number {
    const len = source.length;
    if (startPos >= len || !this.isNameStartChar(source.charCodeAt(startPos))) {
      return -1;
    }

    let cur = startPos + 1;
    while (cur < len && this.isNameChar(source.charCodeAt(cur))) {
      cur++;
    }
    return cur;
  }

  private skipWhitespace(source: string, startPos: number): number {
    const len = source.length;
    let cur = startPos;
    while (cur < len) {
      const code = source.charCodeAt(cur);
      if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) {
        cur++;
      } else {
        break;
      }
    }
    return cur;
  }

  private isAsciiLetter(code: number): boolean {
    return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
  }

  private isNameStartChar(code: number): boolean {
    return this.isAsciiLetter(code) || code === 0x5f; // A-Z, a-z, _
  }

  private isNameChar(code: number): boolean {
    return (
      this.isNameStartChar(code) ||
      (code >= 0x30 && code <= 0x39) || // 0-9
      code === 0x2d || // -
      code === 0x2e || // .
      code === 0x3a // :
    );
  }
}
