const routes = {}
let _notFound = null

export function route(path, handler) {
  routes[path] = handler
}

export function notFound(handler) {
  _notFound = handler
}

export function navigate(path) {
  window.location.hash = path
}

export function startRouter() {
  const dispatch = () => {
    const path = window.location.hash.slice(1) || '/'
    const handler = routes[path] ?? _notFound
    if (handler) handler(path)
  }
  window.addEventListener('hashchange', dispatch)
  dispatch()
}
