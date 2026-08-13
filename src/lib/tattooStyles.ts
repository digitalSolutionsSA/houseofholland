export const TATTOO_STYLES = [
  'American Traditional',
  'Neo Traditional',
  'Realism',
  'Black & Grey',
  'Fine Line',
  'Cover-ups',
  'Lettering',
] as const

export type TattooStyle = typeof TATTOO_STYLES[number]

export function isPredefined(s: string): s is TattooStyle {
  return (TATTOO_STYLES as readonly string[]).includes(s)
}
