import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SelectedLot } from './proposal-engine';
import { useIsMobile } from '@/lib/use-is-mobile';

type ViewState = { scale: number; offsetX: number; offsetY: number };
type LotMeta = { id: number; nome: string; area: number; preco: number; status: SelectedLot['status'] };

type Props = {
  baseMapSrc?: string;
  terrainMaskSrc?: string;
  selectedLot: SelectedLot | null;
  onSelect: (lot: SelectedLot | null) => void;
};

const AREA_PER_PIXEL = 0.42;
const PRICE_PER_M2 = 860;
const MIN_PIXELS = 80;
const MAX_PIXELS = 9000;
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

const formatNumber = (value: number) => Math.round(value * 100) / 100;

function constrainView(nextView: ViewState, wrap: HTMLDivElement | null, image: HTMLImageElement | null) {
  if (!wrap || !image) return nextView;

  const rect = wrap.getBoundingClientRect();
  const scaledWidth = image.naturalWidth * nextView.scale;
  const scaledHeight = image.naturalHeight * nextView.scale;
  const marginX = Math.min(rect.width * 0.18, 64);
  const marginY = Math.min(rect.height * 0.18, 64);

  const minOffsetX = Math.min(marginX, rect.width - scaledWidth - marginX);
  const maxOffsetX = Math.max(rect.width - marginX - scaledWidth, marginX);
  const minOffsetY = Math.min(marginY, rect.height - scaledHeight - marginY);
  const maxOffsetY = Math.max(rect.height - marginY - scaledHeight, marginY);

  return {
    scale: nextView.scale,
    offsetX: Math.min(maxOffsetX, Math.max(minOffsetX, nextView.offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(minOffsetY, nextView.offsetY)),
  };
}

function loadImageWithFallback(srcList: string[]) {
  return new Promise<{ image: HTMLImageElement; src: string }>((resolve, reject) => {
    const tryIndex = (index: number) => {
      if (index >= srcList.length) {
        reject(new Error(`Falha ao carregar imagem: ${srcList.join(', ')}`));
        return;
      }
      const src = srcList[index];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ image: img, src });
      img.onerror = () => tryIndex(index + 1);
      img.src = src;
    };
    tryIndex(0);
  });
}

function segmentLots(maskData: ImageData) {
  const w = maskData.width;
  const h = maskData.height;
  const total = w * h;
  const boundary = new Uint8Array(total);
  const labels = new Int32Array(total);
  const isGrayMask = (() => {
    let samples = 0;
    let lowSat = 0;
    let bright = 0;
    for (let i = 0; i < total; i += 40) {
      const p = i * 4;
      const r = maskData.data[p];
      const g = maskData.data[p + 1];
      const b = maskData.data[p + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC - minC;
      const lum = (r + g + b) / 3;
      samples += 1;
      if (sat < 12) lowSat += 1;
      if (lum > 230) bright += 1;
    }
    return lowSat / Math.max(1, samples) > 0.9 && bright / Math.max(1, samples) > 0.6;
  })();

  const getPixel = (idx: number) => {
    const p = idx * 4;
    return {
      r: maskData.data[p],
      g: maskData.data[p + 1],
      b: maskData.data[p + 2],
      a: maskData.data[p + 3],
    };
  };

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const { r, g, b, a } = getPixel(idx);
      if (a < 12) {
        boundary[idx] = 1;
        continue;
      }

      if (isGrayMask) {
        const lum = (r + g + b) / 3;
        // Para máscara em P&B: linhas escuras são fronteiras; branco é área clicável.
        if (lum < 88) boundary[idx] = 1;
        continue;
      }

      const brightness = r + g + b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC - minC;
      const isWater = b > r + 25 && b > g + 20;
      const isVeryBright = brightness > 730;
      const isDarkLine = brightness < 165 && saturation < 50;
      const isYellowLine = r > 165 && g > 125 && b < 145;
      if (isWater || isVeryBright || isDarkLine || isYellowLine) boundary[idx] = 1;
    }
  }

  const thick = new Uint8Array(boundary);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (boundary[idx]) continue;
      if (
        boundary[idx - 1] ||
        boundary[idx + 1] ||
        boundary[idx - w] ||
        boundary[idx + w] ||
        boundary[idx - w - 1] ||
        boundary[idx - w + 1] ||
        boundary[idx + w - 1] ||
        boundary[idx + w + 1]
      ) {
        thick[idx] = 1;
      }
    }
  }

  const comps: Array<{ rawId: number; pixels: number; sumX: number; sumY: number; minX: number; minY: number; maxX: number; maxY: number }> = [];
  let rawId = 1;
  for (let i = 0; i < total; i += 1) {
    if (labels[i] !== 0 || thick[i]) continue;
    const queue: number[] = [i];
    labels[i] = rawId;
    let q = 0;
    let pixels = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    while (q < queue.length) {
      const cur = queue[q++];
      const cx = cur % w;
      const cy = Math.floor(cur / w);
      pixels += 1;
      sumX += cx;
      sumY += cy;
      if (cx < minX) minX = cx;
      if (cy < minY) minY = cy;
      if (cx > maxX) maxX = cx;
      if (cy > maxY) maxY = cy;

      const neighbors = [cur - 1, cur + 1, cur - w, cur + w];
      for (const n of neighbors) {
        if (n < 0 || n >= total) continue;
        if (labels[n] !== 0 || thick[n]) continue;
        const nx = n % w;
        if (Math.abs(nx - cx) > 1) continue;
        labels[n] = rawId;
        queue.push(n);
      }
    }

    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const boxArea = Math.max(1, boxW * boxH);
    const density = pixels / boxArea;
    const aspect = boxW > boxH ? boxW / Math.max(1, boxH) : boxH / Math.max(1, boxW);

    if (pixels >= MIN_PIXELS && pixels <= MAX_PIXELS && density > 0.2 && aspect < 7.5) {
      comps.push({ rawId, pixels, sumX, sumY, minX, minY, maxX, maxY });
    } else {
      for (const idx of queue) labels[idx] = -1;
    }
    rawId += 1;
  }

  comps.sort((a, b) => (a.sumY / a.pixels - b.sumY / b.pixels) || (a.sumX / a.pixels - b.sumX / b.pixels));
  const idRemap = new Map<number, number>();
  const lots = new Map<number, LotMeta>();
  comps.forEach((comp, index) => {
    const finalId = index + 1;
    const area = formatNumber(comp.pixels * AREA_PER_PIXEL);
    const preco = Math.round(area * PRICE_PER_M2);
    idRemap.set(comp.rawId, finalId);
    lots.set(finalId, {
      id: finalId,
      nome: `Lote ${finalId}`,
      area,
      preco,
      status: 'Disponível',
    });
  });

  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (label > 0) labels[i] = idRemap.get(label) ?? -1;
  }

  return { labels, lots };
}

export function MapaLotes({
  baseMapSrc = '/images/mapa.jpeg',
  terrainMaskSrc = '/images/terrenos.png',
  selectedLot,
  onSelect,
}: Props) {
  const isMobile = useIsMobile();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number; startView: ViewState } | null>(null);

  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [labels, setLabels] = useState<Int32Array | null>(null);
  const [lots, setLots] = useState<Map<number, LotMeta>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedInternalId = useMemo(() => {
    if (!selectedLot) return null;
    const match = Array.from(lots.values()).find((lot) => lot.id.toString() === selectedLot.id);
    return match?.id ?? null;
  }, [lots, selectedLot]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      loadImageWithFallback([baseMapSrc, '/images/1234mapa.jpeg']),
      loadImageWithFallback([terrainMaskSrc]),
    ])
      .then(([baseResult, maskResult]) => {
        if (!mounted) return;
        setBaseImage(baseResult.image);
        const off = document.createElement('canvas');
        off.width = maskResult.image.naturalWidth;
        off.height = maskResult.image.naturalHeight;
        const ctx = off.getContext('2d');
        if (!ctx) throw new Error('Canvas do mapa não inicializou.');
        ctx.drawImage(maskResult.image, 0, 0);
        const data = ctx.getImageData(0, 0, off.width, off.height);
        const segmented = segmentLots(data);
        setMaskData(data);
        setLabels(segmented.labels);
        setLots(segmented.lots);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Falha ao carregar o mapa interativo.';
        setError(message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [baseMapSrc, terrainMaskSrc]);

  useEffect(() => {
    if (!baseImage || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const fit = Math.min(rect.width / baseImage.naturalWidth, rect.height / baseImage.naturalHeight);
    const drawW = baseImage.naturalWidth * fit;
    const drawH = baseImage.naturalHeight * fit;
    setView({
      scale: fit,
      offsetX: (rect.width - drawW) / 2,
      offsetY: (rect.height - drawH) / 2,
    });
  }, [baseImage]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !baseImage) return;
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * window.devicePixelRatio);
    canvas.height = Math.floor(rect.height * window.devicePixelRatio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);
    ctx.drawImage(baseImage, 0, 0);

    if (selectedInternalId && labels && maskData) {
      const overlay = new Uint8ClampedArray(maskData.data.length);
      for (let i = 0; i < labels.length; i += 1) {
        if (labels[i] !== selectedInternalId) continue;
        const p = i * 4;
        overlay[p] = 59;
        overlay[p + 1] = 130;
        overlay[p + 2] = 246;
        overlay[p + 3] = 130;
      }
      const img = new ImageData(overlay, maskData.width, maskData.height);
      const tmp = document.createElement('canvas');
      tmp.width = maskData.width;
      tmp.height = maskData.height;
      const tmpCtx = tmp.getContext('2d');
      if (tmpCtx) {
        tmpCtx.putImageData(img, 0, 0);
        ctx.drawImage(tmp, 0, 0);
      }
    }
    ctx.restore();
  }, [baseImage, labels, maskData, selectedInternalId, view]);

  useEffect(() => {
    const onResize = () => {
      if (!baseImage || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const fit = Math.min(rect.width / baseImage.naturalWidth, rect.height / baseImage.naturalHeight);
      setView((prev) => constrainView({ ...prev, scale: Math.max(prev.scale, fit) }, wrapRef.current, baseImage));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [baseImage]);

  const toMapCoords = (clientX: number, clientY: number) => {
    if (!baseImage || !wrapRef.current) return null;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - view.offsetX) / view.scale;
    const y = (clientY - rect.top - view.offsetY) / view.scale;
    if (x < 0 || y < 0 || x >= baseImage.naturalWidth || y >= baseImage.naturalHeight) return null;
    return { x: Math.floor(x), y: Math.floor(y) };
  };

  const pickLot = (clientX: number, clientY: number) => {
    if (!labels || !baseImage) return null;
    const pos = toMapCoords(clientX, clientY);
    if (!pos) return null;
    const w = baseImage.naturalWidth;
    const center = pos.y * w + pos.x;
    if (labels[center] > 0) return labels[center];
    for (let radius = 1; radius <= 8; radius += 1) {
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          const nx = pos.x + ox;
          const ny = pos.y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= baseImage.naturalHeight) continue;
          const label = labels[ny * w + nx];
          if (label > 0) return label;
        }
      }
    }
    return null;
  };

  const selectAtPoint = (clientX: number, clientY: number) => {
    const label = pickLot(clientX, clientY);
    if (!label) {
      onSelect(null);
      return;
    }
    const lot = lots.get(label);
    if (!lot) return;
    onSelect({
      id: String(lot.id),
      nome: lot.nome,
      area: lot.area,
      preco: lot.preco,
      status: lot.status,
    });
  };

  const getPointerDistance = () => {
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length < 2) return null;
    const [a, b] = pointers;
    return Math.hypot(b.x - a.x, b.y - a.y);
  };

  const zoom = (multiplier: number) => {
    setView((prev) => constrainView({ ...prev, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * multiplier)) }, wrapRef.current, baseImage));
  };

  const resetView = () => {
    if (!baseImage || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const fit = Math.min(rect.width / baseImage.naturalWidth, rect.height / baseImage.naturalHeight);
    const drawW = baseImage.naturalWidth * fit;
    const drawH = baseImage.naturalHeight * fit;
    setView({
      scale: fit,
      offsetX: (rect.width - drawW) / 2,
      offsetY: (rect.height - drawH) / 2,
    });
  };

  const beginPinch = () => {
    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length < 2) return;
    const [a, b] = pointers;
    pinchRef.current = {
      distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2,
      startView: view,
    };
    dragRef.current = null;
    setIsDragging(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    canvas?.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      pinchRef.current = null;
      setIsDragging(false);
      return;
    }

    if (pointersRef.current.size === 2) {
      beginPinch();
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2) {
      const currentPinch = pinchRef.current;
      const currentDistance = getPointerDistance();
      if (!currentPinch || !currentDistance || !baseImage || !wrapRef.current) return;

      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (currentPinch.startView.scale * currentDistance) / currentPinch.distance));
      const centerX = currentPinch.centerX;
      const centerY = currentPinch.centerY;
      const mapX = (centerX - currentPinch.startView.offsetX) / currentPinch.startView.scale;
      const mapY = (centerY - currentPinch.startView.offsetY) / currentPinch.startView.scale;

      setView(
        constrainView(
          {
            scale: nextScale,
            offsetX: centerX - mapX * nextScale,
            offsetY: centerY - mapY * nextScale,
          },
          wrapRef.current,
          baseImage,
        ),
      );
      return;
    }

    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const moved = dragRef.current.moved || Math.hypot(dx, dy) > 4;
    if (moved) setIsDragging(true);
    setView((prev) => constrainView({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }, wrapRef.current, baseImage));
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved };
  };

  const finishPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    const wasTap = dragRef.current?.pointerId === event.pointerId && !dragRef.current.moved && pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);

    if (wasTap) {
      selectAtPoint(event.clientX, event.clientY);
    }

    if (pointersRef.current.size >= 2) {
      beginPinch();
      return;
    }

    if (pointersRef.current.size === 1) {
      const [pointerId, point] = Array.from(pointersRef.current.entries())[0];
      dragRef.current = { pointerId, x: point.x, y: point.y, moved: false };
      pinchRef.current = null;
      setTimeout(() => setIsDragging(false), 0);
      return;
    }

    dragRef.current = null;
    pinchRef.current = null;
    setTimeout(() => setIsDragging(false), 0);
  };

  return (
    <div className="grid gap-3 xl:grid-cols-[0.78fr_0.22fr]">
      <div className="rounded-2xl border bg-gradient-to-br from-slate-100 via-slate-50 to-white p-3 shadow-sm">
        <div
          ref={wrapRef}
          className="relative h-[360px] overflow-hidden rounded-2xl border border-slate-200/80 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.08),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(16,185,129,0.08),transparent_38%)] sm:h-[480px]"
        >
          <canvas
            ref={canvasRef}
            aria-label="Mapa interativo de lotes"
            className={`h-full w-full touch-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') finishPointer(event);
            }}
          />

          <div className="absolute left-3 top-3 rounded-lg border border-slate-300/70 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur">
            Arraste com 1 dedo e use 2 dedos para zoom
          </div>

          {!isMobile && (
            <div className="absolute right-3 top-1/2 flex w-[126px] -translate-y-1/2 flex-col gap-2">
              <button
                aria-label="Zoom in"
                className="rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                type="button"
                onClick={() => zoom(1.2)}
              >
                +
              </button>
              <button
                aria-label="Centralizar mapa"
                className="rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                type="button"
                onClick={resetView}
              >
                ⟳ Centralizar
              </button>
              <button
                aria-label="Zoom out"
                className="rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                type="button"
                onClick={() => zoom(1 / 1.2)}
              >
                −
              </button>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
              <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">Inicializando mapa interativo...</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4 text-center backdrop-blur-sm">
              <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
                <AlertTriangle className="mx-auto h-5 w-5 text-destructive" />
                <p className="text-sm font-medium">Falha ao carregar mapa</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border bg-gradient-to-b from-white to-slate-50 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Detalhes do lote</h3>
          <button
            type="button"
            aria-label="Limpar lote selecionado"
            className="rounded-lg border border-slate-300/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => onSelect(null)}
          >
            Limpar
          </button>
        </div>
        {!selectedLot ? (
          <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            Clique em um terreno no mapa.
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="rounded-xl border bg-white p-2.5"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Lote</dt><dd className="font-medium">{selectedLot.nome}</dd></div>
            <div className="rounded-xl border bg-white p-2.5"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Área</dt><dd className="font-medium">{selectedLot.area.toLocaleString('pt-BR')} m²</dd></div>
            <div className="rounded-xl border bg-white p-2.5"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor</dt><dd className="font-medium">{selectedLot.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>
            <div className="rounded-xl border bg-white p-2.5"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</dt><dd className="font-medium text-emerald-600">{selectedLot.status}</dd></div>
          </dl>
        )}
      </aside>
    </div>
  );
}
