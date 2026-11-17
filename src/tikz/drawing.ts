import { normalizeHex } from './colors';
import type { TikzDrawing, TikzPoint, TikzShape } from '../model/types';

export const DEFAULT_STROKE = '#000000';
export const DEFAULT_STROKE_WIDTH = 0.4;
export const DEFAULT_FONT_SIZE = 4;

const MM_TO_PT = 2.845276;

export function emptyDrawing(width: number, height: number): TikzDrawing {
  return { width, height, shapes: [] };
}

export function emptyBlockDrawing(): TikzDrawing {
  return emptyDrawing(80, 50);
}

/** 160×90 mm shares the 16:9 paper aspect, so scale 100% covers the page. */
export function emptyLayerDrawing(): TikzDrawing {
  return emptyDrawing(160, 90);
}

export function cloneDrawing(drawing: TikzDrawing): TikzDrawing {
  return {
    width: drawing.width,
    height: drawing.height,
    code: drawing.code,
    shapes: drawing.shapes.map((shape) => ({
      ...shape,
      points: shape.points ? shape.points.map((point) => ({ ...point })) : undefined,
    })),
  };
}

export function num(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}

function ptValue(pt: number): string {
  return pt.toFixed(1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pointText(point: TikzPoint, height: number): string {
  return `(${num(point.x)},${num(height - point.y)})`;
}

function shapeCenter(shape: TikzShape): TikzPoint {
  if (shape.kind === 'path' && shape.points && shape.points.length > 0) {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  }
  return { x: (shape.x + (shape.x2 ?? shape.x)) / 2, y: (shape.y + (shape.y2 ?? shape.y)) / 2 };
}

export function isLabelHost(shape: TikzShape): boolean {
  return (
    shape.kind === 'rect' ||
    shape.kind === 'ellipse' ||
    (shape.kind === 'path' && shape.closed === true)
  );
}

/** Named anchor points other shapes can snap to: corners, edge midpoints and centres. */
export interface ShapeAnchor {
  key: string;
  point: TikzPoint;
}

export function shapeAnchorEntries(shape: TikzShape): ShapeAnchor[] {
  if (shape.kind === 'text') return [{ key: 'center', point: { x: shape.x, y: shape.y } }];
  if (shape.kind === 'path' && shape.points) {
    return shape.points.map((point, index) => ({
      key: `v${index}`,
      point: { x: point.x, y: point.y },
    }));
  }
  const x2 = shape.x2 ?? shape.x;
  const y2 = shape.y2 ?? shape.y;
  const minX = Math.min(shape.x, x2);
  const maxX = Math.max(shape.x, x2);
  const minY = Math.min(shape.y, y2);
  const maxY = Math.max(shape.y, y2);
  if (shape.kind === 'line' || shape.kind === 'arrow') {
    return [
      { key: 'start', point: { x: shape.x, y: shape.y } },
      { key: 'end', point: { x: x2, y: y2 } },
      { key: 'mid', point: { x: (shape.x + x2) / 2, y: (shape.y + y2) / 2 } },
    ];
  }
  return [
    { key: 'nw', point: { x: minX, y: minY } },
    { key: 'n', point: { x: (minX + maxX) / 2, y: minY } },
    { key: 'ne', point: { x: maxX, y: minY } },
    { key: 'w', point: { x: minX, y: (minY + maxY) / 2 } },
    { key: 'center', point: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } },
    { key: 'e', point: { x: maxX, y: (minY + maxY) / 2 } },
    { key: 'sw', point: { x: minX, y: maxY } },
    { key: 's', point: { x: (minX + maxX) / 2, y: maxY } },
    { key: 'se', point: { x: maxX, y: maxY } },
  ];
}

export function shapeAnchors(shape: TikzShape): TikzPoint[] {
  return shapeAnchorEntries(shape).map((entry) => entry.point);
}

function anchorPointKey(point: TikzPoint): string {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function samePoint(a: TikzPoint, b: TikzPoint): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

/**
 * Keep connectors glued to anchors of a shape that moved or resized. Any line,
 * arrow or path point sitting exactly on an old anchor follows that anchor to
 * its new position; points that were elsewhere stay where they are.
 */
export function followMovedShape(
  shapes: TikzShape[],
  before: TikzShape,
  after: TikzShape,
): TikzShape[] {
  if (before.kind !== after.kind) return shapes;
  const afterByKey = new Map(shapeAnchorEntries(after).map((entry) => [entry.key, entry.point]));
  const destinations = new Map<string, TikzPoint>();
  for (const entry of shapeAnchorEntries(before)) {
    const destination = afterByKey.get(entry.key);
    if (!destination || samePoint(entry.point, destination)) continue;
    const key = anchorPointKey(entry.point);
    if (!destinations.has(key)) destinations.set(key, destination);
  }
  if (destinations.size === 0) return shapes;
  const remap = (point: TikzPoint): TikzPoint | undefined =>
    destinations.get(anchorPointKey(point));
  let changed = false;
  const result = shapes.map((shape) => {
    if (shape.id === before.id) return shape;
    if (shape.kind === 'line' || shape.kind === 'arrow') {
      const start = remap({ x: shape.x, y: shape.y });
      const end = remap({ x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y });
      if (!start && !end) return shape;
      changed = true;
      return {
        ...shape,
        x: start ? start.x : shape.x,
        y: start ? start.y : shape.y,
        x2: end ? end.x : (shape.x2 ?? shape.x),
        y2: end ? end.y : (shape.y2 ?? shape.y),
      };
    }
    if (shape.kind === 'path' && shape.points) {
      let pointMoved = false;
      const points = shape.points.map((point) => {
        const destination = remap(point);
        if (!destination) return point;
        pointMoved = true;
        return destination;
      });
      if (!pointMoved) return shape;
      changed = true;
      return { ...shape, points, x: points[0].x, y: points[0].y };
    }
    return shape;
  });
  return changed ? result : shapes;
}

export interface MagnetHit {
  point: TikzPoint;
  shapeId: string;
}

/** Nearest shape anchor within `threshold` millimetres, or null. */
export function magnetPoint(
  point: TikzPoint,
  shapes: TikzShape[],
  threshold = 2.5,
  excludeId?: string,
): MagnetHit | null {
  let best: MagnetHit | null = null;
  let bestDistance = threshold;
  for (const shape of shapes) {
    if (shape.id === excludeId) continue;
    for (const anchor of shapeAnchors(shape)) {
      const distance = Math.hypot(anchor.x - point.x, anchor.y - point.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { point: anchor, shapeId: shape.id };
      }
    }
  }
  return best;
}

/** Plain text is escaped, but `$...$` maths and backslash commands pass through. */
export function escapeLatexText(text: string): string {
  let out = '';
  let math = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\') {
      out += char + (text[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (char === '$') {
      math = !math;
      out += char;
      continue;
    }
    if (math) {
      out += char;
      continue;
    }
    switch (char) {
      case '&':
        out += '\\&';
        break;
      case '%':
        out += '\\%';
        break;
      case '#':
        out += '\\#';
        break;
      case '_':
        out += '\\_';
        break;
      case '^':
        out += '\\textasciicircum{}';
        break;
      case '~':
        out += '\\textasciitilde{}';
        break;
      default:
        out += char;
    }
  }
  return out;
}

interface ColorRegistry {
  names: Map<string, string>;
  lines: string[];
}

function colorRef(hex: string | undefined, registry: ColorRegistry): string | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const existing = registry.names.get(normalized);
  if (existing) return existing;
  const name = `bxtz${registry.names.size}`;
  registry.names.set(normalized, name);
  registry.lines.push(
    `\\definecolor{${name}}{HTML}{${normalized.slice(1).toUpperCase()}}`,
  );
  return name;
}

function opacityValue(opacity: number | undefined): string | null {
  if (opacity === undefined || opacity >= 100) return null;
  return num(Math.max(0, Math.min(100, opacity)) / 100);
}

function strokeOptions(shape: TikzShape, registry: ColorRegistry): string[] {
  const options: string[] = [];
  const stroke = shape.stroke ?? DEFAULT_STROKE;
  if (stroke === 'none') {
    options.push('draw=none');
  } else {
    const ref = colorRef(stroke, registry);
    if (ref) options.push(`draw=${ref}`);
    const drawOpacity = opacityValue(shape.strokeOpacity);
    if (drawOpacity) options.push(`draw opacity=${drawOpacity}`);
  }
  const fill = colorRef(shape.fill, registry);
  if (fill) {
    options.push(`fill=${fill}`);
    const fillOpacity = opacityValue(shape.fillOpacity);
    if (fillOpacity) options.push(`fill opacity=${fillOpacity}`);
  }
  const width = shape.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  if (Math.abs(width - DEFAULT_STROKE_WIDTH) > 0.001) options.push(`line width=${num(width)}mm`);
  if (shape.dashed) options.push('dashed');
  if (shape.kind === 'rect' && shape.cornerRadius && shape.cornerRadius > 0) {
    options.push(`rounded corners=${num(shape.cornerRadius)}mm`);
  }
  return options;
}

function fontOption(size: number): string {
  const points = size * MM_TO_PT;
  return `font=\\fontsize{${ptValue(points)}pt}{${ptValue(points * 1.2)}pt}\\selectfont`;
}

function rotationOption(shape: TikzShape, height: number): string | null {
  if (!shape.rotation) return null;
  const center = shapeCenter(shape);
  const pivot = `(${num(center.x)},${num(height - center.y)})`;
  return `rotate around={${num(-shape.rotation)}:${pivot}}`;
}

/** A `\node` with the shape's attached label, drawn above the shape itself. */
function labelCommand(
  shape: TikzShape,
  height: number,
  registry: ColorRegistry,
  index: number,
): string | null {
  const text = shape.text?.trim();
  if (!text || !isLabelHost(shape)) return null;
  const options = ['anchor=center', 'inner sep=0pt', `name=bxlabel${index}`];
  const color = colorRef(shape.textColor ?? DEFAULT_STROKE, registry);
  if (color) options.push(`text=${color}`);
  const rotate = rotationOption(shape, height);
  if (rotate) options.push(rotate);
  const textOpacity = opacityValue(shape.textOpacity);
  if (textOpacity) options.push(`text opacity=${textOpacity}`);
  options.push(fontOption(shape.fontSize ?? DEFAULT_FONT_SIZE));
  return `\\node[${options.join(',')}] at ${pointText(shapeCenter(shape), height)} {${escapeLatexText(
    text,
  )}};`;
}

function shapeCommand(shape: TikzShape, height: number, registry: ColorRegistry): string | null {
  if (shape.kind === 'text') {
    const stroke = shape.stroke ?? DEFAULT_STROKE;
    const options = ['anchor=center', 'inner sep=0pt'];
    const ref = colorRef(stroke === 'none' ? undefined : stroke, registry);
    if (ref) options.push(`text=${ref}`);
    if (shape.rotation) options.push(`rotate=${num(-shape.rotation)}`);
    const textOpacity = opacityValue(shape.textOpacity);
    if (textOpacity) options.push(`text opacity=${textOpacity}`);
    options.push(fontOption(shape.fontSize ?? DEFAULT_FONT_SIZE));
    const text = escapeLatexText(shape.text ?? '') || 'Text';
    return `\\node[${options.join(',')}] at ${pointText(shape, height)} {${text}};`;
  }

  const options = strokeOptions(shape, registry);
  const hasFill = normalizeHex(shape.fill) !== null;
  const hasStroke = (shape.stroke ?? DEFAULT_STROKE) !== 'none';
  const rotate = rotationOption(shape, height);
  if (rotate) options.push(rotate);
  const command = hasStroke ? (hasFill ? 'filldraw' : 'draw') : 'fill';
  if (!hasStroke && !hasFill) return null;

  switch (shape.kind) {
    case 'line':
    case 'arrow': {
      if (shape.kind === 'arrow' || shape.arrow) options.push('->');
      const end = { x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y };
      return `\\${command}[${options.join(',')}] ${pointText(shape, height)} -- ${pointText(
        end,
        height,
      )};`;
    }
    case 'rect': {
      const end = { x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y };
      return `\\${command}[${options.join(',')}] ${pointText(shape, height)} rectangle ${pointText(
        end,
        height,
      )};`;
    }
    case 'ellipse': {
      const end = { x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y };
      const cx = (shape.x + end.x) / 2;
      const cy = (shape.y + end.y) / 2;
      const rx = Math.abs(end.x - shape.x) / 2;
      const ry = Math.abs(end.y - shape.y) / 2;
      return `\\${command}[${options.join(',')}] (${num(cx)},${num(height - cy)}) ellipse [x radius=${num(
        rx,
      )}mm, y radius=${num(ry)}mm];`;
    }
    case 'path': {
      const points = shape.points ?? [];
      if (points.length < 2) return null;
      if (shape.arrow) options.push('->');
      const chain = points.map((point) => pointText(point, height)).join(' -- ');
      return `\\${command}[${options.join(',')}] ${chain}${shape.closed ? ' -- cycle' : ''};`;
    }
    default:
      return null;
  }
}

export function generateTikzCode(drawing: TikzDrawing): string {
  const registry: ColorRegistry = { names: new Map(), lines: [] };
  const commands: string[] = [];
  let labelIndex = 0;
  for (const shape of drawing.shapes) {
    const command = shapeCommand(shape, drawing.height, registry);
    if (command) commands.push(command);
    const label = labelCommand(shape, drawing.height, registry, labelIndex);
    if (label) {
      commands.push(label);
      labelIndex += 1;
    }
  }
  return [...registry.lines, ...commands].join('\n');
}

/** The source the exporter must honour: typed code when present, else generated. */
export function tikzBody(drawing: TikzDrawing): string {
  return drawing.code ?? generateTikzCode(drawing);
}

export function drawingSummary(drawing: TikzDrawing): string {
  const count = drawing.shapes.length;
  const noun = count === 1 ? 'shape' : 'shapes';
  return `${count} ${noun} · ${num(drawing.width)}×${num(drawing.height)}mm`;
}
