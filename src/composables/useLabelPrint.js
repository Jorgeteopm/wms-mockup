// PRESENTATION MOCKUP — client-side label printing.
//
// The real app POSTs to /api/labels/print and the backend renders a 4x6 PDF via
// Puppeteer. There is no backend here, so this builds a proper 4x6 label in the
// browser (barcode via JsBarcode, same CODE39 as the on-screen preview) and
// sends it to the print dialog — so labels look real in the demo, offline.
import JsBarcode from 'jsbarcode'

function esc(s) {
  return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

function fmtDate(iso) {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d)) return esc(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function asText(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ')
  return v == null ? '' : String(v)
}

function barcodeSvg(value) {
  const v = String(value ?? '').trim()
  if (!v) return '<div style="height:64px"></div>'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  try {
    JsBarcode(svg, v, { format: 'CODE39', width: 2, height: 60, displayValue: true, margin: 0, fontSize: 15 })
    return svg.outerHTML
  } catch {
    return `<div style="font-family:monospace;font-size:14px">${esc(v)}</div>`
  }
}

// options: array of strings (+ `selected`) OR array of { label, checked }
function condRow(options, selected) {
  const opts = (options || []).map(o => (typeof o === 'string' ? { label: o, checked: o === selected } : o))
  if (!opts.length) return ''
  return `<div class="cond-row">${opts.map(o =>
    `<span class="cond"><span class="box">${o.checked ? 'X' : ''}</span>${esc(o.label)}</span>`).join('')}</div>`
}

function cellFull(label, value, cls = '') {
  return `<tr><td colspan="2"><span class="f-label">${esc(label)}</span><span class="f-value ${cls}">${esc(value) || '&nbsp;'}</span></td></tr>`
}
function cellPair(l1, v1, l2, v2, cls2 = '') {
  return `<tr>` +
    `<td><span class="f-label">${esc(l1)}</span><span class="f-value">${esc(v1) || '&nbsp;'}</span></td>` +
    `<td><span class="f-label">${esc(l2)}</span><span class="f-value ${cls2}">${esc(v2) || '&nbsp;'}</span></td>` +
    `</tr>`
}

// Build the list of individual labels ({ title, barcode, fieldsHtml, condHtml, footerCode }).
function buildLabels(payload, template) {
  const labels = []
  const push = (o) => labels.push(o)

  if (template === 'laydown') {
    const qtys = (payload.quantities && payload.quantities.length) ? payload.quantities : [payload.qty || '']
    qtys.forEach((q) => push({
      title: 'EQUIPMENT RECEIVING',
      barcode: payload.barcodeValue,
      fieldsHtml:
        cellPair('Chemical', payload.chemical, 'Qty', q, 'big') +
        cellFull('Description', payload.description, 'desc') +
        cellPair('Supplier', payload.supplier, 'Arrival Date', fmtDate(payload.arrivalDate)) +
        cellPair('Location', asText(payload.location), 'Container #', payload.containerNumber) +
        cellPair('Package Type', payload.packageType, 'MIC Part #', payload.micPartNumber),
      condHtml: condRow(payload.conditionOptions, payload.condition),
      footerCode: payload.barcodeValue,
    }))
  } else if (template === 'breakdown') {
    const codes = payload.barcodeValues || []
    const pages = payload.pageFields || []
    codes.forEach((code, i) => {
      const f = pages[i] || {}
      const q = (payload.quantities || [])[i]
      push({
        title: 'SET UNIT',
        barcode: code,
        fieldsHtml:
          cellPair('Parent MIC #', payload.parentMicPartNumber, 'Qty', q, 'big') +
          cellFull('Chemical', f.chemical || payload.parentChemical) +
          cellFull('Description', f.description, 'desc') +
          cellPair('Supplier', f.supplier, 'Arrival Date', fmtDate(f.arrivalDate)) +
          cellPair('Location', asText(f.location), 'Container #', f.containerNumber) +
          cellPair('Package Type', f.packageType, 'Comments', f.comments),
        condHtml: condRow(f.conditionOptions),
        footerCode: code,
      })
    })
  } else {
    // receiving
    const qtys = (payload.quantities && payload.quantities.length) ? payload.quantities : [payload.qty || '']
    qtys.forEach((q) => push({
      title: 'MATERIAL RECEIVING',
      barcode: payload.tpn,
      fieldsHtml:
        cellFull('Date Received', fmtDate(payload.dateReceived)) +
        cellFull('Description', payload.description1, 'desc') +
        cellFull('Description 2', payload.description2, 'desc') +
        cellPair('MIC Part Number', payload.micPartNumber, 'Qty / Unit', `${q ?? ''} ${payload.unit || ''}`.trim(), 'big') +
        cellPair('Batch #', payload.batch, 'Location', asText(payload.location)),
      condHtml: condRow(payload.conditionOptions, payload.condition),
      footerCode: payload.tpn ? `TPN ${payload.tpn}` : '',
    }))
  }
  return labels.length ? labels : [{ title: 'LABEL', barcode: '', fieldsHtml: '', condHtml: '', footerCode: '' }]
}

const LABEL_CSS = `
  @page { size: 4in 6in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: 'Segoe UI', Tahoma, sans-serif; color: #0f172a; }
  .label { width: 4in; height: 6in; padding: 0.22in; page-break-after: always; display: flex; flex-direction: column; overflow: hidden; }
  .label:last-child { page-break-after: auto; }
  .lbl-header { display: flex; align-items: center; gap: 10px; border-bottom: 3px solid #285f8c; padding-bottom: 8px; }
  .mic { font-weight: 800; color: #285f8c; font-size: 30px; letter-spacing: 1px; }
  .lbl-title { font-weight: 800; font-size: 15px; line-height: 1.05; text-align: right; margin-left: auto; }
  .lbl-barcode { text-align: center; margin: 12px 0 6px; }
  .lbl-barcode svg { max-width: 100%; height: auto; }
  table.lbl-fields { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .lbl-fields td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; width: 50%; }
  .f-label { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  .f-value { display: block; font-size: 13px; font-weight: 600; }
  .f-value.big { font-size: 17px; }
  .f-value.desc { font-size: 13.5px; }
  .cond-wrap { border: 1px solid #e2e8f0; border-top: 0; padding: 6px 8px; }
  .cond-wrap .f-label { margin-bottom: 3px; }
  .cond-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .cond { font-size: 10.5px; display: flex; align-items: center; gap: 4px; }
  .box { display: inline-block; width: 13px; height: 13px; border: 1px solid #334155; text-align: center; line-height: 12px; font-size: 10px; font-weight: 700; }
  .lbl-footer { margin-top: auto; display: flex; justify-content: space-between; gap: 6px; font-size: 8.5px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
`

function labelMarkup(l, i, total) {
  return `<div class="label">
    <div class="lbl-header"><span class="mic">WMS</span><div class="lbl-title">${esc(l.title).replace(' ', '<br>')}</div></div>
    <div class="lbl-barcode">${barcodeSvg(l.barcode)}</div>
    <table class="lbl-fields"><tbody>${l.fieldsHtml}</tbody></table>
    ${l.condHtml ? `<div class="cond-wrap"><span class="f-label">Condition on Receipt</span>${l.condHtml}</div>` : ''}
    <div class="lbl-footer"><span>WMS v1.0</span><span>LABEL ${i + 1}/${total}</span><span>${esc(l.footerCode)}</span></div>
  </div>`
}

export async function printLabelPdf(payload, template = 'receiving') {
  const labels = buildLabels(payload || {}, template)
  const total = labels.length
  const body = labels.map((l, i) => labelMarkup(l, i, total)).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Labels</title><style>${LABEL_CSS}</style></head><body>${body}</body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;'
  await new Promise((resolve) => {
    let done = false
    iframe.onload = () => {
      if (done) return          // ignore any initial about:blank load
      done = true
      setTimeout(() => {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print() }
        catch (err) { console.error('[Label] print failed:', err) }
        setTimeout(() => iframe.remove(), 1500)
        resolve()
      }, 250)
    }
    iframe.srcdoc = html        // set content BEFORE appending so onload carries it
    document.body.appendChild(iframe)
  })
}
