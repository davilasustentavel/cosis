const routes = {}
let _notFound = null
let _dispatch = null

export function route(path, handler) {
  routes[path] = handler
}

export function notFound(handler) {
  _notFound = handler
}

export function navigate(path) {
  if (window.location.hash === `#${path}`) {
    _dispatch?.()
  } else {
    window.location.hash = path
  }
}

export function startRouter() {
  _dispatch = () => {
    const path = window.location.hash.slice(1) || '/'
    const handler = routes[path] ?? _notFound
    if (handler) handler(path)
  }
  window.addEventListener('hashchange', _dispatch)
  _dispatch()
}
