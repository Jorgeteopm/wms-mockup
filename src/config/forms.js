export const MATERIALS_HUB_PATH = '/materials-hub'

export const INBOUND_FORM = {
  label: 'Pinnacle Peak',
  blurb: 'Register material inbounds and print receiving labels',
}

export const LAYDOWN_FORM = {
  label: 'Laydown Yard',
  blurb: 'Create new material submission',
}

// The two receiving forms, condensed under one "Materials" nav entry. `section` picks which
// one is live; each keeps its own tab set, matching what it printed as a standalone form.
export const MATERIAL_SECTIONS = [
  {
    key:           'material',
    label:         'Material',
    tabs: [
      { key: 'new',      label: 'New Inbound' },
      { key: 'outbound', label: 'New Outbound' },
      { key: 'reprint',  label: 'Reprint Labels' },
      { key: 'list',     label: 'Materials List' },
    ],
  },
  {
    key:           'equipment',
    label:         'Equipment',
    tabs: [
      { key: 'new',          label: 'New Inbound' },
      { key: 'breakdown',    label: 'Create New Set' },
      { key: 'io',           label: 'New Inbound/Outbound' },
      { key: 'newOutbound',  label: 'New Outbound' },
      { key: 'reprint',      label: 'Reprint Labels' },
      { key: 'list',         label: 'Equipment List' },
    ],
  },
]
