import { describe, expect, it } from 'vitest';
import { mixHex, resolveColorName } from './colors';
import { escapeLatexText, followMovedShape, generateTikzCode, magnetPoint, shapeAnchors } from './drawing';
import { parseTikz } from './parse';
import type { TikzDrawing } from '../model/types';

function drawing(shapes: TikzDrawing['shapes']): TikzDrawing {
  return { width: 80, height: 50, shapes };
}

describe('tikz colours', () => {
  it('resolves named and mixed xcolor expressions', () => {
    expect(resolveColorName('red')).toBe('#ff0000');
    expect(resolveColorName('blue!50')).toBe('#8080ff');
    expect(resolveColorName('green!40!black')).toBe('#006600');
    expect(resolveColorName('brand', { brand: '#123456' })).toBe('#123456');
    expect(resolveColorName('not-a-colour')).toBeNull();
  });

  it('mixes hex channels', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 100)).toBe('#000000');
  });
});

describe('tikz generator', () => {
  it('flips y and draws a line with a defined colour', () => {
    const code = generateTikzCode(drawing([{ id: 's', kind: 'line', x: 10, y: 10, x2: 30, y2: 20 }]));
    const lines = code.split('\n');
    expect(lines[0]).toBe('\\definecolor{bxtz0}{HTML}{000000}');
    expect(lines[1]).toBe('\\draw[draw=bxtz0] (10,40) -- (30,30);');
  });

  it('emits rectangle, ellipse, arrow and closed path commands', () => {
    const code = generateTikzCode(
      drawing([
        { id: 'r', kind: 'rect', x: 5, y: 5, x2: 25, y2: 15, fill: '#ff0000' },
        { id: 'e', kind: 'ellipse', x: 10, y: 10, x2: 30, y2: 20 },
        { id: 'a', kind: 'arrow', x: 0, y: 0, x2: 40, y2: 40 },
        {
          id: 'p',
          kind: 'path',
          x: 0,
          y: 0,
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 20, y: 0 },
          ],
          closed: true,
        },
      ]),
    );
    expect(code).toContain('\\filldraw[draw=bxtz0,fill=bxtz1] (5,45) rectangle (25,35);');
    expect(code).toContain('(20,35) ellipse [x radius=10mm, y radius=5mm];');
    expect(code).toContain('\\draw[draw=bxtz0,->] (0,50) -- (40,10);');
    expect(code).toContain('(0,50) -- (10,40) -- (20,50) -- cycle;');
  });

  it('writes text nodes with font size and negated rotation', () => {
    const code = generateTikzCode(
      drawing([
        {
          id: 't',
          kind: 'text',
          x: 20,
          y: 15,
          text: 'Hi',
          fontSize: 4,
          rotation: 30,
        },
      ]),
    );
    expect(code).toContain(
      '\\node[anchor=center,inner sep=0pt,text=bxtz0,rotate=-30,font=\\fontsize{11.4pt}{13.7pt}\\selectfont] at (20,35) {Hi};',
    );
  });

  it('escapes plain text but keeps maths and commands', () => {
    expect(escapeLatexText('50% & $x_1$ \\alpha')).toBe('50\\% \\& $x_1$ \\alpha');
  });

  it('emits rounded corners, opacities and a centred label node', () => {
    const code = generateTikzCode(
      drawing([
        {
          id: 'r',
          kind: 'rect',
          x: 10,
          y: 10,
          x2: 40,
          y2: 30,
          fill: '#ff0000',
          fillOpacity: 35,
          strokeOpacity: 50,
          cornerRadius: 2,
          text: 'Flow',
          fontSize: 3,
          textColor: '#ffffff',
          textOpacity: 60,
        },
      ]),
    );
    expect(code).toContain(
      '\\filldraw[draw=bxtz0,draw opacity=0.5,fill=bxtz1,fill opacity=0.35,rounded corners=2mm] (10,40) rectangle (40,20);',
    );
    expect(code).toContain(
      '\\node[anchor=center,inner sep=0pt,name=bxlabel0,text=bxtz2,text opacity=0.6,font=\\fontsize{8.5pt}{10.2pt}\\selectfont] at (25,30) {Flow};',
    );
  });

  it('attaches generated label nodes back to their host shape', () => {
    const source = drawing([
      {
        id: 'r',
        kind: 'rect',
        x: 10,
        y: 10,
        x2: 40,
        y2: 30,
        fill: '#ff0000',
        fillOpacity: 35,
        strokeOpacity: 50,
        cornerRadius: 2,
        text: 'Flow',
        fontSize: 3,
        textColor: '#ffffff',
        textOpacity: 60,
      },
    ]);
    const parsed = parseTikz(generateTikzCode(source), source);
    expect(parsed.unsupported).toBe(0);
    expect(parsed.shapes).toHaveLength(1);
    expect(parsed.shapes[0]).toMatchObject({
      kind: 'rect',
      cornerRadius: 2,
      strokeOpacity: 50,
      fillOpacity: 35,
      text: 'Flow',
      textColor: '#ffffff',
      textOpacity: 60,
    });
    expect(parsed.shapes[0].fontSize).toBeCloseTo(3, 1);
  });

  it('parses rounded corners and opacity written by hand', () => {
    const parsed = parseTikz(
      '\\draw[rounded corners=3mm,draw opacity=0.25,fill=blue,fill opacity=0.4] (0,0) rectangle (20,10);',
      { width: 80, height: 50 },
    );
    expect(parsed.shapes[0]).toMatchObject({
      kind: 'rect',
      cornerRadius: 3,
      strokeOpacity: 25,
      fillOpacity: 40,
      fill: '#0000ff',
    });
  });
});

describe('tikz magnets', () => {
  const rect = { id: 'r', kind: 'rect' as const, x: 10, y: 10, x2: 30, y2: 20 };

  it('offers corners, edge midpoints and the centre as anchors', () => {
    expect(shapeAnchors(rect)).toHaveLength(9);
  });

  it('snaps to the nearest anchor inside the threshold only', () => {
    const near = magnetPoint({ x: 30.6, y: 20.4 }, [rect]);
    expect(near?.point).toEqual({ x: 30, y: 20 });
    expect(near?.shapeId).toBe('r');
    expect(magnetPoint({ x: 45, y: 45 }, [rect])).toBeNull();
    expect(magnetPoint({ x: 30.6, y: 20.4 }, [rect], 2.5, 'r')).toBeNull();
  });
});

describe('tikz sticky connections', () => {
  const rect = { id: 'r', kind: 'rect' as const, x: 10, y: 10, x2: 30, y2: 20 };

  it('drags attached connector endpoints along when a shape moves', () => {
    const arrow = { id: 'a', kind: 'arrow' as const, x: 30, y: 20, x2: 50, y2: 40 };
    const loose = { id: 'l', kind: 'line' as const, x: 40, y: 5, x2: 50, y2: 5 };
    const moved = { ...rect, x: 15, y: 15, x2: 35, y2: 25 };
    const out = followMovedShape([rect, arrow, loose], rect, moved);
    expect(out[1]).toMatchObject({ x: 35, y: 25 });
    expect(out[2]).toMatchObject({ x: 40, y: 5, x2: 50, y2: 5 });
  });

  it('tracks the same anchor when the shape is resized', () => {
    const centred = { id: 'c', kind: 'arrow' as const, x: 20, y: 15, x2: 45, y2: 40 };
    const resized = { ...rect, x2: 40, y2: 30 };
    const out = followMovedShape([rect, centred], rect, resized);
    expect(out[1]).toMatchObject({ x: 25, y: 20 });
  });

  it('moves attached path vertices with the anchor', () => {
    const path = {
      id: 'p',
      kind: 'path' as const,
      x: 10,
      y: 10,
      points: [
        { x: 10, y: 10 },
        { x: 17, y: 10 },
        { x: 30, y: 20 },
      ],
    };
    const moved = { ...rect, x: 15, y: 15, x2: 35, y2: 25 };
    const out = followMovedShape([rect, path], rect, moved);
    expect(out[1].points).toEqual([
      { x: 15, y: 15 },
      { x: 17, y: 10 },
      { x: 35, y: 25 },
    ]);
    expect(out[1]).toMatchObject({ x: 15, y: 15 });
  });

  it('carries connectors attached to a moving line endpoint', () => {
    const line = { id: 'ln', kind: 'line' as const, x: 0, y: 0, x2: 10, y2: 10 };
    const conn = { id: 'c2', kind: 'arrow' as const, x: 10, y: 10, x2: 20, y2: 20 };
    const moved = { ...line, x: 5, y: 5, x2: 15, y2: 15 };
    const out = followMovedShape([line, conn], line, moved);
    expect(out[1]).toMatchObject({ x: 15, y: 15 });
  });
});

describe('tikz parser', () => {
  it('parses lines back into editor coordinates', () => {
    const parsed = parseTikz('\\draw (10,40) -- (30,30);', { width: 80, height: 50 });
    expect(parsed.unsupported).toBe(0);
    expect(parsed.shapes).toHaveLength(1);
    expect(parsed.shapes[0]).toMatchObject({
      kind: 'line',
      x: 10,
      y: 10,
      x2: 30,
      y2: 20,
    });
  });

  it('parses rectangles, circles, ellipses and plots', () => {
    const parsed = parseTikz(
      [
        '\\draw[fill=red] (1,1) rectangle (11,11);',
        '\\draw (20,20) circle (5);',
        '\\draw (30,30) ellipse [x radius=4mm, y radius=2mm];',
        '\\draw plot coordinates {(0,0) (5,5) (10,0)};',
      ].join('\n'),
      { width: 80, height: 50 },
    );
    expect(parsed.unsupported).toBe(0);
    expect(parsed.shapes.map((shape) => shape.kind)).toEqual([
      'rect',
      'ellipse',
      'ellipse',
      'path',
    ]);
    expect(parsed.shapes[0].fill).toBe('#ff0000');
    expect(parsed.shapes[1]).toMatchObject({ x: 15, x2: 25 });
    expect(parsed.shapes[3].points).toHaveLength(3);
  });

  it('parses node text and colours from definitions', () => {
    const parsed = parseTikz(
      [
        '\\definecolor{brand}{HTML}{336699}',
        '\\node[text=brand,font=\\fontsize{10pt}{12pt}\\selectfont] at (40,25) {Hello};',
      ].join('\n'),
      { width: 80, height: 50 },
    );
    expect(parsed.shapes).toHaveLength(1);
    expect(parsed.shapes[0]).toMatchObject({
      kind: 'text',
      text: 'Hello',
      stroke: '#336699',
      x: 40,
      y: 25,
    });
    expect(parsed.shapes[0].fontSize).toBeCloseTo(10 / 2.845276, 3);
  });

  it('counts unsupported statements', () => {
    const parsed = parseTikz(
      [
        '\\draw (0,0) .. controls (0.5,1) .. (1,0);',
        '\\draw[step=1mm] (0,0) grid (10,10);',
        '\\draw (0,0) -- (10,10);',
      ].join('\n'),
      { width: 80, height: 50 },
    );
    expect(parsed.unsupported).toBe(2);
    expect(parsed.shapes).toHaveLength(1);
  });

  it('grows the canvas when code exceeds its size', () => {
    const parsed = parseTikz('\\draw (0,0) rectangle (100,60);', { width: 80, height: 50 });
    expect(parsed.width).toBe(101);
    expect(parsed.height).toBe(61);
  });

  it('round-trips generated code', () => {
    const source = drawing([
      { id: 's', kind: 'line', x: 10, y: 10, x2: 30, y2: 20 },
      { id: 'r', kind: 'rect', x: 5, y: 5, x2: 25, y2: 15, fill: '#ff0000' },
      { id: 'e', kind: 'ellipse', x: 10, y: 10, x2: 30, y2: 20 },
      { id: 't', kind: 'text', x: 20, y: 15, text: 'Hi', fontSize: 4 },
    ]);
    const parsed = parseTikz(generateTikzCode(source), source);
    expect(parsed.unsupported).toBe(0);
    expect(parsed.shapes).toHaveLength(4);
    const line = parsed.shapes[0];
    expect(line.x).toBeCloseTo(10, 2);
    expect(line.y).toBeCloseTo(10, 2);
    expect(line.x2).toBeCloseTo(30, 2);
    expect(parsed.shapes[3]).toMatchObject({ kind: 'text', text: 'Hi', x: 20, y: 15 });
  });
});
