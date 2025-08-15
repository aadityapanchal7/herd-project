// Small color utilities used by theme handling
export function hexToHsl(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const bigint = parseInt(full, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  let hDeg = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rN:
        hDeg = (gN - bN) / d + (gN < bN ? 6 : 0)
        break
      case gN:
        hDeg = (bN - rN) / d + 2
        break
      case bN:
        hDeg = (rN - gN) / d + 4
        break
    }
    hDeg = Math.round(hDeg * 60)
  }
  const H = Math.round(hDeg || 0)
  const S = Math.round(s * 100)
  const L = Math.round(l * 100)
  return `${H} ${S}% ${L}%`
}

export function getLightnessFromHex(hex: string): number {
  const hsl = hexToHsl(hex)
  const parts = hsl.split(' ')
  const l = parts[2] || '50%'
  return Number(l.replace('%', ''))
}
