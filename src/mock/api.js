// ---------------------------------------------------------------------------
// PRESENTATION MOCKUP — stateful in-memory API with local persistence.
//
// Installs a window.fetch interceptor that answers every /api/* request from a
// mutable in-memory store, so the real frontend runs as a full demo with no
// backend. The store is:
//   • seeded on first run,
//   • persisted to localStorage on every write (survives reloads, offline),
//   • exportable/importable as JSON, and optionally auto-saved to a folder
//     you pick (Chrome/Edge File System Access API).
//
// The transmittal lifecycle is fully simulated:
//   submit → approver (approve/decline) → warehouse → recipient → completed,
//   plus recipient no-show. State advances and persists at every step.
//
// Delete the import of this file in main.js to talk to the real API again.
// ---------------------------------------------------------------------------

const realFetch = window.fetch.bind(window)
const LS_KEY = 'wms_demo_state_v2'

// --- helpers ---------------------------------------------------------------

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

async function readBody(init) {
  if (!init || !init.body) return {}
  try { return JSON.parse(init.body) } catch { return {} }
}

function today() { return new Date().toISOString().slice(0, 10) }

// A hand-drawn-looking signature so signed stages render something real.
function sig() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80">` +
    `<path d="M8 56 C 36 8, 58 72, 88 40 S 138 8, 168 46 S 206 64, 232 26" ` +
    `fill="none" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round"/></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

// Minimal valid PDF bytes for the label-print path (validated as application/pdf).
function pdfBlob() {
  const pdf =
    '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
    '4 0 obj<</Length 52>>stream\nBT /F1 18 Tf 40 110 Td (WMS Mock Label) Tj ET\nendstream endobj\n' +
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
  return new Blob([pdf], { type: 'application/pdf' })
}

// ===========================================================================
// STATIC REFERENCE DATA (read-only — never persisted)
// ===========================================================================

// Systems drive access control: a user assigned to a system only sees the
// transmittals and products of that system; admins (no system) see everything.
const SYSTEMS = ['UPW', 'Water', 'CDS', 'WCCS', 'SDS', 'Barcode', 'TMAH', 'CCTV']
function systemForIndex(i) { return SYSTEMS[i % SYSTEMS.length] }

const materials = [
  { partNumber: 'PVC-2IN-SCH40',  description: '2" PVC Pipe Schedule 40',   product: 'Piping',      type: 'Pipe',     unit: 'FT',   brand: 'Charlotte', warehouse: 'Pinnacle Peak' },
  { partNumber: 'CU-3-4-TYPEL',   description: '3/4" Copper Pipe Type L',    product: 'Piping',      type: 'Pipe',     unit: 'FT',   brand: 'Mueller',   warehouse: 'Pinnacle Peak' },
  { partNumber: 'ELB-90-2IN',     description: '2" 90° PVC Elbow',           product: 'Fittings',    type: 'Fitting',  unit: 'EA',   brand: 'Charlotte', warehouse: 'Pinnacle Peak' },
  { partNumber: 'BALLV-1IN-BR',   description: '1" Brass Ball Valve',        product: 'Valves',      type: 'Valve',    unit: 'EA',   brand: 'Apollo',    warehouse: 'Laydown Yard' },
  { partNumber: 'GATEV-4IN',      description: '4" Gate Valve Flanged',      product: 'Valves',      type: 'Valve',    unit: 'EA',   brand: 'Nibco',     warehouse: 'Laydown Yard' },
  { partNumber: 'INS-FG-R19',     description: 'Fiberglass Insulation R-19', product: 'Insulation',  type: 'Batt',     unit: 'ROLL', brand: 'Owens',     warehouse: 'Pinnacle Peak' },
  { partNumber: 'THRD-ROD-1-2',   description: '1/2" Threaded Rod x 10ft',   product: 'Hardware',    type: 'Rod',      unit: 'EA',   brand: 'Hilti',     warehouse: 'Pinnacle Peak' },
  { partNumber: 'UNISTRUT-P1000', description: 'Unistrut P1000 Channel 10ft',product: 'Support',     type: 'Channel',  unit: 'EA',   brand: 'Unistrut',  warehouse: 'Pinnacle Peak' },
  { partNumber: 'CONDUIT-EMT-3-4',description: '3/4" EMT Conduit',           product: 'Electrical',  type: 'Conduit',  unit: 'FT',   brand: 'Wheatland', warehouse: 'Laydown Yard' },
  { partNumber: 'WIRE-THHN-12',   description: '#12 THHN Wire Black',        product: 'Electrical',  type: 'Wire',     unit: 'FT',   brand: 'Southwire', warehouse: 'Laydown Yard' },
  { partNumber: 'BOLT-HEX-3-8',   description: '3/8" x 2" Hex Bolt Galv',    product: 'Hardware',    type: 'Fastener', unit: 'BOX',  brand: 'Grainger',  warehouse: 'Pinnacle Peak' },
  { partNumber: 'GASKET-4IN-RF',  description: '4" Raised Face Ring Gasket', product: 'Fittings',    type: 'Gasket',   unit: 'EA',   brand: 'Garlock',   warehouse: 'Laydown Yard' },
  { partNumber: 'PUMP-CENT-2HP',  description: '2HP Centrifugal Pump',       product: 'Equipment',   type: 'Pump',     unit: 'EA',   brand: 'Grundfos',  warehouse: 'Laydown Yard' },
  { partNumber: 'PAINT-EPOXY-GY', description: 'Grey Epoxy Coating 1gal',    product: 'Coatings',    type: 'Paint',    unit: 'EA',   brand: 'Sherwin',   warehouse: 'Pinnacle Peak' },
  { partNumber: 'TAPE-PTFE-1-2',  description: '1/2" PTFE Thread Tape',      product: 'Consumables', type: 'Tape',     unit: 'EA',   brand: '3M',        warehouse: 'Pinnacle Peak' },
]
// Tag every catalogue product with a system (round-robin across SYSTEMS).
materials.forEach((m, i) => { m.system = systemForIndex(i) })

const materialStatuses = ['New', 'Good', 'Used', 'Damaged']
const inboundLocations = ['Yard A', 'Yard B', 'Warehouse 1', 'Rack 3', 'Bay 7']
const inboundUnits = ['EA', 'BOX', 'PALLET', 'FT', 'KG', 'ROLL']

const picklists = {
  descriptions1: ['2" PVC Pipe', '3/4" Copper Pipe', 'Brass Ball Valve', 'Gate Valve', 'EMT Conduit', 'THHN Wire'],
  descriptions2: ['Schedule 40', 'Type L', 'Flanged', 'Galvanized', 'Black', 'White'],
  categories:    ['Piping', 'Fittings', 'Valves', 'Electrical', 'Hardware', 'Equipment', 'Consumables'],
  micPartNumbers:['MIC-0001', 'MIC-0002', 'MIC-0003', 'MIC-0004', 'MIC-0005'],
  types:         ['Pipe', 'Fitting', 'Valve', 'Wire', 'Conduit', 'Pump', 'Fastener'],
  brands:        ['Charlotte', 'Mueller', 'Apollo', 'Nibco', 'Southwire', 'Grundfos', 'Hilti'],
  specs:         ['ASTM D1785', 'ASTM B88', 'ANSI 150#', 'UL Listed', 'NEMA'],
  suppliers:     ['Ferguson', 'Grainger', 'HD Supply', 'Border States', 'MSC'],
  units:         inboundUnits,
  locations:     inboundLocations,
}

const inboundMaterialsList = materials.map((m, i) => ({
  tpn: `TPN-00${4400 + i}`, barcodeTpn: `TPN-00${4400 + i}`,
  description1: m.description, description2: m.type,
  micPartNumber: `MIC-00${(i % 5) + 1}`, transmittalId: '',
  unit: m.unit, location: [inboundLocations[i % inboundLocations.length]], condition: 'New',
  type: m.type, spec: picklists.specs[i % picklists.specs.length], brand: m.brand,
  category: m.product, supplier: picklists.suppliers[i % picklists.suppliers.length],
  system: m.system,
}))

const materialsDbColumns = [
  { key: 'TPN',              label: 'TPN',              field: 'tpn',            kind: 'text' },
  { key: 'DESCRIPTION_1',    label: 'Description 1',    field: 'description1',   kind: 'text' },
  { key: 'DESCRIPTION_2',    label: 'Description 2',    field: 'description2',   kind: 'text' },
  { key: 'MIC_PN',           label: 'MIC Part #',       field: 'micPartNumber',  kind: 'text' },
  { key: 'CATEGORY',         label: 'Category',         field: 'category',       kind: 'text' },
  { key: 'BRAND',            label: 'Brand',            field: 'brand',          kind: 'text' },
  { key: 'UNIT',             label: 'Unit',             field: 'unit',           kind: 'text' },
  { key: 'LOCATION',         label: 'Location',         field: 'location',       kind: 'text' },
  { key: 'QTY_ON_HAND',      label: 'Qty on Hand',      field: 'qtyOnHand',      kind: 'number' },
  { key: 'INVENTORY_STATUS', label: 'Inventory Status', field: 'inventoryStatus',kind: 'text' },
  { key: 'ATTACHMENTS',      label: 'Files',            field: 'attachmentCount',kind: 'number' },
]
const INV_STATUS = ['In Stock', 'Low Stock', 'Out of Stock - Needs Restocking']
const DETAIL_FIELD_KEYS = ['micPartNumber', 'description1', 'description2', 'type', 'spec', 'unit', 'location', 'brand', 'category', 'supplier', 'remark']
function invStatusFor(qty) { return qty <= 0 ? INV_STATUS[2] : (qty < 20 ? INV_STATUS[1] : INV_STATUS[0]) }

const rgOptions = {
  condition: ['New', 'Good', 'Used', 'Damaged'], origin: ['USA', 'China', 'Germany', 'Mexico'],
  packageType: ['Pallet', 'Crate', 'Box', 'Bundle', 'Loose'], type: ['Pipe', 'Valve', 'Fitting', 'Chemical', 'Equipment'],
  deliveryCompany: ['FedEx Freight', 'XPO', 'Old Dominion', 'Local Haul'], supplier: ['Ferguson', 'Grainger', 'HD Supply', 'Univar'],
  system: ['Cooling Water', 'Fire Protection', 'Process Gas', 'Domestic Water'],
}
const rgMicPartNumbers = {
  'RG-CHEM-001': { chemical: 'Sodium Hypochlorite', micPartNumber: 'RG-CHEM-001', description: 'NaOCl 12.5% — 55gal drum', isSetUnit: false },
  'RG-CHEM-002': { chemical: 'Sulfuric Acid',       micPartNumber: 'RG-CHEM-002', description: 'H2SO4 93% — tote',        isSetUnit: true },
  'RG-VALV-010': { chemical: '',                    micPartNumber: 'RG-VALV-010', description: '6" Butterfly Valve',      isSetUnit: false },
}
const rgLocations = [{ locationName: 'Grid A1' }, { locationName: 'Grid A2' }, { locationName: 'Grid B4' }, { locationName: 'Chem Pad' }]
const rgBrands = [{ brand: 'Univar' }, { brand: 'Brenntag' }, { brand: 'Nibco' }, { brand: 'Grundfos' }]
const rgChemicals = [{ chemical: 'Sodium Hypochlorite' }, { chemical: 'Sulfuric Acid' }, { chemical: 'Caustic Soda' }, { chemical: 'Hydrochloric Acid' }]
const rgSystems = [{ systemName: 'Cooling Water' }, { systemName: 'Fire Protection' }, { systemName: 'Process Gas' }, { systemName: 'Domestic Water' }]
const laydownOptions = {
  condition: rgOptions.condition, location: rgLocations.map(l => l.locationName), system: rgSystems.map(s => s.systemName),
  packageType: rgOptions.packageType, type: rgOptions.type, origin: rgOptions.origin,
  brand: rgBrands.map(b => b.brand), chemical: rgChemicals.map(c => c.chemical),
}

// ===========================================================================
// TRANSMITTAL LIFECYCLE (authoritative rules from the real backend)
// ===========================================================================
// signatureStatus = the last stage that SIGNED (null before creation).
// currentStage    = who we await next.  signedStages = every stage up to+incl. status.

const STAGES = ['requester', 'approver', 'warehouse', 'recipient']
const NEXT_STAGE = { Requester: 'approver', Approver: 'warehouse', Warehouse: 'recipient' }

function currentStageFor(status) {
  if (!status) return 'requester'
  return NEXT_STAGE[status] ?? null            // Completed / Declined → null
}
function signedStagesFor(status) {
  const idx = status === 'Completed' ? 3 : (status ? STAGES.indexOf(String(status).toLowerCase()) : -1)
  return STAGES.filter((_, i) => i <= idx)     // Declined → indexOf = -1 → []
}

// ===========================================================================
// SEED
// ===========================================================================

function transmittalItems(seed = 0) {
  const pick = (i) => materials[(seed + i) % materials.length]
  const m0 = pick(0), m1 = pick(3), m2 = pick(6)
  return [
    { childRowId: `${seed}-1`, partNumber: m0.partNumber, type: m0.type, description: m0.description, product: m0.product, unit: m0.unit, qty: 120, warehouse: m0.warehouse, transferQty: 120, remarks: '',              transmittalStatus: 'Open' },
    { childRowId: `${seed}-2`, partNumber: m1.partNumber, type: m1.type, description: m1.description, product: m1.product, unit: m1.unit, qty: 8,   warehouse: m1.warehouse, transferQty: 8,   remarks: 'Handle w/ care', transmittalStatus: 'Open' },
    { childRowId: `${seed}-3`, partNumber: m2.partNumber, type: m2.type, description: m2.description, product: m2.product, unit: m2.unit, qty: 40,  warehouse: m2.warehouse, transferQty: 40,  remarks: '',              transmittalStatus: 'Open' },
  ]
}

function buildSeedTransmittal(s) {
  const seed = Number(String(s.rowId).replace(/\D/g, '')) || 0
  const names = { requester: s.applicantName, approver: s.approverName || '', warehouse: s.warehouseName || '', recipient: s.recipientName || '' }
  const signatures = {}
  for (const stage of signedStagesFor(s.status)) signatures[stage] = sig()
  if (s.status === 'Declined') signatures.requester = sig()   // requester did sign before decline
  return {
    rowId: s.rowId,
    form: {
      company: s.company, boq: `BOQ-${seed}`, dateApplication: s.dateApplication,
      applicationResults: 'Approved for picking', applicantName: s.applicantName, requestorEmail: s.requestorEmail,
      dateNeeded: '2026-09-22', datePicking: s.status === 'Completed' ? '2026-09-20' : '', reason: 'Installation — Building C mechanical room',
      pickupLocation: 'Pinnacle Peak — Dock 2', remark: s.remark || `MIC-${s.rowId}`, comments: s.comments || '',
      datePickup: ['Warehouse', 'Completed'].includes(s.status) ? '2026-09-21' : '',
      urgency: !!s.urgency, urgencyLevel: s.urgencyLevel || 'Low / 低度', urgencyReason: s.urgency ? 'Critical path activity' : '',
      acknowledgeName: s.warehouseName || '', pickupTimeframe: ['Warehouse', 'Completed'].includes(s.status) ? '08:00 - 12:00' : '',
      system: s.system || '',
    },
    items: transmittalItems(seed).map(it => ({ ...it, system: s.system || '', transmittalStatus: s.transmittalStatus === 'Material Partially Delivered' ? 'Material Partially Delivered' : 'Open' })),
    system: s.system || '',
    status: s.status,
    transmittalStatus: s.transmittalStatus,
    recipientStatus: s.recipientStatus || '',
    declineReason: s.declineReason || '',
    hasRecipientId: s.status === 'Completed',
    signatureNames: names,
    signatures,
    pdStage: s.pdStage || null,
  }
}

const SEED_TRANSMITTALS = [
  { rowId: 'TR-1042', system: 'UPW',   company: 'Apex Mechanical', applicantName: 'Chris Bennett', requestorEmail: 'chris.bennett@apexmech.com', dateApplication: '2026-09-18', status: 'Approver',  transmittalStatus: 'Open',   recipientStatus: 'Pending',  urgency: true,  urgencyLevel: 'High / 高度',   approverName: 'Jennifer Adams' },
  { rowId: 'TR-1041', system: 'Water', company: 'Apex Mechanical', applicantName: 'Chris Bennett', requestorEmail: 'chris.bennett@apexmech.com', dateApplication: '2026-09-17', status: 'Completed', transmittalStatus: 'Closed', recipientStatus: 'Complete', urgency: false, urgencyLevel: 'Low / 低度',    approverName: 'Emily Carter',   warehouseName: 'Robert Johnson', recipientName: 'Mark Davis', comments: 'Rush for Bldg C' },
  { rowId: 'TR-1040', system: 'UPW',   company: 'MIC',             applicantName: 'Daniel Foster', requestorEmail: 'daniel.foster@mic.com',      dateApplication: '2026-09-17', status: 'Requester', transmittalStatus: 'Open',   recipientStatus: 'Pending',  urgency: false, urgencyLevel: 'Medium / 中度' },
  { rowId: 'TR-1039', system: 'CDS',   company: 'Summit Builders', applicantName: 'Laura Bennett', requestorEmail: 'laura@summitbuilders.com',   dateApplication: '2026-09-16', status: 'Completed', transmittalStatus: 'Material Partially Delivered', recipientStatus: 'Late', urgency: true, urgencyLevel: 'High / 高度', approverName: 'Emily Carter', warehouseName: 'Robert Johnson', recipientName: 'Laura Bennett', pdStage: 'acknowledgement' },
  { rowId: 'TR-1038', system: 'Water', company: 'MIC',             applicantName: 'Daniel Foster', requestorEmail: 'daniel.foster@mic.com',      dateApplication: '2026-09-15', status: 'Declined',  transmittalStatus: 'Open',   recipientStatus: '',         urgency: false, urgencyLevel: 'Low / 低度',    approverName: 'Emily Carter', declineReason: 'BOQ mismatch — resubmit with corrected quantities.' },
  { rowId: 'TR-1037', system: 'UPW',   company: 'Apex Mechanical', applicantName: 'Chris Bennett', requestorEmail: 'chris.bennett@apexmech.com', dateApplication: '2026-09-15', status: 'Completed', transmittalStatus: 'Closed', recipientStatus: 'Complete', urgency: false, urgencyLevel: 'Medium / 中度', approverName: 'Jennifer Adams', warehouseName: 'Ashley Brown', recipientName: 'Mark Davis' },
  { rowId: 'TR-1036', system: 'CDS',   company: 'Summit Builders', applicantName: 'Laura Bennett', requestorEmail: 'laura@summitbuilders.com',   dateApplication: '2026-09-14', status: 'Requester', transmittalStatus: 'Open',   recipientStatus: 'Pending',  urgency: false, urgencyLevel: 'Low / 低度',    comments: 'Called recipient' },
  { rowId: 'TR-1035', system: 'WCCS',  company: 'MIC',             applicantName: 'Daniel Foster', requestorEmail: 'daniel.foster@mic.com',      dateApplication: '2026-09-12', status: 'Completed', transmittalStatus: 'Closed', recipientStatus: 'Late',     urgency: false, urgencyLevel: 'Low / 低度',    approverName: 'Emily Carter',  warehouseName: 'James Wilson',   recipientName: 'Mark Davis' },
  { rowId: 'TR-1034', system: 'Water', company: 'Apex Mechanical', applicantName: 'Chris Bennett', requestorEmail: 'chris.bennett@apexmech.com', dateApplication: '2026-09-11', status: 'Completed', transmittalStatus: 'Closed', recipientStatus: 'Complete', urgency: true,  urgencyLevel: 'High / 高度',   approverName: 'Emily Carter', warehouseName: 'Robert Johnson', recipientName: 'Mark Davis' },
]

function seedUsers() {
  return [
    { id: 1, name: 'David Miller',    email: 'david.miller@teopm.com',   company: 'TEOPM', phone: '+1 480 555 0142', role: 'admin',     system: null,    canManageUsers: true,  isActive: true,  lastLoginAt: '2026-09-19T13:40:00Z' },
    { id: 2, name: 'Jennifer Adams',  email: 'jennifer.adams@mic.com',   company: 'MIC',   phone: '+1 480 555 0110', role: 'approver',  system: 'UPW',   canManageUsers: false, isActive: true,  lastLoginAt: '2026-09-18T22:05:00Z' },
    { id: 3, name: 'Robert Johnson',  email: 'robert.johnson@mic.com',   company: 'MIC',   phone: '+1 480 555 0133', role: 'warehouse', system: 'Water', canManageUsers: false, isActive: true,  lastLoginAt: '2026-09-19T11:12:00Z' },
    { id: 4, name: 'Emily Carter',    email: 'emily.carter@mic.com',     company: 'MIC',   phone: '+1 602 555 0198', role: 'approver',  system: 'CDS',   canManageUsers: false, isActive: true,  lastLoginAt: '2026-09-15T16:30:00Z' },
    { id: 5, name: 'James Wilson',    email: 'james.wilson@mic.com',     company: 'MIC',   phone: '+1 480 555 0155', role: 'warehouse', system: 'WCCS',  canManageUsers: false, isActive: true,  lastLoginAt: '2026-09-19T08:20:00Z' },
    { id: 6, name: 'Ashley Brown',    email: 'ashley.brown@mic.com',     company: 'MIC',   phone: '+1 480 555 0177', role: 'warehouse', system: 'UPW',   canManageUsers: false, isActive: true,  lastLoginAt: '2026-09-17T15:05:00Z' },
    { id: 7, name: 'Sarah Thompson',  email: 'sarah.thompson@teopm.com', company: 'TEOPM', phone: '+1 480 555 0199', role: 'testing',   system: null,    canManageUsers: false, isActive: true,  lastLoginAt: '2026-09-19T09:00:00Z' },
  ]
}

function seedMaterialsDb() {
  const qtys = [340, 12, 0, 88, 1500, 26, 210, 5, 900, 4200, 60, 18, 2, 34, 500]
  return materials.map((m, i) => {
    const qty = qtys[i] ?? 50
    return {
      rowId: `MDB-${100 + i}`, tpn: `TPN-00${4400 + i}`, description1: m.description, description2: m.type,
      micPartNumber: `MIC-00${(i % 5) + 1}`, type: m.type, spec: picklists.specs[i % picklists.specs.length],
      brand: m.brand, supplier: picklists.suppliers[i % picklists.suppliers.length], category: m.product, unit: m.unit,
      location: [inboundLocations[i % inboundLocations.length], inboundLocations[(i + 2) % inboundLocations.length]].join(', '),
      remark: '', inventoryStatus: invStatusFor(qty), qtyOnHand: qty, totalInventory: qty,
      attachmentCount: i % 3 === 0 ? 2 : 0, picture: null, barcode: null, system: m.system,
    }
  })
}

function seedInbound() {
  return [
    { rowId: 'INB-501', system: 'UPW',   tpn: 'TPN-004501', barcodeTpn: 'TPN-004501', transmittalId: 'TR-1041', description1: '2" PVC Pipe', description2: 'Schedule 40', micPartNumber: 'MIC-0001', batch: 'B-2209', qty: 120, unit: 'FT', location: ['Yard A'],           condition: 'New',  remark: '',           type: 'Pipe',    spec: 'ASTM D1785', brand: 'Charlotte', category: 'Piping',     supplier: 'Ferguson' },
    { rowId: 'INB-502', system: 'SDS',   tpn: 'TPN-004502', barcodeTpn: 'TPN-004502', transmittalId: 'TR-1041', description1: 'Gate Valve',  description2: 'Flanged',     micPartNumber: 'MIC-0004', batch: 'B-2210', qty: 6,   unit: 'EA', location: ['Warehouse 1'],      condition: 'New',  remark: 'Palletized', type: 'Valve',   spec: 'ANSI 150#',  brand: 'Nibco',     category: 'Valves',     supplier: 'HD Supply' },
    { rowId: 'INB-503', system: 'Water', tpn: 'TPN-004503', barcodeTpn: 'TPN-004503', transmittalId: 'TR-1039', description1: 'THHN Wire',   description2: 'Black',       micPartNumber: 'MIC-0005', batch: 'B-2211', qty: 2500,unit: 'FT', location: ['Rack 3'],           condition: 'New',  remark: '',           type: 'Wire',    spec: 'UL Listed',  brand: 'Southwire', category: 'Electrical', supplier: 'Border States' },
    { rowId: 'INB-504', system: 'UPW',   tpn: 'TPN-004504', barcodeTpn: 'TPN-004504', transmittalId: '',        description1: 'EMT Conduit', description2: '3/4"',        micPartNumber: 'MIC-0003', batch: 'B-2212', qty: 40,  unit: 'EA', location: ['Yard B', 'Bay 7'],  condition: 'Used', remark: 'Minor rust', type: 'Conduit', spec: 'NEMA',       brand: 'Wheatland', category: 'Electrical', supplier: 'Grainger' },
  ]
}

function seedLaydown() {
  return [
    { rowId: 'LY-9001', parentRowId: null, partNumber: 'LDYPN-00042', micPartNumber: 'RG-CHEM-001', breakdownCode: '', chemical: 'Sodium Hypochlorite', description: 'NaOCl 12.5% — 55gal drum', qty: 4, location: 'Chem Pad', containerNumber: 'CN-88213', packageType: 'Pallet', poNumber: 'PO-55120', arrivalDate: '2026-09-18', supplier: 'Univar' },
    { rowId: 'LY-9002', parentRowId: null, partNumber: 'LDYPN-00043', micPartNumber: 'RG-CHEM-002', breakdownCode: '', chemical: 'Sulfuric Acid',       description: 'H2SO4 93% — tote',        qty: 1, location: 'Chem Pad', containerNumber: 'CN-88214', packageType: 'Crate',  poNumber: 'PO-55121', arrivalDate: '2026-09-18', supplier: 'Brenntag' },
    { rowId: 'LY-9003', parentRowId: 'LY-9002', partNumber: 'LDYPN-00043-01', micPartNumber: 'RG-CHEM-002', breakdownCode: 'LDYPN-00043-01', chemical: 'Sulfuric Acid', description: 'Tote — Unit 1', qty: 1, location: 'Grid B4', containerNumber: 'CN-88214', packageType: 'Crate', poNumber: 'PO-55121', arrivalDate: '2026-09-18', parentMicPartNumber: 'RG-CHEM-002', parentPartNumber: 'LDYPN-00043', parentChemical: 'Sulfuric Acid', comments: '', barcodeValue: 'LDYPN-00043-01' },
    { rowId: 'LY-9004', parentRowId: null, partNumber: 'LDYPN-00044', micPartNumber: 'RG-VALV-010', breakdownCode: '', chemical: '', description: '6" Butterfly Valve', qty: 12, location: 'Grid A1', containerNumber: 'CN-88215', packageType: 'Box', poNumber: 'PO-55122', arrivalDate: '2026-09-17', supplier: 'Nibco' },
  ]
}

function seedDb() {
  const users = seedUsers()
  return {
    version: 4,
    // session.user = who is signed in (null = signed out → login screen).
    // Default to the admin so the demo opens ready; sign out to try other users.
    session: { user: users.find(u => u.role === 'admin') || users[0] },
    transmittals: SEED_TRANSMITTALS.map(buildSeedTransmittal),
    users,
    materialsDb: seedMaterialsDb(),
    inbound: seedInbound(),
    laydown: seedLaydown(),
    seq: { transmittal: 1043, inbound: 505, laydown: 9005, user: 8, laydownPn: 45 },
  }
}

// ===========================================================================
// PERSISTENCE
// ===========================================================================

function loadDb() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.transmittals) && parsed.version === 4) return parsed
    }
  } catch { /* ignore */ }
  const fresh = seedDb()
  try { localStorage.setItem(LS_KEY, JSON.stringify(fresh)) } catch { /* ignore */ }
  return fresh
}

let db = loadDb()
let dirHandle = null   // optional File System Access API folder handle

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
  flashSaved()
  if (dirHandle) writeToFolder().catch(() => {})
}

async function writeToFolder() {
  const fh = await dirHandle.getFileHandle('wms-demo-state.json', { create: true })
  const w = await fh.createWritable()
  await w.write(JSON.stringify(db, null, 2))
  await w.close()
}

// ===========================================================================
// PROJECTIONS
// ===========================================================================

function findT(id) { return db.transmittals.find(t => String(t.rowId) === String(id)) }

// --- access control ---------------------------------------------------------
// The signed-in user only sees data for their system. Admin/testing (or any
// user with no system) see everything.
function sessionUser() {
  return (db.session && db.session.user) || null
}
function seesAllSystems(u) {
  return !u || u.role === 'admin' || u.role === 'testing' || !u.system
}
function visibleTransmittals() {
  const u = sessionUser()
  if (seesAllSystems(u)) return db.transmittals
  return db.transmittals.filter(t => t.system === u.system)
}
function visibleBySystem(rows) {
  const u = sessionUser()
  if (seesAllSystems(u)) return rows
  return rows.filter(r => !r.system || r.system === u.system)
}

function transmittalDetail(t) {
  const status = t.status
  return {
    form: { ...t.form, declineReason: t.declineReason || '' },
    items: t.items,
    signatureStatus: status,
    transmittalStatus: t.transmittalStatus,
    currentStage: currentStageFor(status),
    signedStages: signedStagesFor(status),
    signatureNames: t.signatureNames,
    signatures: t.signatures,
    hasRecipientId: !!t.hasRecipientId,
    isDeclined: status === 'Declined',
    declineReason: t.declineReason || '',
    pdVersion: 1,
    pdStage: t.pdStage || null,
    pdOutboundPending: false,
    pdDatePickup: '', pdPickupLocation: '', pdPickupTimeframe: '',
  }
}

function dashboardRow(t) {
  return {
    rowId: t.rowId, remark: t.form.remark || '', comments: t.form.comments || '',
    company: t.form.company, applicantName: t.form.applicantName, requestorEmail: t.form.requestorEmail,
    dateApplication: t.form.dateApplication, status: t.status, transmittal_status: t.transmittalStatus,
    urgency: !!t.form.urgency, urgencyLevel: t.form.urgencyLevel || '',
    system: t.system || t.form.system || '',
    approverName: t.signatureNames.approver || '', warehouseName: t.signatureNames.warehouse || '',
    recipientStatus: t.recipientStatus || '', declineReason: t.declineReason || '',
    transmittalUrl: `https://wms.example.com/transmittal/${t.rowId}`,
  }
}

function adminKpis() {
  const list = visibleTransmittals()
  const byStatus = { Requester: 0, Approver: 0, Warehouse: 0, Completed: 0, Declined: 0, 'PD Acknowledgement': 0, 'PD Sign-off': 0 }
  list.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1 })
  const companies = {}, mats = {}
  list.forEach(t => {
    companies[t.form.company] = (companies[t.form.company] || 0) + 1
    t.items.forEach(it => { mats[it.description] = (mats[it.description] || 0) + 1 })
  })
  const top = (o) => Object.entries(o).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4)
  return {
    total: list.length, byStatus,
    urgencyRate: 33, approvalRate: 88, avgApprovalHours: 6, avgCompletionHours: 41,
    submissionTrend: [
      { week: '2026-08-04', count: 5 }, { week: '2026-08-11', count: 7 }, { week: '2026-08-18', count: 6 }, { week: '2026-08-25', count: 9 },
      { week: '2026-09-01', count: 8 }, { week: '2026-09-08', count: 11 }, { week: '2026-09-15', count: 9 }, { week: '2026-09-22', count: 4 },
    ],
    topCompanies: top(companies), topMaterials: top(mats),
  }
}

function logReport() {
  const columns = [
    { key: 'transmittalId', label: 'Transmittal ID' }, { key: 'recipient', label: 'Recipient' }, { key: 'company', label: 'Company' },
    { key: 'signatureStatus', label: 'Signature Status' }, { key: 'transmittalStatus', label: 'Transmittal Status' }, { key: 'recipientStatus', label: 'Recipient Status' },
    { key: 'reason', label: 'Reason' }, { key: 'warehouseDate', label: 'Warehouse Date' }, { key: 'pickupDeadline', label: 'Pickup Deadline' },
    { key: 'pickupActual', label: 'Pickup Actual' }, { key: 'processingDays', label: 'Processing Days' }, { key: 'pickupStatus', label: 'Pickup Status' }, { key: 'urgencyLevel', label: 'Urgency' },
  ]
  const rows = visibleTransmittals().map((t, i) => ({
    transmittalId: t.rowId, recipient: t.signatureNames.recipient || t.form.applicantName, company: t.form.company,
    signatureStatus: t.status, transmittalStatus: t.transmittalStatus, recipientStatus: t.recipientStatus || '',
    reason: t.form.reason || 'Installation — Building C', warehouseDate: t.form.dateApplication, warehouseWeek: '2026-W38',
    pickupEarliest: '2026-09-20', pickupDeadline: '2026-09-22', pickupActual: t.status === 'Completed' ? (t.form.datePickup || '2026-09-21') : '',
    remark: t.form.remark, comments: t.form.comments, urgencyLevel: t.form.urgencyLevel,
    processingDays: t.status === 'Completed' ? (i % 3) + 1 : null, open: t.transmittalStatus !== 'Closed',
    pickupStatus: ['Late', 'No Show'].includes(t.recipientStatus) ? t.recipientStatus : 'On Time',
    requestedMonth: '2026-09', requestedMonthLabel: 'September 2026',
  }))
  return { columns, rows }
}

// --- write helpers ---------------------------------------------------------

function applyItems(t, items) {
  if (!Array.isArray(items)) return
  for (const upd of items) {
    let row = null
    if (upd.childRowId != null) row = t.items.find(r => String(r.childRowId) === String(upd.childRowId))
    if (!row && upd.partNumber) row = t.items.find(r => r.partNumber === upd.partNumber)
    if (!row) continue
    if ('transferQty' in upd) row.transferQty = upd.transferQty
    if ('remarks' in upd) row.remarks = upd.remarks
    if ('pdRemarks' in upd) row.pdRemarks = upd.pdRemarks
  }
}

function computeRecipientStatus(t) {
  const dp = t.form.datePickup
  if (!dp) return 'Complete'
  const end = new Date(dp + 'T23:59:59')
  return new Date() > end ? 'Late' : 'Complete'
}

function createTransmittal(b) {
  const n = db.seq.transmittal++
  const rowId = 'TR-' + n
  // A system-scoped user's transmittal is locked to their system; an admin can
  // pick it in the form (b.system).
  const u = sessionUser()
  const system = (u && u.system) ? u.system : (b.system || '')
  const items = (b.items || []).map((it, i) => ({
    ...it,
    childRowId: `${rowId}-${i + 1}`,
    system,
    transmittalStatus: 'Open',
    transferQty: (it.transferQty !== '' && it.transferQty != null) ? it.transferQty : it.qty,
    remarks: it.remarks || '',
  }))
  const t = {
    rowId,
    form: {
      company: b.company || '', boq: b.boq || '', dateApplication: b.dateApplication || today(),
      applicationResults: b.applicationResults || '', applicantName: b.applicantName || '', requestorEmail: b.requestorEmail || '',
      dateNeeded: b.dateNeeded || '', datePicking: b.datePicking || '', reason: b.reason || '', pickupLocation: b.pickupLocation || '',
      remark: b.remark || `MIC-${rowId}`, comments: b.comments || '', datePickup: b.datePickup || '',
      urgency: !!b.urgency, urgencyLevel: b.urgencyLevel || '', urgencyReason: b.urgencyReason || '',
      acknowledgeName: '', pickupTimeframe: b.pickupTimeframe || '', system,
    },
    items,
    system,
    status: 'Requester',
    transmittalStatus: 'Open',
    recipientStatus: 'Pending',
    declineReason: '',
    hasRecipientId: false,
    signatureNames: { requester: (b.signatureNames && b.signatureNames.requester) || b.applicantName || '', approver: '', warehouse: '', recipient: '' },
    signatures: { requester: (b.signatures && b.signatures.requester) || sig() },
    pdStage: null,
  }
  db.transmittals.unshift(t)
  persist()
  return t
}

function signTransmittal(t, b) {
  const stage = b.stage
  if (b.signatureDataUrl) t.signatures[stage] = b.signatureDataUrl
  if (b.signatureName) t.signatureNames[stage] = b.signatureName

  if (stage === 'approver') {
    if (b.approverDecision === 'declined') { t.status = 'Declined'; t.declineReason = b.declineReason || '' }
    else { t.status = 'Approver' }
  } else if (stage === 'warehouse') {
    t.status = 'Warehouse'
    if (b.acknowledgeName) { t.form.acknowledgeName = b.acknowledgeName; t.signatureNames.warehouse = b.acknowledgeName }
    if (b.datePickup) t.form.datePickup = b.datePickup
    if (b.pickupLocation) t.form.pickupLocation = b.pickupLocation
    if (b.pickupTimeframe) t.form.pickupTimeframe = b.pickupTimeframe
    applyItems(t, b.items)
  } else if (stage === 'recipient') {
    t.status = 'Completed'; t.transmittalStatus = 'Closed'
    if (b.recipientName) t.signatureNames.recipient = b.recipientName
    if (b.recipientCompanyName) t.recipientCompanyName = b.recipientCompanyName
    if (b.recipientIdImage) t.hasRecipientId = true
    if (b.datePicking) t.form.datePicking = b.datePicking
    applyItems(t, b.items)
    t.recipientStatus = computeRecipientStatus(t)
  }
  persist()
}

// ===========================================================================
// ROUTES
// ===========================================================================

const routes = [
  // --- auth (session-based: login by email switches the active user) ---
  ['GET',  /^\/api\/auth\/me$/,              () => json({ user: sessionUser() })],
  ['POST', /^\/api\/auth\/login$/,           async (_p, init) => {
    const b = await readBody(init)
    const email = String(b.email || '').trim()
    let u = db.users.find(x => x.email.toLowerCase() === email.toLowerCase())
    if (!u) {
      // Forgiving demo: any other email signs in as a guest admin (sees all
      // systems). Use the one-click demo accounts to show system-scoped access.
      const nice = email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Guest User'
      u = { id: 0, name: nice || 'Guest User', email: email || 'guest@teopm.com', company: 'TEOPM', phone: '', role: 'admin', system: null, canManageUsers: false, isActive: true, lastLoginAt: null }
    }
    u.lastLoginAt = new Date().toISOString()
    db.session.user = u; persist()
    return json({ user: u })
  }],
  ['POST', /^\/api\/auth\/logout$/,          () => { db.session.user = null; persist(); return json({}) }],
  ['GET',  /^\/api\/auth\/verify$/,          () => json({ name: 'New User' })],
  ['POST', /^\/api\/auth\/verify$/,          () => json({ message: 'Account activated' })],
  ['POST', /^\/api\/auth\/forgot-password$/, () => json({ message: 'Email sent' })],
  ['GET',  /^\/api\/auth\/reset-password$/,  () => json({ name: (sessionUser() || {}).name || 'User' })],
  ['POST', /^\/api\/auth\/reset-password$/,  () => json({ message: 'Password reset' })],

  // --- users ---
  ['GET',    /^\/api\/users$/,               () => json({ users: db.users, total: db.users.length })],
  ['POST',   /^\/api\/users$/,               async (_p, init) => { const b = await readBody(init); const u = { id: db.seq.user++, name: b.name || '', email: b.email || '', company: b.company || '', phone: b.phone || '', role: b.role || 'warehouse', system: b.system || null, canManageUsers: false, isActive: false, lastLoginAt: null }; db.users.push(u); persist(); return json({ message: 'Invitation sent' }) }],
  ['PATCH',  /^\/api\/users\/(\d+)\/can-manage$/, async (p, init) => { const b = await readBody(init); const u = db.users.find(x => x.id === Number(p[1])); if (u) { u.canManageUsers = !!b.canManageUsers; persist() } return json({ canManageUsers: !!b.canManageUsers }) }],
  ['POST',   /^\/api\/users\/(\d+)\/resend-invite$/, () => json({ message: 'Invite resent' })],
  ['PATCH',  /^\/api\/users\/(\d+)$/,        async (p, init) => { const b = await readBody(init); const u = db.users.find(x => x.id === Number(p[1])); if (u) { Object.assign(u, { name: b.name ?? u.name, company: b.company ?? u.company, phone: b.phone ?? u.phone, role: b.role ?? u.role, isActive: b.isActive ?? u.isActive }); persist() } return json({ message: 'User updated' }) }],
  ['DELETE', /^\/api\/users\/(\d+)$/,        (p) => { db.users = db.users.filter(x => x.id !== Number(p[1])); persist(); return json({ message: 'User deleted' }) }],

  // --- materials catalog (filtered to the signed-in user's system) ---
  ['GET', /^\/api\/materials$/,              () => json(visibleBySystem(materials))],

  // --- transmittal detail + writes (specific paths before the bare :id) ---
  ['GET',   /^\/api\/transmittals\/([^/]+)\/inbound-qty$/,       (p) => { const t = findT(p[1]); const m = {}; if (t) t.items.forEach(it => { m[it.partNumber] = it.qty }); return json(m) }],
  ['GET',   /^\/api\/transmittals\/([^/]+)\/outbound-recorded$/, () => json({})],
  ['POST',  /^\/api\/transmittals\/([^/]+)\/save-inbound$/,      async (p, init) => { const t = findT(p[1]); const b = await readBody(init); if (t) { applyItems(t, b.items); persist() } return json({ message: 'Saved' }) }],
  ['PATCH', /^\/api\/transmittals\/([^/]+)\/save-progress$/,     async (p, init) => { const t = findT(p[1]); const b = await readBody(init); if (t) { if (b.datePicking) t.form.datePicking = b.datePicking; if (b.datePickup) t.form.datePickup = b.datePickup; if (b.acknowledgeName) t.form.acknowledgeName = b.acknowledgeName; if (b.warehouseSignatureDataUrl) t.signatures.warehouse = b.warehouseSignatureDataUrl; applyItems(t, b.items); persist() } return json({ message: 'Progress saved' }) }],
  ['PATCH', /^\/api\/transmittals\/([^/]+)\/no-show$/,           (p) => { const t = findT(p[1]); if (t) { t.recipientStatus = 'No Show'; persist() } return json({ message: 'Marked as no-show' }) }],
  ['POST',  /^\/api\/transmittals\/([^/]+)\/pd-acknowledge$/,    (p) => { const t = findT(p[1]); if (t) { t.pdStage = 'signoff'; persist() } return json({ message: 'Acknowledged', notified: true }) }],
  ['PATCH', /^\/api\/transmittals\/([^/]+)\/update-transfer$/,   async (p, init) => { const t = findT(p[1]); const b = await readBody(init); if (t) { applyItems(t, b.items); t.transmittalStatus = 'Closed'; t.pdStage = null; persist() } return json({ message: 'Updated', allFulfilled: true }) }],
  ['PATCH', /^\/api\/transmittals\/([^/]+)\/sign$/,              async (p, init) => { const t = findT(p[1]); if (!t) return json({ message: 'Not found' }, 404); const b = await readBody(init); signTransmittal(t, b); return json({ message: 'Signed' }) }],
  ['PATCH', /^\/api\/transmittals\/([^/]+)\/remark$/,            async (p, init) => { const t = findT(p[1]); const b = await readBody(init); if (t) { t.form.remark = b.remark || ''; persist() } return json({ message: 'ok' }) }],
  ['PATCH', /^\/api\/transmittals\/([^/]+)\/comments$/,          async (p, init) => { const t = findT(p[1]); const b = await readBody(init); if (t) { t.form.comments = b.comments || ''; persist() } return json({ message: 'ok' }) }],
  ['POST',  /^\/api\/transmittals$/,                             async (_p, init) => { const b = await readBody(init); const t = createTransmittal(b); return json({ message: 'Transmittal submitted', rowId: t.rowId }) }],
  ['GET',   /^\/api\/transmittals\/([^/]+)$/,                    (p) => { const t = findT(p[1]) || db.transmittals[0]; return json(transmittalDetail(t)) }],

  // --- admin dashboard / report ---
  ['GET', /^\/api\/admin\/kpis$/,                                () => json(adminKpis())],
  ['GET', /^\/api\/admin\/transmittals\/([^/]+)\/materials$/,    (p) => { const t = findT(p[1]); return json((t ? t.items : []).map(({ partNumber, type, description, product, qty, transferQty, remarks }) => ({ partNumber, type, description, product, qty, transferQty, remarks }))) }],
  ['GET', /^\/api\/admin\/transmittals$/,                        () => json(visibleTransmittals().map(dashboardRow))],
  ['GET', /^\/api\/admin\/reports\/transmittal-log$/,            () => json(logReport())],

  // --- labels ---
  ['POST', /^\/api\/labels\/print$/,         () => new Response(pdfBlob(), { status: 200, headers: { 'Content-Type': 'application/pdf' } })],

  // --- inbound / Pinnacle Peak ---
  ['GET',  /^\/api\/inbound\/material-statuses$/,   () => json(materialStatuses)],
  ['GET',  /^\/api\/inbound\/materials-list$/,      () => json(visibleBySystem(inboundMaterialsList))],
  ['GET',  /^\/api\/inbound\/materials-picklists$/, () => json(picklists)],
  ['GET',  /^\/api\/inbound\/locations$/,           () => json(inboundLocations)],
  ['GET',  /^\/api\/inbound\/units$/,               () => json(inboundUnits)],
  ['GET',  /^\/api\/inbound\/next-tpn$/,            () => json({ nextTpn: `TPN-00${4500 + db.inbound.length}` })],
  ['POST', /^\/api\/inbound\/quarantine$/,          async (_p, init) => { const b = await readBody(init); addInbound(b, true); return json({ message: 'Material quarantined', failedPhotos: [] }) }],
  ['POST', /^\/api\/inbound$/,                       async (_p, init) => { const b = await readBody(init); const mat = addInbound(b, false); return json({ materialRowId: mat, message: 'Inbound recorded' }) }],
  ['GET',  /^\/api\/inbound$/,                       () => json(visibleBySystem(db.inbound))],

  // --- materials database ---
  ['GET',   /^\/api\/materials-db\/records$/,              () => json({ records: visibleBySystem(db.materialsDb), columns: materialsDbColumns })],
  ['POST',  /^\/api\/materials-db\/picture-urls$/,         () => json({ urls: {} })],
  ['GET',   /^\/api\/materials-db\/([^/]+)\/stock$/,       (p) => { const r = db.materialsDb.find(x => x.rowId === p[1]); return json({ totalInventory: r ? r.totalInventory : 0 }) }],
  ['POST',  /^\/api\/materials-db\/([^/]+)\/adjustments$/, async (p, init) => { const b = await readBody(init); const r = db.materialsDb.find(x => x.rowId === p[1]); if (r) { const d = (b.direction === 'negative' ? -1 : 1) * Number(b.quantity || 0); r.totalInventory = Math.max(0, r.totalInventory + d); r.qtyOnHand = r.totalInventory; r.inventoryStatus = invStatusFor(r.qtyOnHand); persist() } return json({ message: 'Stock adjusted' }) }],
  ['GET',   /^\/api\/materials-db\/([^/]+)\/attachments$/, (p) => { const r = db.materialsDb.find(x => x.rowId === p[1]); const n = r ? r.attachmentCount : 0; const atts = []; for (let i = 0; i < n; i++) atts.push({ id: `att-${p[1]}-${i}`, name: i === 0 ? 'spec-sheet.pdf' : 'mill-cert.pdf', sizeInKb: i === 0 ? 244 : 88, createdBy: 'Marcus Reyes', mimeType: 'application/pdf' }); return json({ attachments: atts }) }],
  ['POST',  /^\/api\/materials-db\/([^/]+)\/attachments$/, (p) => { const r = db.materialsDb.find(x => x.rowId === p[1]); if (r) { r.attachmentCount = (r.attachmentCount || 0) + 1; persist() } return json({ message: 'Uploaded', failed: [] }) }],
  ['DELETE',/^\/api\/materials-db\/([^/]+)\/attachments\/([^/]+)$/, (p) => { const r = db.materialsDb.find(x => x.rowId === p[1]); if (r && r.attachmentCount > 0) { r.attachmentCount--; persist() } return json({ message: 'Deleted' }) }],
  ['POST',  /^\/api\/materials-db\/([^/]+)\/picture$/,     () => json({ picture: { id: 'pic-new' }, message: 'Picture saved' })],
  ['PATCH', /^\/api\/materials-db\/([^/]+)$/,              async (p, init) => { const b = await readBody(init); const r = db.materialsDb.find(x => x.rowId === p[1]); if (r && b.fields) { Object.assign(r, b.fields); persist() } return json({ record: r || (b.fields || {}), message: 'Saved' }) }],

  // --- laydown yard (Smartsheet-backed) ---
  ['GET',  /^\/api\/laydown\/records$/,             () => json(db.laydown)],
  ['GET',  /^\/api\/laydown\/options$/,             () => json(laydownOptions)],
  ['GET',  /^\/api\/laydown\/([^/]+)\/breakdown$/,  (p) => { const parent = db.laydown.find(r => r.rowId === p[1]) || db.laydown[0]; const children = db.laydown.filter(r => r.parentRowId === parent.rowId); return json({ parent, children, nextSequence: children.length + 1 }) }],
  ['POST', /^\/api\/laydown\/([^/]+)\/breakdown$/,  async (p, init) => addLaydownChildren(p[1], await readBody(init))],
  ['POST', /^\/api\/laydown\/([^/]+)\/set-units-outbound$/, async (p, init) => addLaydownChildren(p[1], await readBody(init))],

  // --- rose garden (SQL / backend_v2) ---
  ['GET',  /^\/api\/rosegarden\/next-id$/,          () => json({ nextId: db.seq.laydownPn })],
  ['GET',  /^\/api\/rosegarden\/mic-part-numbers$/, () => json(rgMicPartNumbers)],
  ['GET',  /^\/api\/rosegarden\/materials$/,        () => json(db.laydown)],
  ['GET',  /^\/api\/rosegarden\/options$/,          () => json(rgOptions)],
  ['POST', /^\/api\/rosegarden\/materials$/,        () => { const n = db.seq.laydownPn++; const pn = 'LDYPN-' + String(n).padStart(5, '0'); return json({ message: 'Delivery recorded', partNumber: pn }) }],

  // --- catalogues ---
  ['GET',  /^\/api\/catalogues\/rosegarden\/locations$/, () => json(rgLocations)],
  ['GET',  /^\/api\/catalogues\/rosegarden\/brands$/,    () => json(rgBrands)],
  ['GET',  /^\/api\/catalogues\/rosegarden\/chemicals$/, () => json(rgChemicals)],
  ['GET',  /^\/api\/catalogues\/systems$/,               () => json(rgSystems)],
  ['POST', /^\/api\/catalogues\/rosegarden\/([^/]+)$/,   () => json({ message: 'Added' })],
]

function addInbound(b, quarantine) {
  const n = db.seq.inbound++
  const tpn = b.tpn || `TPN-00${4500 + db.inbound.length}`
  const u = sessionUser()
  const system = (u && u.system) ? u.system : (b.system || '')
  const rec = {
    rowId: `INB-${n}`, tpn, barcodeTpn: tpn, transmittalId: '', system,
    description1: b.description1 || '', description2: b.description2 || '', micPartNumber: b.micPartNumber || '',
    batch: b.batch || '', qty: Number(b.quantity || 0), unit: b.unit || '', location: Array.isArray(b.location) ? b.location : (b.location ? [b.location] : []),
    condition: b.condition || (quarantine ? 'Damaged' : 'New'), remark: b.remarks || '', type: b.type || '', spec: b.spec || '',
    brand: b.brand || '', category: b.category || '', supplier: b.supplier || '',
  }
  db.inbound.unshift(rec)
  let matRowId = null
  if (b.createNewMaterial) {
    matRowId = `MDB-${200 + db.materialsDb.length}`
    const qty = Number(b.quantity || 0)
    db.materialsDb.unshift({
      rowId: matRowId, tpn, description1: b.description1 || '', description2: b.description2 || '', micPartNumber: b.micPartNumber || '',
      type: b.type || '', spec: b.spec || '', brand: b.brand || '', supplier: b.supplier || '', category: b.category || '',
      unit: b.unit || '', location: Array.isArray(b.location) ? b.location.join(', ') : (b.location || ''), remark: b.remarks || '',
      inventoryStatus: invStatusFor(qty), qtyOnHand: qty, totalInventory: qty, attachmentCount: 0, picture: null, barcode: null, system,
    })
  }
  persist()
  return matRowId
}

function addLaydownChildren(parentId, b) {
  const parent = db.laydown.find(r => r.rowId === parentId)
  const created = []
  const existing = db.laydown.filter(r => r.parentRowId === parentId).length
  ;(b.children || []).forEach((c, i) => {
    const seq = existing + i + 1
    const n = db.seq.laydown++
    const pn = parent ? `${parent.partNumber}-${String(seq).padStart(2, '0')}` : `LDYPN-${String(n).padStart(5, '0')}`
    const row = {
      rowId: `LY-${n}`, parentRowId: parentId, partNumber: pn, micPartNumber: c.micPartNumber || (parent && parent.micPartNumber) || '',
      breakdownCode: pn, chemical: c.chemical || '', description: c.description || '', qty: Number(c.qty || 0),
      location: c.location || '', containerNumber: c.containerNumber || '', packageType: c.packageType || '', poNumber: c.poNumber || '',
      arrivalDate: c.arrivalDate || today(), parentMicPartNumber: parent && parent.micPartNumber, parentPartNumber: parent && parent.partNumber,
      parentChemical: parent && parent.chemical, comments: c.comments || '', barcodeValue: pn,
    }
    db.laydown.push(row)
    created.push(row)
  })
  persist()
  return json({ message: 'Set units created', children: created, outboundFailed: false })
}

// ===========================================================================
// INTERCEPTOR
// ===========================================================================

window.fetch = async function (input, init = {}) {
  const url = typeof input === 'string' ? input : (input && input.url) || ''
  const method = ((init && init.method) || (typeof input === 'object' && input.method) || 'GET').toUpperCase()

  let pathname = url
  try { pathname = new URL(url, window.location.origin).pathname } catch { /* keep raw */ }

  if (!pathname.startsWith('/api/')) return realFetch(input, init)

  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue
    const match = pattern.exec(pathname)
    if (!match) continue
    try {
      const result = await handler(match, init)
      return result instanceof Response ? result : json(result)
    } catch (err) {
      return json({ message: String((err && err.message) || err) }, 500)
    }
  }
  console.warn(`[mock] no handler for ${method} ${pathname}`)
  return json({ message: 'Mock: endpoint not implemented' }, 404)
}

// ===========================================================================
// DEMO CONTROL PANEL (Export / Import / Reset / Save-to-folder)
// ===========================================================================

let savedFlashEl = null
function flashSaved() {
  if (!savedFlashEl) return
  savedFlashEl.textContent = 'Saved ' + new Date().toLocaleTimeString()
  savedFlashEl.style.opacity = '1'
  clearTimeout(flashSaved._t)
  flashSaved._t = setTimeout(() => { if (savedFlashEl) savedFlashEl.style.opacity = '0.55' }, 1200)
}

function downloadState() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'wms-demo-state.json'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

function importState() {
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = 'application/json,.json'
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result))
        if (!parsed || !Array.isArray(parsed.transmittals)) throw new Error('Not a WMS demo state file')
        db = parsed
        try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
        location.reload()
      } catch (e) { alert('Could not import: ' + e.message) }
    }
    r.readAsText(f)
  }
  inp.click()
}

function resetState() {
  if (!confirm('Reset the demo to its original sample data? Your changes will be lost.')) return
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
  db = seedDb()
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* ignore */ }
  location.reload()
}

async function connectFolder() {
  if (!window.showDirectoryPicker) { alert('Your browser does not support saving to a folder. Use "Export JSON" instead.'); return }
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    await writeToFolder()
    alert('Connected. The demo now auto-saves wms-demo-state.json to that folder on every change (this session).')
    flashSaved()
  } catch { /* user cancelled */ }
}

function mountPanel() {
  if (document.getElementById('wms-demo-panel')) return
  const wrap = document.createElement('div')
  wrap.id = 'wms-demo-panel'
  wrap.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;font-family:Segoe UI,Tahoma,sans-serif;'

  const btn = (label, title) => {
    const b = document.createElement('button')
    b.textContent = label; b.title = title || ''
    b.style.cssText = 'display:block;width:100%;text-align:left;margin:3px 0;padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#334155;font-size:12px;font-weight:600;cursor:pointer;'
    b.onmouseover = () => { b.style.background = '#f8fafc'; b.style.color = '#dc2626' }
    b.onmouseout = () => { b.style.background = '#fff'; b.style.color = '#334155' }
    return b
  }

  const card = document.createElement('div')
  card.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 6px 24px rgba(15,23,42,.14);padding:10px;width:190px;display:none;'
  const head = document.createElement('div')
  head.innerHTML = '<div style="font-size:12px;font-weight:800;color:#0f172a">Demo data</div>'
  const sub = document.createElement('div'); sub.textContent = 'saved in this browser'
  sub.style.cssText = 'font-size:10px;color:#94a3b8;margin-bottom:6px'
  savedFlashEl = document.createElement('div')
  savedFlashEl.style.cssText = 'font-size:10px;color:#059669;opacity:.55;margin-top:4px;transition:opacity .3s'
  savedFlashEl.textContent = 'saved locally'

  const bExport = btn('⤓  Export JSON', 'Download the whole demo state as wms-demo-state.json')
  const bImport = btn('⤒  Import JSON', 'Load a previously exported wms-demo-state.json')
  const bFolder = btn('🗀  Save to folder…', 'Auto-save the JSON to a folder you pick (Chrome/Edge)')
  const bReset  = btn('↺  Reset demo', 'Restore the original sample data')
  bExport.onclick = downloadState
  bImport.onclick = importState
  bFolder.onclick = connectFolder
  bReset.onclick = resetState
  if (!window.showDirectoryPicker) bFolder.style.display = 'none'

  card.append(head, sub, bExport, bImport, bFolder, bReset, savedFlashEl)

  const toggle = document.createElement('button')
  toggle.textContent = '● Demo'
  toggle.title = 'Demo data controls'
  toggle.style.cssText = 'margin-top:6px;float:right;padding:6px 12px;border:none;border-radius:999px;background:#dc2626;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(220,38,38,.35);'
  toggle.onclick = () => { card.style.display = card.style.display === 'none' ? 'block' : 'none' }

  wrap.append(card, toggle)
  document.body.appendChild(wrap)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPanel)
else mountPanel()

console.info('%c[WMS mockup] Stateful API active — sample data persists in localStorage. Full transmittal lifecycle simulated.', 'color:#dc2626;font-weight:bold')
