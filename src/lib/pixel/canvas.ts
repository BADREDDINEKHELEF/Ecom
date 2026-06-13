export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio || 1, 2)
}

export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.hardwareConcurrency <= 4 || window.innerWidth < 768
}

export function createOffscreenCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}
