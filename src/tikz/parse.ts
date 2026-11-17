import { uid } from '../model/ids';
import type { TikzDrawing, TikzPoint, TikzShape } from '../model/types';
import { normalizeHex, resolveColorName } from './colors';
import { DEFAULT_FONT_SIZE } from './drawing';

export interface ParsedTikz {
  shapes: TikzShape[];
  width: number;
  height: number;
  /** Statements that used syntax the visual model cannot represent. */
  unsupported: number;
}

interface RawShape extends Omit<TikzShape, 'id'> {
  id?: string;
  /** Generated label node (the `name=bxlabel…` marker) to fold into its host. */
  attachedLabel?: boolean;
}

const UNITS: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  pt: 0.3514598,
  bp: 0.3527778,
  pc: 4.2175,
  dd: 0.376065,
};

const COORD = /\(\s*(-?\d*\.?\d+)\s*(mm|cm|in|pt|bp|pc|dd)?\s*,\s*(-?\d*\.?\d+)\s*(mm|cm|in|pt|bp|pc|dd)?\s*\)/g;

function lengthToMm(value: string, unit: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed * (UNITS[unit ?? 'mm'] ?? 1);
}

function stripComments(code: string): string {
  let out = '';
  for (let index = 0; index < code.length; index += 1) {
    const char = code[index];
    if (char === '\\' && code[index + 1] === '%') {
      out += '\\%';
      index += 1;
      continue;
    }
    if (char === '%') {
      while (index < code.length && code[index] !== '\n') index += 1;
      out += '\n';
      continue;
    }
    out += char;
  }
  return out;
}

function collectDefines(code: string): { defined: Record<string, string>; rest: string } {
  const defined: Record<string, string> = {};
  const rest = code.replace(
    /\\definecolor\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    (_match, name: string, model: string, spec: string) => {
      const hex = defineColorHex(model, spec);
      if (hex) defined[name.trim().toLowerCase()] = hex;
      return '';
    },
  );
  return { defined, rest };
}

function defineColorHex(model: string, spec: string): string | null {
  const kind = model.trim().toLowerCase();
  const values = spec.split(',').map((entry) => Number(entry.trim()));
  if (kind === 'html') return normalizeHex(spec.trim());
  if (kind === 'rgb' && values.length >= 3) {
    return rgbHex(values[0] * 255, values[1] * 255, values[2] * 255);
  }
  if (kind === 'cmyk' && values.length >= 4) {
    const [c, m, y, k] = values;
    return rgbHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
  }
  if (kind === 'gray' && values.length >= 1) {
    return rgbHex(values[0] * 255, values[0] * 255, values[0] * 255);
  }
  if (kind === 'named') return resolveColorName(spec.trim());
  return null;
}

function rgbHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[r, g, b]
    .map((value) => clamp(value).toString(16).padStart(2, '0'))
    .join('')}`;
}

function splitStatements(code: string): string[] {
  const statements: string[] = [];
  let depthBrace = 0;
  let depthBracket = 0;
  let current = '';
  for (const char of code) {
    if (char === '{') depthBrace += 1;
    else if (char === '}') depthBrace = Math.max(0, depthBrace - 1);
    else if (char === '[') depthBracket += 1;
    else if (char === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (char === ';' && depthBrace === 0 && depthBracket === 0) {
      statements.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) statements.push(current);
  return statements;
}

interface Options {
  values: Record<string, string>;
  flags: Set<string>;
  arrows: boolean;
}

function parseOptions(raw: string | undefined): Options {
  const options: Options = { values: {}, flags: new Set(), arrows: false };
  if (!raw) return options;
  let depth = 0;
  let current = '';
  const parts: string[] = [];
  for (const char of raw) {
    if (char === '{') depth += 1;
    else if (char === '}') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  for (const part of parts) {
    const token = part.trim();
    if (!token) continue;
    if (token.includes('->') || token.includes('<-') || /^-?\{/.test(token)) {
      options.arrows = true;
    }
    const index = token.indexOf('=');
    if (index === -1) {
      options.flags.add(token.toLowerCase());
      continue;
    }
    const key = token.slice(0, index).trim().toLowerCase();
    const value = token.slice(index + 1).trim();
    options.values[key] = value;
  }
  return options;
}

function extractBracket(text: string): { inner: string | null; rest: string } {
  const leading = text.search(/\S/);
  if (leading === -1 || text[leading] !== '[') return { inner: null, rest: text };
  const start = leading;
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '[') depth += 1;
    else if (text[index] === ']') {
      depth -= 1;
      if (depth === 0) {
        return {
          inner: text.slice(start + 1, index),
          rest: text.slice(0, start) + text.slice(index + 1),
        };
      }
    }
  }
  return { inner: null, rest: text };
}

function parseCoords(text: string): TikzPoint[] {
  const points: TikzPoint[] = [];
  COORD.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COORD.exec(text)) !== null) {
    const x = lengthToMm(match[1], match[2]);
    const y = lengthToMm(match[3], match[4]);
    if (x !== null && y !== null) points.push({ x, y });
  }
  return points;
}

function stripUnits(value: string): number | null {
  const match = /^(-?\d*\.?\d+)\s*([a-z]+)?$/i.exec(value.trim().replace(/^\{|\}$/g, ''));
  if (!match) return null;
  return lengthToMm(match[1], match[2]?.toLowerCase());
}

function optionColor(
  options: Options,
  key: string,
  defined: Record<string, string>,
): string | undefined {
  const raw = options.values[key];
  if (!raw) return undefined;
  return resolveInlineColor(raw, defined);
}

function resolveInlineColor(raw: string, defined: Record<string, string>): string {
  const value = raw.trim().replace(/^\{|\}$/g, '');
  if (value.toLowerCase() === 'none') return 'none';
  const rgb = /^rgb\s*,\s*255\s*:\s*red\s*,\s*(\d+)\s*;\s*green\s*,\s*(\d+)\s*;\s*blue\s*,\s*(\d+)$/i.exec(
    value,
  );
  if (rgb) return rgbHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  return resolveColorName(value, defined) ?? '#000000';
}

function parseStrokeWidth(options: Options): number | undefined {
  const lineWidth = options.values['line width'];
  if (lineWidth) {
    const value = stripUnits(lineWidth);
    if (value !== null) return Math.abs(value);
  }
  if (options.flags.has('ultra thick')) return 1.6;
  if (options.flags.has('very thick')) return 1.2;
  if (options.flags.has('thick')) return 0.8;
  if (options.flags.has('very thin')) return 0.1;
  if (options.flags.has('thin')) return 0.2;
  return undefined;
}

function parseRotation(options: Options): number | undefined {
  const around = options.values['rotate around'];
  if (around) {
    const match = /(-?\d*\.?\d+)/.exec(around);
    if (match) return -Number(match[1]);
  }
  const rotate = options.values.rotate;
  if (rotate) {
    const value = Number(rotate);
    if (Number.isFinite(value)) return -value;
  }
  return undefined;
}

function parseFontSize(options: Options): number | undefined {
  const font = options.values.font;
  if (!font) return undefined;
  const match = /\\fontsize\{(-?\d*\.?\d+)pt\}/.exec(font);
  if (match) {
    const pt = Number(match[1]);
    return pt > 0 ? pt / 2.845276 : undefined;
  }
  const named: Record<string, number> = {
    tiny: 1.1,
    scriptsize: 1.5,
    footnotesize: 1.9,
    small: 2.2,
    normalsize: 2.8,
    large: 3.6,
    Large: 4.5,
    LARGE: 5.4,
    huge: 6.5,
  };
  const token = /\\([A-Za-z]+)/.exec(font);
  if (token && named[token[1]] !== undefined) return named[token[1]];
  return undefined;
}

/** Opacity is 0–1, optionally written as a percentage; returns 0–100. */
function parseOpacity(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim().replace(/^\{|\}$/g, '');
  if (!value) return undefined;
  const percent = value.endsWith('%');
  const number = Number(percent ? value.slice(0, -1) : value);
  if (!Number.isFinite(number)) return undefined;
  return Math.round(Math.max(0, Math.min(100, percent ? number : number * 100)));
}

function opacityOption(options: Options, key: string): number | undefined {
  return parseOpacity(options.values[key] ?? options.values.opacity);
}

function parseCornerRadius(options: Options): number | undefined {
  const raw = options.values['rounded corners'];
  if (raw !== undefined) {
    const value = stripUnits(raw);
    return value === null ? 1.4 : Math.max(0, value);
  }
  return options.flags.has('rounded corners') ? 1.4 : undefined;
}

function shapeBase(
  kind: TikzShape['kind'],
  options: Options,
  defined: Record<string, string>,
): Omit<TikzShape, 'id' | 'x' | 'y'> {
  const stroke = optionColor(options, 'draw', defined) ?? optionColor(options, 'color', defined);
  const fill = optionColor(options, 'fill', defined);
  const strokeOpacity = opacityOption(options, 'draw opacity');
  const fillOpacity = opacityOption(options, 'fill opacity');
  return {
    kind,
    stroke: stroke ?? '#000000',
    fill: fill && fill !== 'none' ? fill : undefined,
    strokeWidth: parseStrokeWidth(options),
    cornerRadius: parseCornerRadius(options),
    strokeOpacity: strokeOpacity !== undefined && strokeOpacity < 100 ? strokeOpacity : undefined,
    fillOpacity: fillOpacity !== undefined && fillOpacity < 100 ? fillOpacity : undefined,
    dashed:
      options.flags.has('dashed') ||
      options.flags.has('dotted') ||
      options.flags.has('densely dashed') ||
      options.flags.has('loosely dashed'),
    rotation: parseRotation(options),
  };
}

function parseNode(command: string, options: Options, defined: Record<string, string>): RawShape | null {
  const at = /at\s*\(/.exec(command);
  if (!at) return null;
  const coordStart = at.index + at[0].length - 1;
  const coords = parseCoords(command.slice(coordStart));
  if (coords.length === 0) return null;
  const textStart = command.lastIndexOf('{');
  const textEnd = command.lastIndexOf('}');
  if (textStart === -1 || textEnd < textStart) return null;
  const text = command
    .slice(textStart + 1, textEnd)
    .replace(/\\\\/g, '\n')
    .trim();
  const stroke =
    optionColor(options, 'text', defined) ??
    optionColor(options, 'color', defined) ??
    '#000000';
  const textOpacity = opacityOption(options, 'text opacity');
  return {
    kind: 'text',
    x: coords[0].x,
    y: coords[0].y,
    text,
    fontSize: parseFontSize(options) ?? DEFAULT_FONT_SIZE,
    rotation: parseRotation(options),
    stroke,
    textOpacity: textOpacity !== undefined && textOpacity < 100 ? textOpacity : undefined,
    attachedLabel: /^bxlabel/i.test(options.values.name ?? ''),
  };
}

function centerOf(shape: TikzShape): TikzPoint {
  if (shape.kind === 'path' && shape.points && shape.points.length > 0) {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }
  return { x: (shape.x + (shape.x2 ?? shape.x)) / 2, y: (shape.y + (shape.y2 ?? shape.y)) / 2 };
}

function isLabelHost(shape: TikzShape): boolean {
  return (
    shape.kind === 'rect' ||
    shape.kind === 'ellipse' ||
    (shape.kind === 'path' && shape.closed === true)
  );
}

/**
 * Generated labelled shapes emit their label as a separate centred node.
 * Attach such nodes back to the shape so code edits keep the label linked.
 */
function attachLabels(
  shapes: Array<TikzShape & { attachedLabel?: boolean }>,
): TikzShape[] {
  const hosts = shapes.filter((shape) => isLabelHost(shape) && !shape.text);
  const consumed = new Set<string>();
  for (const shape of shapes) {
    if (shape.kind !== 'text' || !shape.attachedLabel || !shape.text?.trim()) continue;
    const host = hosts.find((candidate) => {
      if (consumed.has(candidate.id)) return false;
      const target = centerOf(candidate);
      return Math.hypot(target.x - shape.x, target.y - shape.y) <= 0.35;
    });
    if (!host) continue;
    host.text = shape.text;
    host.fontSize = shape.fontSize;
    if (shape.stroke && shape.stroke !== 'none') host.textColor = shape.stroke;
    host.textOpacity = shape.textOpacity;
    consumed.add(shape.id);
  }
  return shapes
    .filter((shape) => !consumed.has(shape.id))
    .map((shape) => {
      const clean: TikzShape & { attachedLabel?: boolean } = { ...shape };
      delete clean.attachedLabel;
      return clean;
    });
}

function parsePathCommand(
  command: string,
  options: Options,
  defined: Record<string, string>,
): RawShape | null {
  const base = shapeBase('line', options, defined);
  const arrow = options.arrows;

  const rectangle = /^(.*?)\brectangle\b(.*)$/s.exec(command);
  if (rectangle) {
    const start = parseCoords(rectangle[1]).pop();
    const end = parseCoords(rectangle[2])[0];
    if (!start || !end) return null;
    return { ...base, kind: 'rect', x: start.x, y: start.y, x2: end.x, y2: end.y };
  }

  const circle = /\bcircle\b/.exec(command);
  if (circle) {
    const center = parseCoords(command.slice(0, circle.index)).pop();
    if (!center) return null;
    const trailing = command.slice(circle.index);
    const bracket = /\[([^\]]*)\]/.exec(trailing);
    let radius: number | null = null;
    if (bracket) {
      const radiusMatch = /radius\s*=\s*([^,\]]+)/.exec(bracket[1]);
      if (radiusMatch) radius = stripUnits(radiusMatch[1]);
    }
    if (radius === null) {
      const paren = /\(\s*([^)]+)\)/.exec(trailing);
      if (paren) radius = stripUnits(paren[1]);
    }
    if (radius === null) return null;
    return {
      ...base,
      kind: 'ellipse',
      x: center.x - radius,
      y: center.y - radius,
      x2: center.x + radius,
      y2: center.y + radius,
    };
  }

  const ellipse = /\bellipse\b/.exec(command);
  if (ellipse) {
    const center = parseCoords(command.slice(0, ellipse.index)).pop();
    if (!center) return null;
    const trailing = command.slice(ellipse.index);
    const bracket = /\[([^\]]*)\]/.exec(trailing);
    let rx: number | null = null;
    let ry: number | null = null;
    if (bracket) {
      const xr = /x\s*radius\s*=\s*([^,\]]+)/.exec(bracket[1]);
      const yr = /y\s*radius\s*=\s*([^,\]]+)/.exec(bracket[1]);
      if (xr) rx = stripUnits(xr[1]);
      if (yr) ry = stripUnits(yr[1]);
    }
    if (rx === null) {
      const paren = /\(\s*([^)]+)\)/.exec(trailing);
      if (paren) {
        const parts = paren[1].split(/\band\b/);
        rx = stripUnits(parts[0]);
        ry = parts[1] ? stripUnits(parts[1]) : rx;
      }
    }
    if (rx === null || ry === null) return null;
    return {
      ...base,
      kind: 'ellipse',
      x: center.x - rx,
      y: center.y - ry,
      x2: center.x + rx,
      y2: center.y + ry,
    };
  }

  const plot = /plot\s*(?:\[[^\]]*\])?\s*coordinates\s*\{([\s\S]*?)\}/.exec(command);
  if (plot) {
    const points = parseCoords(plot[1]);
    if (points.length < 2) return null;
    return {
      ...base,
      kind: 'path',
      x: points[0].x,
      y: points[0].y,
      points,
      closed: /\bcycle\b/.test(command),
      arrow,
    };
  }

  if (/\.\.|controls|\barc\b|\bsin\b|\bcos\b|\bgrid\b|\bparabola\b|\bto\b/.test(command)) {
    return null;
  }

  const points = parseCoords(command);
  if (points.length < 2) return null;
  const closed = /\bcycle\b/.test(command);
  if (points.length === 2 && !closed) {
    return {
      ...base,
      kind: arrow ? 'arrow' : 'line',
      x: points[0].x,
      y: points[0].y,
      x2: points[1].x,
      y2: points[1].y,
    };
  }
  return {
    ...base,
    kind: 'path',
    x: points[0].x,
    y: points[0].y,
    points,
    closed,
    arrow,
  };
}

function statementShape(
  statement: string,
  defined: Record<string, string>,
): RawShape | null {
  const head = /^\s*\\(draw|fill|filldraw|path|node)\b/.exec(statement);
  if (!head) return null;
  const kind = head[1];
  const afterHead = statement.slice(head[0].length);
  const { inner, rest } = extractBracket(afterHead);
  const options = parseOptions(inner ?? undefined);
  if (kind === 'node') {
    return parseNode(rest, options, defined);
  }
  const shape = parsePathCommand(rest, options, defined);
  if (!shape) return null;
  if (kind === 'fill') {
    shape.stroke = 'none';
    shape.fill = optionColor(options, 'fill', defined) ?? optionColor(options, 'color', defined);
  } else if (kind === 'filldraw') {
    shape.stroke = optionColor(options, 'draw', defined) ?? '#000000';
    shape.fill = optionColor(options, 'fill', defined);
  }
  return shape;
}

function extents(shapes: RawShape[]): { maxX: number; maxY: number } {
  let maxX = 0;
  let maxY = 0;
  const add = (x: number, y: number, fontSize = 0) => {
    maxX = Math.max(maxX, x + fontSize * 0.6);
    maxY = Math.max(maxY, y + fontSize * 0.6);
  };
  for (const shape of shapes) {
    if (shape.points) {
      for (const point of shape.points) add(point.x, point.y);
    } else {
      add(shape.x, shape.y);
      if (shape.x2 !== undefined && shape.y2 !== undefined) add(shape.x2, shape.y2);
    }
    if (shape.kind === 'text') {
      const width = (shape.fontSize ?? DEFAULT_FONT_SIZE) * 0.6 * Math.max(1, (shape.text ?? '').length);
      maxX = Math.max(maxX, shape.x + width / 2);
      maxY = Math.max(maxY, shape.y);
    }
  }
  return { maxX, maxY };
}

/**
 * Parses the common manual TikZ subset back into canvas shapes. Coordinates are
 * millimetres (as in the generated `[x=1mm,y=1mm]` picture). Unknown commands
 * are counted so the editor can warn instead of silently dropping them.
 */
export function parseTikz(code: string, base: { width: number; height: number }): ParsedTikz {
  const cleaned = stripComments(code);
  const { defined, rest } = collectDefines(cleaned);
  let unsupported = 0;
  const parsed: RawShape[] = [];

  for (const statement of splitStatements(rest)) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    if (/^\\(begin|end|usetikzlibrary|tikzset|usepackage|pgf|scope|clip)\b/.test(trimmed)) continue;
    if (/^\\(coordinate)\b/.test(trimmed)) continue;
    const shape = statementShape(trimmed, defined);
    if (shape) {
      parsed.push(shape);
    } else if (/^\\(draw|fill|filldraw|path|node|shade|clip|foreach)\b/.test(trimmed)) {
      unsupported += 1;
    } else {
      unsupported += 1;
    }
  }

  const { maxX, maxY } = extents(parsed);
  const width = Math.max(base.width, Math.ceil(maxX) + (maxX >= base.width ? 1 : 0));
  const height = Math.max(base.height, Math.ceil(maxY) + (maxY >= base.height ? 1 : 0));

  const flip = (point: TikzPoint): TikzPoint => ({ x: point.x, y: height - point.y });
  const shapes = attachLabels(
    parsed.map((shape) => {
      const next: TikzShape & { attachedLabel?: boolean } = {
        ...shape,
        id: uid('shape'),
        x: shape.x,
        y: height - shape.y,
      };
      if (shape.x2 !== undefined && shape.y2 !== undefined) {
        next.x2 = shape.x2;
        next.y2 = height - shape.y2;
      }
      if (shape.points) next.points = shape.points.map(flip);
      return next;
    }),
  );

  return { shapes, width, height, unsupported };
}

export function parseIntoDrawing(
  code: string,
  base: Pick<TikzDrawing, 'width' | 'height'>,
): ParsedTikz & { drawing: TikzDrawing } {
  const parsed = parseTikz(code, base);
  return {
    ...parsed,
    drawing: {
      width: parsed.width,
      height: parsed.height,
      shapes: parsed.shapes,
      code: code.trim() || undefined,
    },
  };
}
