import { describe, it, expect } from 'vitest'
import { hexToHsl, getLightnessFromHex } from '../lib/color'

describe('color utils', () => {
  it('converts hex to hsl correctly for #ffffff', () => {
    expect(hexToHsl('#ffffff')).toBe('0 0% 100%')
    expect(getLightnessFromHex('#ffffff')).toBe(100)
  })

  it('converts hex to hsl correctly for #000000', () => {
    expect(hexToHsl('#000000')).toBe('0 0% 0%')
    expect(getLightnessFromHex('#000000')).toBe(0)
  })

  it('converts shorthand hex #0f0 to green', () => {
    const hsl = hexToHsl('#0f0')
    expect(hsl).toMatch(/\d+ \d+% \d+%/) // simple format check
    expect(getLightnessFromHex('#0f0')).toBeGreaterThan(0)
  })
})
