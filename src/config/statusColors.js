export const SIGNATURE_STATUS_COLORS = {
  Requester:            'bg-slate-100 text-slate-600',
  Approver:             'bg-amber-100 text-amber-700',
  Warehouse:            'bg-blue-100 text-blue-700',
  'PD Acknowledgement': 'bg-orange-100 text-orange-700',
  'PD Sign-off':        'bg-indigo-100 text-indigo-700',
  Completed:            'bg-emerald-100 text-emerald-700',
  Declined:             'bg-red-100 text-red-700',
}

export const SIGNATURE_STATUS_HEX = {
  Requester:            '#94a3b8',
  Approver:             '#f59e0b',
  Warehouse:            '#3b82f6',
  'PD Acknowledgement': '#fb923c',
  'PD Sign-off':        '#6366f1',
  Completed:            '#10b981',
  Declined:             '#ef4444',
}

export const TRANSMITTAL_STATUS_COLORS = {
  Open:                           'bg-slate-100 text-slate-600',
  Closed:                         'bg-emerald-100 text-emerald-700',
  'Material Partially Delivered': 'bg-amber-100 text-amber-700',
}

export const RECIPIENT_STATUS_COLORS = {
  Complete:  'bg-emerald-100 text-emerald-700',
  'On Time': 'bg-emerald-100 text-emerald-700',
  Late:      'bg-amber-100 text-amber-700',
  'No Show': 'bg-red-100 text-red-700',
  Pending:   'bg-slate-100 text-slate-500',
}

export const URGENCY_COLORS = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-slate-100 text-slate-600',
}

// Materials list. These fill the whole cell rather than a pill, so they carry a border and
// a darker text than the pill palettes above.
export const INVENTORY_STATUS_COLORS = {
  'In Stock':                        'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Low Stock':                       'bg-amber-50 text-amber-800 border-amber-200',
  'Out of Stock - Needs Restocking': 'bg-red-50 text-red-800 border-red-200',
}

// Qty on Hand is the important one, because its the one precalculated on SS
export const QTY_ON_HAND_CELL = 'bg-blue-50 text-blue-900 border-blue-200'
export const QTY_ON_HAND_EMPTY_CELL = 'bg-red-50 text-red-800 border-red-200'

export const ROLE_COLORS = {
  owner:     'bg-red-100 text-red-700',
  approver:  'bg-amber-100 text-amber-700',
  warehouse: 'bg-blue-100 text-blue-700',
  testing:   'bg-violet-100 text-violet-700',
}

export const NEUTRAL_PILL = 'bg-slate-100 text-slate-600'

export function pillClass(map, value) {
  return map[value] ?? NEUTRAL_PILL
}

// Matches loosely on purpose: the sheet's picklist is edited by hand, and an en dash or a
// double space should not silently drop the colour.
export function inventoryStatusClass(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''

  if (INVENTORY_STATUS_COLORS[text]) return INVENTORY_STATUS_COLORS[text]

  const normalize = s => s.toLowerCase().replace(/[‐-―]/g, '-').replace(/\s+/g, ' ')
  const wanted = normalize(text)

  for (const [status, classes] of Object.entries(INVENTORY_STATUS_COLORS)) {
    if (normalize(status) === wanted) return classes
  }

  return ''
}

export function shortLabel(value) {
  return String(value ?? '').split('/')[0].trim()
}
