// Needed to dynamically build the LDYPN for the Laydown Yard form
export const PN_PREFIX = 'LDYPN-'
export const PN_DIGITS = 5
export function buildLaydownPn(id) {
  const digits = String(id ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return PN_PREFIX + digits.slice(-PN_DIGITS).padStart(PN_DIGITS, '0')
}

export const BREAKDOWN_SUFFIX_DIGITS = 2

export function buildBreakdownCode(parentPn, sequence) {
  const base = String(parentPn ?? '').trim()
  const n    = Number(sequence)
  if (!base || !Number.isFinite(n) || n < 1) return base
  return `${base}-${String(n).padStart(BREAKDOWN_SUFFIX_DIGITS, '0')}`
}
