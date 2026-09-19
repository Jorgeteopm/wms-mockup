// Posts label data to the backend, which renders it to a 4x6 PDF via Puppeteer,
// then silently prints the returned PDF through a hidden iframe.
export async function printLabelPdf(payload, template = 'receiving') {
  const res = await fetch('/api/labels/print', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, template })
  })
  if (!res.ok) throw new Error('Failed to generate label.')
  const blob = await res.blob()
  if (blob.type !== 'application/pdf') throw new Error('Server did not return a PDF.')

  // Web Share is Android-only here - Windows/Chrome also implements navigator.share, horrible stuff btw
  // and its share sheet is just an annoying extra step there, not a real fallback need.
  const isAndroid = /Android/i.test(navigator.userAgent)
  const file = new File([blob], 'receiving-label.pdf', { type: 'application/pdf' })
  if (isAndroid && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if (e?.name === 'AbortError') return 
    }
  }

  const url = URL.createObjectURL(blob)

  // Fallback for Android without file-sharing support: open the PDF in a new tab
  // so the browser's own PDF viewer print/share button works.
  if (isAndroid) {
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '1024px'
  iframe.style.height = '768px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'

  iframe.onload = () => {
    // Firefox/Chrome's built-in PDF viewer needs a beat to finish
    // parsing after the iframe's own load event before print() is safe.
    setTimeout(() => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (err) {
        // Rather than fail silently, hand the PDF over so the label can still be printed
        // from the browser's own viewer. this is so jank af, but works, most of the time xd
        console.error('[Label] Could not print from the hidden frame:', err)
        window.open(url, '_blank')
      }
    }, 300)
  }

  document.body.appendChild(iframe)
  iframe.src = url

  setTimeout(() => {
    URL.revokeObjectURL(url)
    iframe.remove()
  }, 60000)
}
