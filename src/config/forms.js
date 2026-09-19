export const LAYDOWN_HUB_PATH = '/laydown-portal'

export const INBOUND_FORM = {
  path:        '/inbound',
  reprintPath: '/reprint-labels',
  label:       'Pinnacle Peak',
  blurb:       'Register material inbounds and print receiving labels',
}

export const LAYDOWN_FORM = {
  path:        `${LAYDOWN_HUB_PATH}?tab=new`,
  reprintPath: `${LAYDOWN_HUB_PATH}?tab=reprint`,
  label:       'Laydown Yard',
  blurb:       'Create new material submission',
  hub:         LAYDOWN_HUB_PATH,
}

export const PINNACLE_PEAK_MENU_LABEL = INBOUND_FORM.label

export const MATERIALS_LIST_PATH = '/materials-list'

export const PINNACLE_PEAK_LINKS = [
  { path: INBOUND_FORM.path, label: 'New Inbound', blurb: INBOUND_FORM.blurb },
  { path: INBOUND_FORM.reprintPath, label: 'Reprint Labels', blurb: 'Scan a barcode and reprint its label' },
  { path: MATERIALS_LIST_PATH, label: 'Materials List', blurb: 'Browse the materials database, pictures and files' },
]
