export const INBOUND_HUB_PATH   = '/inbound-hub'
export const OUTBOUND_HUB_PATH  = '/outbound'
export const INVENTORY_HUB_PATH = '/inventory'

export const INBOUND_FORM = {
  label: 'Pinnacle Peak',
  blurb: 'Register material inbounds and print receiving labels',
}

export const LAYDOWN_FORM = {
  label: 'Laydown Yard',
  blurb: 'Create new material submission',
}

// Material (Pinnacle) and Equipment (Laydown) intake, condensed under one "Inbound Forms" nav
// entry. `section` picks which domain is live; each keeps its own tab set.
export const INBOUND_SECTIONS = [
  {
    key:   'material',
    label: 'Material',
    tabs: [
      { key: 'new',     label: 'New Inbound' },
      { key: 'reprint', label: 'Reprint Labels' },
    ],
  },
  {
    key:   'equipment',
    label: 'Equipment',
    tabs: [
      { key: 'new',       label: 'New Inbound' },
      { key: 'breakdown', label: 'Create New Set' },
      { key: 'io',        label: 'New Inbound/Outbound' },
      { key: 'reprint',   label: 'Reprint Labels' },
    ],
  },
]

// Outbound release: a new transmittal request, the material/equipment release forms, and
// internal team transfers - each a single form/screen, so a segmented control is enough and
// none needs its own tab strip. `approverOnly` segments are filtered out for Warehouse users,
// same restriction Internal Team Transfers had as its own nav entry.
export const OUTBOUND_SECTIONS = [
  { key: 'transmittals', label: 'Transmittals' },
  { key: 'work-order',  label: 'Work Order' },
  { key: 'material',     label: 'Material' },
  { key: 'equipment',    label: 'Equipment' },
  { key: 'transfers',    label: 'Team Transfers', approverOnly: true },
]

// A Work Order is a material release request, same as a Transmittal, minus the fields that
// only make sense for the full BOQ-driven requisition flow.
export const WORK_ORDER_HIDDEN_FIELDS = ['boq', 'applicationResults', 'requestorEmail', 'urgency', 'reason', 'remark']

// The two catalogs, browsable side by side with the label reprint and quarantine screens
// that go with each.
export const INVENTORY_SECTIONS = [
  {
    key:   'material',
    label: 'Material',
    tabs: [
      { key: 'list',       label: 'Materials List' },
      { key: 'reprint',    label: 'Reprint Labels' },
      { key: 'quarantine', label: 'Quarantine' },
    ],
  },
  {
    key:   'equipment',
    label: 'Equipment',
    tabs: [
      { key: 'list',       label: 'Equipment List' },
      { key: 'reprint',    label: 'Reprint Labels' },
      { key: 'quarantine', label: 'Quarantine' },
    ],
  },
]
