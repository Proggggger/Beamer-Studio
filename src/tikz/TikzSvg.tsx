import { useId, type PointerEvent } from 'react';
import type { TikzDrawing, TikzShape } from '../model/types';
import { DEFAULT_FONT_SIZE, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH, isLabelHost } from './drawing';
import { Inline } from '../render/inline';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function shapeBounds(shape: TikzShape): Bounds {
  if (shape.kind === 'path' && shape.points && shape.points.length > 0) {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }
  if (shape.kind === 'text') {
    const size = shape.fontSize ?? DEFAULT_FONT_SIZE;
    const width = Math.max(size, (shape.text ?? '').length * size * 0.62);
    return { x: shape.x - width / 2, y: shape.y - size * 0.7, width, height: size * 1.4 };
  }
  const x2 = shape.x2 ?? shape.x;
  const y2 = shape.y2 ?? shape.y;
  return {
    x: Math.min(shape.x, x2),
    y: Math.min(shape.y, y2),
    width: Math.abs(x2 - shape.x),
    height: Math.abs(y2 - shape.y),
  };
}

export function drawingBounds(drawing: TikzDrawing): Bounds {
  return { x: 0, y: 0, width: drawing.width, height: drawing.height };
}

function dashArray(shape: TikzShape, width: number): string | undefined {
  return shape.dashed ? `${Math.max(1, width * 3)} ${Math.max(1, width * 2.2)}` : undefined;
}

export function rotationTransform(shape: TikzShape): string | undefined {
  if (!shape.rotation) return undefined;
  const bounds = shapeBounds(shape);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return `rotate(${shape.rotation} ${cx} ${cy})`;
}

function TextShape({ shape, htmlId }: { shape: TikzShape; htmlId: string }) {
  const size = shape.fontSize ?? DEFAULT_FONT_SIZE;
  const bounds = shapeBounds(shape);
  const width = Math.max(bounds.width + size, size * 3);
  const height = size * 2;
  return (
    <foreignObject
      x={shape.x - width / 2}
      y={shape.y - height / 2}
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
      data-shape-id={shape.id}
    >
      <div
        id={htmlId}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: shape.stroke ?? DEFAULT_STROKE,
          opacity: (shape.textOpacity ?? 100) / 100,
          fontSize: `${size}px`,
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
          transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
        }}
      >
        <Inline text={shape.text ?? ''} />
      </div>
    </foreignObject>
  );
}

/** A label drawn inside a rectangle, ellipse or closed path. */
function ShapeLabel({
  shape,
  bounds,
  htmlId,
}: {
  shape: TikzShape;
  bounds: Bounds;
  htmlId: string;
}) {
  const size = shape.fontSize ?? DEFAULT_FONT_SIZE;
  return (
    <foreignObject
      x={bounds.x}
      y={bounds.y}
      width={Math.max(bounds.width, 1)}
      height={Math.max(bounds.height, 1)}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        id={htmlId}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: shape.textColor ?? DEFAULT_STROKE,
          opacity: (shape.textOpacity ?? 100) / 100,
          fontSize: `${size}px`,
          lineHeight: 1.15,
          whiteSpace: 'pre-wrap',
        }}
      >
        <Inline text={shape.text ?? ''} />
      </div>
    </foreignObject>
  );
}

interface ArrowStyle {
  color: string;
  opacity: number;
}

function arrowStyleKey(stroke: string, opacity: number): string {
  return `${stroke}|${opacity}`;
}

export function TikzSvg({
  drawing,
  className,
  stretch = false,
  grid = false,
  pointerEvents = 'none',
  onShapePointerDown,
}: {
  drawing: TikzDrawing;
  className?: string;
  /** Fill the viewport exactly (stretch) instead of preserving the drawing aspect. */
  stretch?: boolean;
  grid?: boolean;
  pointerEvents?: 'none' | 'auto';
  onShapePointerDown?: (shape: TikzShape, event: PointerEvent<SVGElement>) => void;
}) {
  const prefix = useId().replace(/[:]/g, '');
  const arrowStyles: ArrowStyle[] = [];
  const arrowIndexByKey = new Map<string, number>();
  for (const shape of drawing.shapes) {
    const arrow = shape.kind === 'arrow' || (shape.kind === 'path' && shape.arrow);
    if (!arrow) continue;
    const stroke = shape.stroke ?? DEFAULT_STROKE;
    if (stroke === 'none') continue;
    const opacity = shape.strokeOpacity ?? 100;
    const key = arrowStyleKey(stroke, opacity);
    if (!arrowIndexByKey.has(key)) {
      arrowIndexByKey.set(key, arrowStyles.length);
      arrowStyles.push({ color: stroke, opacity });
    }
  }
  const handler = (shape: TikzShape) =>
    onShapePointerDown
      ? (event: PointerEvent<SVGElement>) => onShapePointerDown(shape, event)
      : undefined;

  return (
    <svg
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      preserveAspectRatio={stretch ? 'none' : 'xMidYMid meet'}
      className={className}
      width="100%"
      height="100%"
      style={{ display: 'block', pointerEvents, overflow: 'visible' }}
    >
      <defs>
        {arrowStyles.map((style, index) => (
          <marker
            key={`${style.color}-${style.opacity}`}
            id={`${prefix}-arrow-${index}`}
            markerWidth="5"
            markerHeight="5"
            refX="4.6"
            refY="2.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0.3 L5,2.5 L0,4.7 z"
              fill={style.color}
              fillOpacity={style.opacity / 100}
            />
          </marker>
        ))}
        {grid ? (
          <pattern id={`${prefix}-grid`} width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#2c3444" strokeWidth="0.18" />
          </pattern>
        ) : null}
      </defs>
      {grid ? (
        <rect x={0} y={0} width={drawing.width} height={drawing.height} fill={`url(#${prefix}-grid)`} />
      ) : null}
      {drawing.shapes.map((shape) => {
        const stroke = shape.stroke ?? DEFAULT_STROKE;
        const width = shape.strokeWidth ?? DEFAULT_STROKE_WIDTH;
        const common = {
          stroke: stroke === 'none' ? 'none' : stroke,
          strokeWidth: width,
          strokeOpacity: (shape.strokeOpacity ?? 100) / 100,
          fill: shape.fill ?? 'none',
          fillOpacity: (shape.fillOpacity ?? 100) / 100,
          strokeDasharray: dashArray(shape, width),
          'data-shape-id': shape.id,
        };
        const arrowIndex = arrowIndexByKey.get(
          arrowStyleKey(stroke, shape.strokeOpacity ?? 100),
        );
        const markerRef =
          arrowIndex !== undefined ? `url(#${prefix}-arrow-${arrowIndex})` : undefined;
        if (shape.kind === 'text') {
          return (
            <g key={shape.id} onPointerDown={handler(shape)}>
              <TextShape shape={shape} htmlId={`${prefix}-text-${shape.id}`} />
            </g>
          );
        }
        if (shape.kind === 'line' || shape.kind === 'arrow') {
          const x1 = shape.x;
          const y1 = shape.y;
          const x2 = shape.x2 ?? shape.x;
          const y2 = shape.y2 ?? shape.y;
          return (
            <g key={shape.id} transform={rotationTransform(shape)} onPointerDown={handler(shape)}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={Math.max(width + 2.5, 3.5)}
                fill="none"
                pointerEvents="stroke"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                {...common}
                markerEnd={shape.kind === 'arrow' ? markerRef : undefined}
              />
            </g>
          );
        }
        const bounds = shapeBounds(shape);
        const label =
          isLabelHost(shape) && shape.text?.trim() ? (
            <ShapeLabel shape={shape} bounds={bounds} htmlId={`${prefix}-label-${shape.id}`} />
          ) : null;
        if (shape.kind === 'rect' || shape.kind === 'ellipse') {
          return (
            <g
              key={shape.id}
              transform={rotationTransform(shape)}
              onPointerDown={handler(shape)}
            >
              {shape.kind === 'rect' ? (
                <rect
                  x={bounds.x}
                  y={bounds.y}
                  width={bounds.width}
                  height={bounds.height}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={Math.max(width + 2.5, 3.5)}
                  pointerEvents="all"
                />
              ) : (
                <ellipse
                  cx={bounds.x + bounds.width / 2}
                  cy={bounds.y + bounds.height / 2}
                  rx={bounds.width / 2}
                  ry={bounds.height / 2}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={Math.max(width + 2.5, 3.5)}
                  pointerEvents="all"
                />
              )}
              {shape.kind === 'rect' ? (
                <rect
                  x={bounds.x}
                  y={bounds.y}
                  width={bounds.width}
                  height={bounds.height}
                  rx={shape.cornerRadius || undefined}
                  ry={shape.cornerRadius || undefined}
                  {...common}
                />
              ) : (
                <ellipse
                  cx={bounds.x + bounds.width / 2}
                  cy={bounds.y + bounds.height / 2}
                  rx={bounds.width / 2}
                  ry={bounds.height / 2}
                  {...common}
                />
              )}
              {label}
            </g>
          );
        }
        const points = shape.points ?? [];
        if (points.length < 2) return null;
        const pointList = points.map((point) => `${point.x},${point.y}`).join(' ');
        const Tag = shape.closed ? 'polygon' : 'polyline';
        return (
          <g
            key={shape.id}
            transform={rotationTransform(shape)}
            onPointerDown={handler(shape)}
          >
            <Tag
              points={pointList}
              fill={shape.closed ? 'transparent' : 'none'}
              stroke="transparent"
              strokeWidth={Math.max(width + 2.5, 3.5)}
              pointerEvents={shape.closed ? 'all' : 'stroke'}
            />
            <Tag
              points={pointList}
              {...common}
              markerEnd={shape.arrow ? markerRef : undefined}
            />
            {label}
          </g>
        );
      })}
    </svg>
  );
}
