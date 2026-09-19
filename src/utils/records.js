function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return value !== '' && value !== null && value !== undefined
}

export function filled(record) {
  const result = {}

  for (const [key, value] of Object.entries(record ?? {})) {
    if (hasValue(value)) {
      result[key] = value
    }
  }

  return result
}

export function mergeByTpn(catalogRows = [], inboundRows = []) {
  const byTpn = new Map()

  for (const material of catalogRows) {
    if (!material.tpn) continue
    byTpn.set(material.tpn, { ...material })
  }

  for (const inbound of inboundRows) {
    if (!inbound.tpn) continue

    const fromCatalog = byTpn.get(inbound.tpn) ?? {}
    byTpn.set(inbound.tpn, { ...fromCatalog, ...filled(inbound) })
  }

  return [...byTpn.values()]
}
