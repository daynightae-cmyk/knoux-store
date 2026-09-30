import * as THREE from 'three';

export const ATLAS_GRID = 4;
export const ATLAS_ROWS = 4;
const CELL = 128;

const ICON_PATHS = [
  'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
  'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z',
  'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z',
  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
  'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
  'M16 18l6-6-6-6M8 6l-6 6 6 6',
  'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z',
  'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2',
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'M22 12h-4l-3 9L9 3l-3 9H2',
] as const;

export type IconAtlas = {
  texture: THREE.CanvasTexture;
  cellCount: number;
  dispose(): void;
};

export function buildIconAtlas(
  stroke = 'rgba(235,235,240,0.92)',
): IconAtlas {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * ATLAS_GRID;
  canvas.height = CELL * ATLAS_ROWS;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Signal icon atlas requires 2D canvas support.');

  context.clearRect(0, 0, canvas.width, canvas.height);
  const scale = (CELL * 0.62) / 24;
  const offset = CELL * 0.19;

  ICON_PATHS.forEach((path, index) => {
    const column = index % ATLAS_GRID;
    const row = Math.floor(index / ATLAS_GRID);
    context.save();
    context.translate(column * CELL + offset, row * CELL + offset);
    context.scale(scale, scale);
    context.lineWidth = 1.7;
    context.strokeStyle = stroke;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke(new Path2D(path));
    context.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 2;
  texture.needsUpdate = true;

  return {
    texture,
    cellCount: ICON_PATHS.length,
    dispose: () => texture.dispose(),
  };
}
