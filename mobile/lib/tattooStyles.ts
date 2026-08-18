export const TATTOO_STYLES = [
  'Traditional',
  'Neo-Traditional',
  'Realism',
  'Blackwork',
  'Geometric',
  'Watercolour',
  'Japanese',
] as const

export type TattooStyle = typeof TATTOO_STYLES[number]

export function isPredefined(s: string): s is TattooStyle {
  return TATTOO_STYLES.includes(s as TattooStyle)
}
