import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { uid } from '../model/ids';
import type { TikzDrawing, TikzPoint, TikzShape } from '../model/types';
import {
  clamp,
  cloneDrawing,
  DEFAULT_FONT_SIZE,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  followMovedShape,
  generateTikzCode,
  isLabelHost,
  magnetPoint,
  shapeAnchors,
  type MagnetHit,
} from '../tikz/drawing';
import { parseIntoDrawing } from '../tikz/parse';
import { rotationTransform, shapeBounds, TikzSvg, type Bounds } from '../tikz/TikzSvg';
import { useTikzEditorStore } from './tikzEditorStore';

type Tool = 'select' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'path';

const TOOLS: Array<{ id: Tool; label: string; hint: string }> = [
  { id: 'select', label: 'Select', hint: 'Select and move shapes' },
  { id: 'line', label: 'Line', hint: 'Drag to draw a line' },
  { id: 'arrow', label: 'Arrow', hint: 'Drag to draw an arrow' },
  { id: 'rect', label: 'Rect', hint: 'Drag to draw a rectangle' },
  { id: 'ellipse', label: 'Ellipse', hint: 'Drag to draw an ellipse' },
  { id: 'text', label: 'Text', hint: 'Click to place a text label' },
  { id: 'path', label: 'Path', hint: 'Click points, press Enter to finish' },
];

const SWATCHES = [
  '#000000',
  '#ffffff',
  '#e03131',
  '#1c7ed6',
  '#2f9e44',
  '#f08c00',
  '#9c36b5',
  '#868e96',
];

type Corner = 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  mode: 'create' | 'move' | 'endpoint' | 'geometry';
  start: TikzPoint;
  tool?: Tool;
  shapeId?: string;
  snapshot?: TikzShape;
  /** Line or arrow end being dragged. */
  end?: 'start' | 'end';
  /** Rectangle or ellipse corner being dragged. */
  corner?: Corner;
  /** Path vertex index being dragged. */
  vertex?: number;
  /** Bounds of the shape when the drag started. */
  bounds?: Bounds;
  center?: TikzPoint;
  rotation?: number;
}

interface EditHandle {
  id: string;
  point: TikzPoint;
  end?: 'start' | 'end';
  corner?: Corner;
  vertex?: number;
}

interface CodeStatus {
  tone: 'idle' | 'ok' | 'warn';
  message: string;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function snap(value: number): number {
  return Math.round(value * 2) / 2;
}

function kindLabel(kind: TikzShape['kind']): string {
  const labels: Record<TikzShape['kind'], string> = {
    line: 'Line',
    arrow: 'Arrow',
    rect: 'Rectangle',
    ellipse: 'Ellipse',
    text: 'Text',
    path: 'Path',
  };
  return labels[kind];
}

function moveShape(shape: TikzShape, dx: number, dy: number): TikzShape {
  const next: TikzShape = { ...shape, x: snap(shape.x + dx), y: snap(shape.y + dy) };
  if (shape.x2 !== undefined && shape.y2 !== undefined) {
    next.x2 = snap(shape.x2 + dx);
    next.y2 = snap(shape.y2 + dy);
  }
  if (shape.points) {
    next.points = shape.points.map((point) => ({ x: snap(point.x + dx), y: snap(point.y + dy) }));
  }
  return next;
}

function clampPoint(point: TikzPoint, drawing: TikzDrawing): TikzPoint {
  return {
    x: snap(clamp(point.x, 0, drawing.width)),
    y: snap(clamp(point.y, 0, drawing.height)),
  };
}

function rotateAround(point: TikzPoint, center: TikzPoint, degrees: number): TikzPoint {
  if (!degrees) return point;
  const radians = (degrees * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

/** Draggable geometry handles for the selected shape. */
function selectionHandles(shape: TikzShape): EditHandle[] {
  if (shape.kind === 'text') return [];
  if (shape.kind === 'line' || shape.kind === 'arrow') {
    return [
      { id: 'start', point: { x: shape.x, y: shape.y }, end: 'start' },
      {
        id: 'end',
        point: { x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y },
        end: 'end',
      },
    ];
  }
  if (shape.kind === 'path' && shape.points) {
    return shape.points.map((point, index) => ({
      id: `v${index}`,
      point: { x: point.x, y: point.y },
      vertex: index,
    }));
  }
  const bounds = shapeBounds(shape);
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;
  return [
    { id: 'nw', point: { x: bounds.x, y: bounds.y }, corner: 'nw' },
    { id: 'ne', point: { x: right, y: bounds.y }, corner: 'ne' },
    { id: 'sw', point: { x: bounds.x, y: bottom }, corner: 'sw' },
    { id: 'se', point: { x: right, y: bottom }, corner: 'se' },
  ];
}

/** Resize a rectangle or ellipse by one corner, keeping the opposite corner fixed. */
function resizeCorner(
  shape: TikzShape,
  bounds: Bounds,
  corner: Corner,
  point: TikzPoint,
): TikzShape {
  let minX = bounds.x;
  let maxX = bounds.x + bounds.width;
  let minY = bounds.y;
  let maxY = bounds.y + bounds.height;
  const gap = 0.5;
  if (corner === 'nw') {
    minX = Math.min(point.x, maxX - gap);
    minY = Math.min(point.y, maxY - gap);
  } else if (corner === 'ne') {
    maxX = Math.max(point.x, minX + gap);
    minY = Math.min(point.y, maxY - gap);
  } else if (corner === 'sw') {
    minX = Math.min(point.x, maxX - gap);
    maxY = Math.max(point.y, minY + gap);
  } else {
    maxX = Math.max(point.x, minX + gap);
    maxY = Math.max(point.y, minY + gap);
  }
  const flipX = shape.x > (shape.x2 ?? shape.x);
  const flipY = shape.y > (shape.y2 ?? shape.y);
  return {
    ...shape,
    x: flipX ? maxX : minX,
    y: flipY ? maxY : minY,
    x2: flipX ? minX : maxX,
    y2: flipY ? minY : maxY,
  };
}

function moveVertex(shape: TikzShape, index: number, point: TikzPoint): TikzShape {
  if (!shape.points || index < 0 || index >= shape.points.length) return shape;
  const points = shape.points.map((current, position) => (position === index ? point : current));
  return { ...shape, points, x: points[0].x, y: points[0].y };
}

export function TikzEditor({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial: TikzDrawing;
  onClose: () => void;
  onSave: (drawing: TikzDrawing) => void;
}) {
  const [drawing, setDrawingState] = useState<TikzDrawing>(() => cloneDrawing(initial));
  const drawingRef = useRef(drawing);
  const [code, setCode] = useState(() => initial.code ?? generateTikzCode(initial));
  const [codeDirty, setCodeDirty] = useState(false);
  const [codeStatus, setCodeStatus] = useState<CodeStatus>({
    tone: 'idle',
    message: 'Canvas and code stay in sync when you draw.',
  });
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<TikzPoint[]>([]);
  const [creating, setCreating] = useState<TikzShape | null>(null);
  const [magnetOn, setMagnetOn] = useState(true);
  const [magnetHit, setMagnetHit] = useState<MagnetHit | null>(null);
  const creatingRef = useRef<TikzShape | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const setDraft = (next: TikzDrawing, syncCode = true) => {
    drawingRef.current = next;
    setDrawingState(next);
    if (syncCode) {
      setCode(generateTikzCode(next));
      setCodeDirty(false);
    }
  };

  const setCreatingShape = (shape: TikzShape | null) => {
    creatingRef.current = shape;
    setCreating(shape);
  };

  const selected = drawing.shapes.find((shape) => shape.id === selectedId) ?? null;

  const preview = useMemo(() => {
    const shapes = [...drawing.shapes];
    if (creating) shapes.push(creating);
    if (pending.length >= 2) {
      shapes.push({
        id: 'pending-path',
        kind: 'path',
        x: pending[0].x,
        y: pending[0].y,
        points: pending,
        dashed: true,
        stroke: '#6ea8fe',
        strokeWidth: 0.3,
      });
    }
    return { ...drawing, shapes };
  }, [drawing, creating, pending]);

  const magnetAnchors = useMemo(() => {
    if (!magnetOn || (tool !== 'line' && tool !== 'arrow' && tool !== 'path')) return [];
    const anchors: TikzPoint[] = [];
    for (const shape of drawing.shapes) {
      for (const anchor of shapeAnchors(shape)) {
        anchors.push(anchor);
        if (anchors.length >= 400) return anchors;
      }
    }
    return anchors;
  }, [drawing.shapes, magnetOn, tool]);

  const pointFromEvent = (event: { clientX: number; clientY: number }): TikzPoint => {
    const shell = shellRef.current;
    if (!shell) return { x: 0, y: 0 };
    const rect = shell.getBoundingClientRect();
    const current = drawingRef.current;
    return clampPoint(
      {
        x: ((event.clientX - rect.left) / rect.width) * current.width,
        y: ((event.clientY - rect.top) / rect.height) * current.height,
      },
      current,
    );
  };

  const publishMagnet = (hit: MagnetHit | null) => {
    setMagnetHit((previous) => {
      if (!previous && !hit) return previous;
      if (
        previous &&
        hit &&
        previous.shapeId === hit.shapeId &&
        previous.point.x === hit.point.x &&
        previous.point.y === hit.point.y
      ) {
        return previous;
      }
      return hit;
    });
  };

  /** Magnetise to nearby shape anchors, otherwise fall back to the 0.5 mm grid. */
  const resolveRawPoint = (
    raw: TikzPoint,
    excludeId?: string,
  ): { point: TikzPoint; hit: MagnetHit | null } => {
    const current = drawingRef.current;
    if (magnetOn) {
      const hit = magnetPoint(raw, current.shapes, 2.5, excludeId);
      if (hit) return { point: hit.point, hit };
    }
    return { point: clampPoint(raw, current), hit: null };
  };

  const resolvePoint = (
    event: { clientX: number; clientY: number },
    excludeId?: string,
  ): { point: TikzPoint; hit: MagnetHit | null } => {
    const shell = shellRef.current;
    if (!shell) return { point: { x: 0, y: 0 }, hit: null };
    const rect = shell.getBoundingClientRect();
    const current = drawingRef.current;
    const raw = {
      x: clamp(((event.clientX - rect.left) / rect.width) * current.width, 0, current.width),
      y: clamp(((event.clientY - rect.top) / rect.height) * current.height, 0, current.height),
    };
    return resolveRawPoint(raw, excludeId);
  };

  const commitShapes = (shapes: TikzShape[]) => {
    setDraft({ ...drawingRef.current, code: undefined, shapes });
  };

  const patchSelected = (patch: Partial<TikzShape>) => {
    if (!selectedId) return;
    const current = drawingRef.current;
    const before = current.shapes.find((shape) => shape.id === selectedId);
    if (!before) return;
    const after = { ...before, ...patch };
    const shapes = current.shapes.map((shape) => (shape.id === selectedId ? after : shape));
    setDraft({ ...current, code: undefined, shapes: followMovedShape(shapes, before, after) });
  };

  const addText = (point: TikzPoint) => {
    const shape: TikzShape = {
      id: uid('shape'),
      kind: 'text',
      x: point.x,
      y: point.y,
      text: 'Text',
      fontSize: DEFAULT_FONT_SIZE,
    };
    commitShapes([...drawingRef.current.shapes, shape]);
    setSelectedId(shape.id);
    setTool('select');
  };

  const finishPath = () => {
    const cleaned = pending.filter(
      (point, index) =>
        index === 0 || Math.hypot(point.x - pending[index - 1].x, point.y - pending[index - 1].y) > 0.01,
    );
    setPending([]);
    if (cleaned.length < 2) return;
    const shape: TikzShape = {
      id: uid('shape'),
      kind: 'path',
      x: cleaned[0].x,
      y: cleaned[0].y,
      points: cleaned,
    };
    commitShapes([...drawingRef.current.shapes, shape]);
    setSelectedId(shape.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commitShapes(drawingRef.current.shapes.filter((shape) => shape.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = moveShape({ ...selected, id: uid('shape') }, 2, 2);
    commitShapes([...drawingRef.current.shapes, copy]);
    setSelectedId(copy.id);
  };

  const moveLayer = (delta: -1 | 1) => {
    if (!selectedId) return;
    const shapes = drawingRef.current.shapes.slice();
    const index = shapes.findIndex((shape) => shape.id === selectedId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= shapes.length) return;
    [shapes[index], shapes[target]] = [shapes[target], shapes[index]];
    commitShapes(shapes);
  };

  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const point = pointFromEvent(event);
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    if (tool === 'text') {
      addText(point);
      return;
    }
    if (tool === 'path') {
      const resolved = resolvePoint(event);
      publishMagnet(resolved.hit);
      setPending((current) => [...current, resolved.point]);
      return;
    }
    const resolved = resolvePoint(event);
    publishMagnet(resolved.hit);
    const shape: TikzShape = {
      id: uid('shape'),
      kind: tool,
      x: resolved.point.x,
      y: resolved.point.y,
      x2: resolved.point.x,
      y2: resolved.point.y,
    };
    setCreatingShape(shape);
    dragRef.current = { mode: 'create', start: resolved.point, tool };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      if (magnetOn && (tool === 'path' || tool === 'line' || tool === 'arrow')) {
        publishMagnet(resolvePoint(event).hit);
      }
      return;
    }
    if (drag.mode === 'endpoint') {
      const snapshot = drag.snapshot;
      if (!snapshot || !drag.shapeId) return;
      const raw = pointFromEvent(event);
      const local = drag.center ? rotateAround(raw, drag.center, -(drag.rotation ?? 0)) : raw;
      const resolved = drag.rotation
        ? { point: clampPoint(local, drawingRef.current), hit: null }
        : resolveRawPoint(local, drag.shapeId);
      publishMagnet(resolved.hit);
      const next: TikzShape =
        drag.end === 'start'
          ? { ...snapshot, x: resolved.point.x, y: resolved.point.y }
          : { ...snapshot, x2: resolved.point.x, y2: resolved.point.y };
      const current = drawingRef.current;
      const previous = current.shapes.find((shape) => shape.id === drag.shapeId) ?? snapshot;
      const shapes = current.shapes.map((shape) => (shape.id === drag.shapeId ? next : shape));
      setDraft(
        { ...current, code: undefined, shapes: followMovedShape(shapes, previous, next) },
        false,
      );
      return;
    }
    if (drag.mode === 'geometry') {
      const snapshot = drag.snapshot;
      if (!snapshot || !drag.shapeId) return;
      const raw = pointFromEvent(event);
      const local = drag.center ? rotateAround(raw, drag.center, -(drag.rotation ?? 0)) : raw;
      const resolved = drag.rotation
        ? { point: clampPoint(local, drawingRef.current), hit: null }
        : resolveRawPoint(local, drag.shapeId);
      publishMagnet(resolved.hit);
      let next: TikzShape | null = null;
      if (drag.corner && drag.bounds) {
        next = resizeCorner(snapshot, drag.bounds, drag.corner, resolved.point);
      } else if (drag.vertex !== undefined) {
        next = moveVertex(snapshot, drag.vertex, resolved.point);
      }
      if (!next) return;
      const current = drawingRef.current;
      const previous = current.shapes.find((shape) => shape.id === drag.shapeId) ?? snapshot;
      const shapes = current.shapes.map((shape) => (shape.id === drag.shapeId ? next : shape));
      setDraft(
        { ...current, code: undefined, shapes: followMovedShape(shapes, previous, next) },
        false,
      );
      return;
    }
    if (drag.mode === 'create') {
      const shape = creatingRef.current;
      if (!shape) return;
      const resolved = resolvePoint(event);
      publishMagnet(resolved.hit);
      setCreatingShape({ ...shape, x2: resolved.point.x, y2: resolved.point.y });
      return;
    }
    if (!drag.snapshot) return;
    const point = pointFromEvent(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    const current = drawingRef.current;
    const previous = current.shapes.find((shape) => shape.id === drag.shapeId) ?? drag.snapshot;
    const moved = moveShape(drag.snapshot, dx, dy);
    const shapes = current.shapes.map((shape) =>
      shape.id === drag.shapeId ? moved : shape,
    );
    setDraft(
      {
        ...current,
        code: undefined,
        shapes: followMovedShape(shapes, previous, moved),
      },
      false,
    );
  };

  const onCanvasPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    publishMagnet(null);
    if (drag?.mode === 'create') {
      const shape = creatingRef.current;
      setCreatingShape(null);
      if (shape) {
        const width = Math.abs((shape.x2 ?? shape.x) - shape.x);
        const height = Math.abs((shape.y2 ?? shape.y) - shape.y);
        const tiny = width < 0.5 && height < 0.5;
        if (!tiny && shape.kind !== 'rect' && shape.kind !== 'ellipse') {
          commitShapes([...drawingRef.current.shapes, shape]);
          setSelectedId(shape.id);
        } else if (shape.kind === 'rect' || shape.kind === 'ellipse') {
          const sized = tiny
            ? { ...shape, x2: shape.x + 20, y2: shape.y + 12 }
            : shape;
          commitShapes([...drawingRef.current.shapes, sized]);
          setSelectedId(sized.id);
        }
      }
    } else if (
      drag?.mode === 'move' ||
      drag?.mode === 'endpoint' ||
      drag?.mode === 'geometry'
    ) {
      setCode(generateTikzCode(drawingRef.current));
      setCodeDirty(false);
      setCodeStatus({ tone: 'idle', message: 'Canvas updated. Code regenerated.' });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onShapePointerDown = (shape: TikzShape, event: ReactPointerEvent<SVGElement>) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    setSelectedId(shape.id);
    dragRef.current = {
      mode: 'move',
      start: pointFromEvent(event),
      shapeId: shape.id,
      snapshot: { ...shape },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerDown = (handle: EditHandle, event: ReactPointerEvent<SVGElement>) => {
    if (tool !== 'select' || !selected) return;
    event.stopPropagation();
    setSelectedId(selected.id);
    const bounds = shapeBounds(selected);
    dragRef.current = {
      mode: handle.end ? 'endpoint' : 'geometry',
      start: pointFromEvent(event),
      shapeId: selected.id,
      snapshot: { ...selected },
      end: handle.end,
      corner: handle.corner,
      vertex: handle.vertex,
      bounds: handle.corner ? bounds : undefined,
      center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      rotation: selected.rotation ?? 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const applyCode = () => {
    const parsed = parseIntoDrawing(code, {
      width: drawingRef.current.width,
      height: drawingRef.current.height,
    });
    const next: TikzDrawing = {
      width: parsed.width,
      height: parsed.height,
      shapes: parsed.shapes,
      code: code.trim() ? code : undefined,
    };
    drawingRef.current = next;
    setDrawingState(next);
    setCodeDirty(false);
    setSelectedId(null);
    setCodeStatus(
      parsed.unsupported > 0
        ? {
            tone: 'warn',
            message: `Applied with ${parsed.unsupported} statement(s) the canvas cannot preview. Your code is kept verbatim in the export.`,
          }
        : { tone: 'ok', message: `Applied ${parsed.shapes.length} parsed shape(s).` },
    );
  };

  const regenerate = () => {
    const next = { ...drawingRef.current, code: undefined };
    drawingRef.current = next;
    setDrawingState(next);
    setCode(generateTikzCode(next));
    setCodeDirty(false);
    setCodeStatus({ tone: 'ok', message: 'Code regenerated from the canvas.' });
  };

  const done = () => {
    let final = drawingRef.current;
    if (codeDirty) {
      const parsed = parseIntoDrawing(code, final);
      final = {
        width: parsed.width,
        height: parsed.height,
        shapes: parsed.shapes,
        code: code.trim() ? code : undefined,
      };
    }
    onSave(cloneDrawing(final));
    onClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable === true;
      if (typing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (pending.length > 0) {
          setPending([]);
          return;
        }
        onClose();
        return;
      }
      if (event.key === 'Enter' && tool === 'path') {
        event.preventDefault();
        finishPath();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selectedBounds = selected ? shapeBounds(selected) : null;
  const canvasSize = `Canvas · ${drawing.width}×${drawing.height}mm · ${drawing.shapes.length} shape${
    drawing.shapes.length === 1 ? '' : 's'
  }`;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal tikz-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            <p className="muted small">
              Draw on the canvas or type TikZ below. Canvas coordinates are millimetres with y
              pointing down; the generated code flips y to point up.
            </p>
          </div>
          <button type="button" className="icon-btn close-btn" onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        </header>

        <div className="tikz-workspace">
          <div className="tikz-canvas-col">
            <div className="tikz-toolbar">
              {TOOLS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  title={entry.hint}
                  className={`btn btn-tiny${tool === entry.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setTool(entry.id);
                    setPending([]);
                    publishMagnet(null);
                  }}
                >
                  {entry.label}
                </button>
              ))}
              <button
                type="button"
                title="Snap line, arrow and path points to shape corners, edges and centres"
                className={`btn btn-tiny${magnetOn ? ' is-active' : ''}`}
                onClick={() => {
                  setMagnetOn((value) => !value);
                  publishMagnet(null);
                }}
              >
                Magnet
              </button>
              <span className="tikz-spacer" />
              <label className="tikz-size">
                W
                <input
                  type="number"
                  min={10}
                  max={400}
                  step={1}
                  value={drawing.width}
                  onChange={(event) =>
                    setDraft({
                      ...drawingRef.current,
                      code: undefined,
                      width: clamp(Number(event.target.value) || 10, 10, 400),
                    })
                  }
                />
              </label>
              <label className="tikz-size">
                H
                <input
                  type="number"
                  min={10}
                  max={400}
                  step={1}
                  value={drawing.height}
                  onChange={(event) =>
                    setDraft({
                      ...drawingRef.current,
                      code: undefined,
                      height: clamp(Number(event.target.value) || 10, 10, 400),
                    })
                  }
                />
              </label>
            </div>
            <p className="panel-hint tikz-tool-hint">
              {tool === 'path'
                ? 'Click to add points, press Enter to finish, Esc to cancel. Points magnetise to shape anchors.'
                : tool === 'text'
                  ? 'Click on the canvas to place a label, then edit it on the right.'
                  : tool === 'select'
                    ? 'Click a shape to select it; drag to move. Handles reshape lines, arrows, rectangles, ellipses and paths. Connectors sitting on a moved anchor stay attached. Delete removes the shape.'
                    : `Drag on the canvas to draw. ${magnetOn ? 'Endpoints magnetise to shape corners, edges and centres; ' : ''}snaps to 0.5 mm.`}
            </p>
            <div className="tikz-canvas-frame">
              <div
                ref={shellRef}
                className={`tikz-canvas-shell tool-${tool}`}
                style={{ aspectRatio: `${drawing.width} / ${drawing.height}` }}
                onPointerDown={onCanvasPointerDown}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                onPointerCancel={onCanvasPointerUp}
                onPointerLeave={() => publishMagnet(null)}
                onDoubleClick={() => {
                  if (tool === 'path') finishPath();
                }}
              >
                <TikzSvg
                  drawing={preview}
                  grid
                  pointerEvents="auto"
                  onShapePointerDown={onShapePointerDown}
                />
                <svg
                  className="tikz-overlay"
                  viewBox={`0 0 ${drawing.width} ${drawing.height}`}
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  {selectedBounds ? (
                    <rect
                      x={selectedBounds.x - 0.6}
                      y={selectedBounds.y - 0.6}
                      width={selectedBounds.width + 1.2}
                      height={selectedBounds.height + 1.2}
                      fill="none"
                      stroke="#6ea8fe"
                      strokeWidth={0.35}
                      strokeDasharray="1.4 1"
                    />
                  ) : null}
                  {magnetAnchors.map((anchor, index) => (
                    <circle
                      key={`anchor-${index}`}
                      cx={anchor.x}
                      cy={anchor.y}
                      r={0.32}
                      fill="#6ea8fe"
                      opacity={0.55}
                    />
                  ))}
                  {magnetHit ? (
                    <g>
                      <circle
                        cx={magnetHit.point.x}
                        cy={magnetHit.point.y}
                        r={1.25}
                        fill="none"
                        stroke="#f08c00"
                        strokeWidth={0.4}
                      />
                      <circle
                        cx={magnetHit.point.x}
                        cy={magnetHit.point.y}
                        r={0.35}
                        fill="#f08c00"
                      />
                    </g>
                  ) : null}
                  {pending.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={0.9}
                      fill="#6ea8fe"
                      stroke="#0a0c11"
                      strokeWidth={0.25}
                    />
                  ))}
                  {selected ? (
                    <g transform={rotationTransform(selected)}>
                      {selectionHandles(selected).map((handle) => (
                        <g key={handle.id}>
                          <circle
                            cx={handle.point.x}
                            cy={handle.point.y}
                            r={2}
                            fill="transparent"
                            style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                            onPointerDown={(event) => onHandlePointerDown(handle, event)}
                          />
                          <circle
                            cx={handle.point.x}
                            cy={handle.point.y}
                            r={0.75}
                            fill="#f8f9fa"
                            stroke="#6ea8fe"
                            strokeWidth={0.35}
                            style={{ pointerEvents: 'none' }}
                          />
                        </g>
                      ))}
                    </g>
                  ) : null}
                </svg>
              </div>
            </div>
          </div>

          <div className="tikz-props">
            <div className="tikz-prop-head">
              <h3>{selected ? kindLabel(selected.kind) : 'Shape'}</h3>
              {selected ? (
                <button type="button" className="icon-btn icon-btn-danger" title="Delete shape" onClick={deleteSelected}>
                  &#10005;
                </button>
              ) : null}
            </div>
            {selected ? (
              <>
                {selected.kind === 'text' ? (
                  <>
                    <Field label="Text (LaTeX and $math$ allowed)">
                      <textarea
                        rows={3}
                        value={selected.text ?? ''}
                        spellCheck={false}
                        onChange={(event) => patchSelected({ text: event.target.value })}
                      />
                    </Field>
                    <Field label={`Font size · ${selected.fontSize ?? DEFAULT_FONT_SIZE} mm`}>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={0.5}
                        value={selected.fontSize ?? DEFAULT_FONT_SIZE}
                        onChange={(event) => patchSelected({ fontSize: Number(event.target.value) })}
                      />
                    </Field>
                    <Field label={`Text opacity · ${selected.textOpacity ?? 100}%`}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={selected.textOpacity ?? 100}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          patchSelected({ textOpacity: value < 100 ? value : undefined });
                        }}
                      />
                    </Field>
                  </>
                ) : null}

                {selected.kind !== 'text' && isLabelHost(selected) ? (
                  <>
                    <Field label="Text inside the shape">
                      <textarea
                        rows={2}
                        value={selected.text ?? ''}
                        spellCheck={false}
                        placeholder="Centered label; LaTeX and $math$ allowed"
                        onChange={(event) => patchSelected({ text: event.target.value })}
                      />
                    </Field>
                    {selected.text?.trim() ? (
                      <>
                        <Field
                          label={`Label size · ${selected.fontSize ?? DEFAULT_FONT_SIZE} mm`}
                        >
                          <input
                            type="range"
                            min={0.5}
                            max={20}
                            step={0.5}
                            value={selected.fontSize ?? DEFAULT_FONT_SIZE}
                            onChange={(event) =>
                              patchSelected({ fontSize: Number(event.target.value) })
                            }
                          />
                        </Field>
                        <Field label="Label colour">
                          <div className="tikz-color-row">
                            <input
                              type="color"
                              value={selected.textColor ?? DEFAULT_STROKE}
                              onChange={(event) =>
                                patchSelected({ textColor: event.target.value })
                              }
                            />
                            <div className="tikz-swatches">
                              {SWATCHES.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className="tikz-swatch"
                                  style={{ background: color }}
                                  title={color}
                                  onClick={() => patchSelected({ textColor: color })}
                                />
                              ))}
                            </div>
                          </div>
                        </Field>
                        <Field label={`Label opacity · ${selected.textOpacity ?? 100}%`}>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={selected.textOpacity ?? 100}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              patchSelected({ textOpacity: value < 100 ? value : undefined });
                            }}
                          />
                        </Field>
                      </>
                    ) : null}
                  </>
                ) : null}

                {selected.kind === 'line' || selected.kind === 'arrow' ? (
                  <Field label="Type">
                    <select
                      value={selected.kind}
                      onChange={(event) =>
                        patchSelected({ kind: event.target.value as 'line' | 'arrow' })
                      }
                    >
                      <option value="line">Line</option>
                      <option value="arrow">Arrow</option>
                    </select>
                  </Field>
                ) : null}

                <Field label="Outline colour">
                  <div className="tikz-color-row">
                    <input
                      type="color"
                      value={selected.stroke && selected.stroke !== 'none' ? selected.stroke : DEFAULT_STROKE}
                      onChange={(event) => patchSelected({ stroke: event.target.value })}
                    />
                    <div className="tikz-swatches">
                      {SWATCHES.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="tikz-swatch"
                          style={{ background: color }}
                          title={color}
                          onClick={() => patchSelected({ stroke: color })}
                        />
                      ))}
                    </div>
                  </div>
                </Field>

                {selected.kind !== 'text' ? (
                  <Field label={`Outline opacity · ${selected.strokeOpacity ?? 100}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={selected.strokeOpacity ?? 100}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        patchSelected({ strokeOpacity: value < 100 ? value : undefined });
                      }}
                    />
                  </Field>
                ) : null}

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(selected.fill)}
                    onChange={(event) =>
                      patchSelected({ fill: event.target.checked ? '#e9ecef' : undefined })
                    }
                  />
                  Filled
                </label>
                {selected.fill ? (
                  <Field label="Fill colour">
                    <div className="tikz-color-row">
                      <input
                        type="color"
                        value={selected.fill}
                        onChange={(event) => patchSelected({ fill: event.target.value })}
                      />
                      <div className="tikz-swatches">
                        {SWATCHES.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="tikz-swatch"
                            style={{ background: color }}
                            title={color}
                            onClick={() => patchSelected({ fill: color })}
                          />
                        ))}
                      </div>
                    </div>
                  </Field>
                ) : null}

                {selected.fill && selected.kind !== 'text' ? (
                  <Field label={`Fill opacity · ${selected.fillOpacity ?? 100}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={selected.fillOpacity ?? 100}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        patchSelected({ fillOpacity: value < 100 ? value : undefined });
                      }}
                    />
                  </Field>
                ) : null}

                <Field label={`Line width · ${(selected.strokeWidth ?? DEFAULT_STROKE_WIDTH).toFixed(1)} mm`}>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={selected.strokeWidth ?? DEFAULT_STROKE_WIDTH}
                    onChange={(event) => patchSelected({ strokeWidth: Number(event.target.value) })}
                  />
                </Field>
                {selected.kind === 'rect' ? (
                  <Field label={`Corner radius · ${(selected.cornerRadius ?? 0).toFixed(1)} mm`}>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={selected.cornerRadius ?? 0}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        patchSelected({ cornerRadius: value > 0 ? value : undefined });
                      }}
                    />
                  </Field>
                ) : null}
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={selected.dashed ?? false}
                    onChange={(event) => patchSelected({ dashed: event.target.checked })}
                  />
                  Dashed
                </label>
                {selected.kind === 'path' ? (
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selected.closed ?? false}
                      onChange={(event) => patchSelected({ closed: event.target.checked })}
                    />
                    Close the path
                  </label>
                ) : null}
                <Field label={`Rotation · ${selected.rotation ?? 0}°`}>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={selected.rotation ?? 0}
                    onChange={(event) =>
                      patchSelected({
                        rotation: Number(event.target.value) || undefined,
                      })
                    }
                  />
                </Field>

                <div className="tikz-coords">
                  <label>
                    X
                    <input
                      type="number"
                      step={0.5}
                      value={selected.x}
                      onChange={(event) => patchSelected({ x: Number(event.target.value) || 0 })}
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      step={0.5}
                      value={selected.y}
                      onChange={(event) => patchSelected({ y: Number(event.target.value) || 0 })}
                    />
                  </label>
                  {selected.kind !== 'text' && selected.kind !== 'path' ? (
                    <>
                      <label>
                        W
                        <input
                          type="number"
                          step={0.5}
                          value={Math.abs((selected.x2 ?? selected.x) - selected.x)}
                          onChange={(event) =>
                            patchSelected({
                              x2: selected.x + (Number(event.target.value) || 0),
                            })
                          }
                        />
                      </label>
                      <label>
                        H
                        <input
                          type="number"
                          step={0.5}
                          value={Math.abs((selected.y2 ?? selected.y) - selected.y)}
                          onChange={(event) =>
                            patchSelected({
                              y2: selected.y + (Number(event.target.value) || 0),
                            })
                          }
                        />
                      </label>
                    </>
                  ) : null}
                </div>

                <div className="button-row">
                  <button type="button" className="btn btn-tiny" onClick={() => moveLayer(-1)}>
                    Send back
                  </button>
                  <button type="button" className="btn btn-tiny" onClick={() => moveLayer(1)}>
                    Bring front
                  </button>
                  <button type="button" className="btn btn-tiny" onClick={duplicateSelected}>
                    Duplicate
                  </button>
                </div>
              </>
            ) : (
              <p className="muted small">
                Pick a tool and draw. Select a shape to change its colours, width and position.
              </p>
            )}
          </div>

          <div className="tikz-code-col">
            <div className="tikz-code-head">
              <h3>TikZ code</h3>
              {codeDirty ? <span className="tikz-code-dirty">edited</span> : null}
            </div>
            <textarea
              className="tikz-code"
              spellCheck={false}
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setCodeDirty(true);
                setCodeStatus({ tone: 'idle', message: 'Edited — apply the code or press Done.' });
              }}
            />
            <div className="button-row">
              <button type="button" className="btn btn-tiny" onClick={applyCode}>
                Apply code
              </button>
              <button type="button" className="btn btn-tiny" onClick={regenerate}>
                Regenerate
              </button>
            </div>
            <p className={`tikz-code-status tone-${codeStatus.tone}`}>{codeStatus.message}</p>
            <p className="muted small">
              Supported: draw/fill/path/node with <code>--</code>, <code>rectangle</code>,{' '}
              <code>circle</code>, <code>ellipse</code>, <code>plot coordinates</code>, colours,
              thick/thin, dashed, <code>rounded corners</code>, <code>opacity</code>, rotate and
              font sizes. Unsupported commands stay in the export but are not previewed.
            </p>
          </div>
        </div>

        <footer className="modal-foot tikz-foot">
          <span className="muted small">{canvasSize}</span>
          <div className="button-row">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={done}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function TikzEditorHost() {
  const request = useTikzEditorStore((state) => state.request);
  const close = useTikzEditorStore((state) => state.close);
  if (!request) return null;
  return (
    <TikzEditor
      key={request.id}
      title={request.title}
      initial={request.drawing}
      onClose={close}
      onSave={request.onSave}
    />
  );
}
