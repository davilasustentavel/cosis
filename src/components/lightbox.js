export function abrirLightbox(fotos, indiceInicial = 0) {
  const existing = document.getElementById('lightbox-overlay')
  if (existing) existing.remove()

  let idx = indiceInicial

  const overlay = document.createElement('div')
  overlay.id = 'lightbox-overlay'
  overlay.className = 'lightbox-overlay'
  overlay.innerHTML = `
    <button class="lightbox-close" id="lb-close">✕</button>
    <button class="lightbox-nav lightbox-prev" id="lb-prev">‹</button>
    <div class="lightbox-content">
      <img id="lb-img" src="" alt="">
      <div class="lightbox-counter" id="lb-counter"></div>
    </div>
    <button class="lightbox-nav lightbox-next" id="lb-next">›</button>
  `
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))

  function show(i) {
    idx = (i + fotos.length) % fotos.length
    document.getElementById('lb-img').src = fotos[idx]
    document.getElementById('lb-counter').textContent = `${idx + 1} / ${fotos.length}`
    document.getElementById('lb-prev').style.display = fotos.length > 1 ? '' : 'none'
    document.getElementById('lb-next').style.display = fotos.length > 1 ? '' : 'none'
  }

  const fechar = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
  document.getElementById('lb-close').addEventListener('click', fechar)
  document.getElementById('lb-prev').addEventListener('click', () => show(idx - 1))
  document.getElementById('lb-next').addEventListener('click', () => show(idx + 1))
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar() })

  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'ArrowLeft')  show(idx - 1)
    if (e.key === 'ArrowRight') show(idx + 1)
    if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', handler) }
  })

  show(idx)
}
