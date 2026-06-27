export function toast(msg, type = '') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  const el = document.createElement('div')
  el.className = `toast${type ? ' toast-' + type : ''}`
  el.textContent = msg
  container.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

export function openModal(id) {
  document.getElementById(id)?.classList.add('open')
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open')
}

export function setLoading(btnEl, loading) {
  if (loading) {
    btnEl.dataset.original = btnEl.textContent
    btnEl.disabled = true
    btnEl.textContent = 'Aguarde…'
  } else {
    btnEl.disabled = false
    btnEl.textContent = btnEl.dataset.original ?? btnEl.textContent
  }
}
