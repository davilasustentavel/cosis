import { sb } from '../supabase.js'
import { renderLayout } from '../layout.js'

const TIPO = {
  1: { label: 'Tipo 01 — Escola', cls: 'chip-tipo1' },
  2: { label: 'Tipo 02 — Órgão / Assoc.', cls: 'chip-tipo2' },
}

export async function renderInstituicoes() {
  const main = renderLayout('instituicoes')
  main.innerHTML = `
    <p class="page-title">Instituições</p>
    <p class="page-subtitle">591 instituições cadastradas nos estados MA, RN e CE — Contrato Petrobras 5900.0127373.24.2</p>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input id="search" type="text" placeholder="Buscar por nome, município, localidade…">
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Lista de Instituições</span>
        <span id="count-label" class="text-muted" style="font-size:12px"></span>
      </div>
      <div class="card-body">
        <div id="table-wrap">
          <div class="loading"><div class="spinner"></div> Carregando…</div>
        </div>
      </div>
    </div>

    <!-- Drawer overlay -->
    <div class="drawer-overlay" id="inst-drawer-overlay">
      <div class="drawer" id="inst-drawer">
        <div class="drawer-header">
          <div class="drawer-header-content">
            <div class="drawer-kicker" id="drawer-kicker">Instituição</div>
            <div class="drawer-title" id="drawer-title">—</div>
          </div>
          <button class="drawer-close" id="drawer-close-btn" aria-label="Fechar">✕</button>
        </div>
        <div class="drawer-body" id="drawer-body"></div>
      </div>
    </div>
  `

  let allRows = []
  let query = ''

  async function load() {
    const { data, error } = await sb
      .from('instituicoes')
      .select(`
        id, item, nome, tipo_evento, categoria_adm, dependencia_adm,
        porte_escola, etapas_ensino, endereco, cod_inep,
        coord_lat, coord_lon, utm_norte, utm_leste, utm_zona, ativa,
        municipios(nome, estados(sigla, nome)),
        localidades(nome)
      `)
      .order('item')

    if (error) console.error(error)
    allRows = data ?? []
    render(allRows)
  }

  function render(rows) {
    document.getElementById('count-label').textContent = `${rows.length} registros`
    if (!rows.length) {
      document.getElementById('table-wrap').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏫</div>
          <div class="empty-text">Nenhuma instituição encontrada</div>
        </div>`
      return
    }
    document.getElementById('table-wrap').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Tipo de Evento</th>
            <th>Categoria</th>
            <th>Localidade</th>
            <th>Município / UF</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const tipo = TIPO[r.tipo_evento] ?? { label: `Tipo ${r.tipo_evento}`, cls: 'chip-gray' }
            return `
            <tr>
              <td style="color:var(--text3);font-size:12px">${r.item}</td>
              <td>
                <a class="inst-link" data-id="${r.id}">${r.nome}</a>
              </td>
              <td><span class="chip ${tipo.cls}">${tipo.label}</span></td>
              <td>${r.categoria_adm ?? '—'}</td>
              <td>${r.localidades?.nome ?? '—'}</td>
              <td>${r.municipios?.nome ?? '—'} / ${r.municipios?.estados?.sigla ?? '—'}</td>
              <td>${r.ativa
                ? '<span class="chip chip-green">Ativa</span>'
                : '<span class="chip chip-gray">Desativada</span>'
              }</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>`

    // Delegação de eventos nos links
    document.getElementById('table-wrap').addEventListener('click', e => {
      const link = e.target.closest('.inst-link')
      if (!link) return
      const row = allRows.find(r => String(r.id) === link.dataset.id)
      if (row) openDrawer(row)
    })
  }

  function openDrawer(r) {
    const tipo = TIPO[r.tipo_evento] ?? { label: `Tipo ${r.tipo_evento}`, cls: '' }
    const mun = r.municipios?.nome ?? '—'
    const uf = r.municipios?.estados?.sigla ?? ''
    const estado = r.municipios?.estados?.nome ?? ''
    const localidade = r.localidades?.nome ?? '—'

    document.getElementById('drawer-kicker').textContent = `Item #${r.item} · ${uf}`
    document.getElementById('drawer-title').textContent = r.nome

    document.getElementById('drawer-body').innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Classificação</div>
        <div class="drawer-grid">
          <div class="drawer-field">
            <span class="drawer-field-label">Tipo de Evento</span>
            <span class="drawer-field-value"><span class="chip ${tipo.cls}">${tipo.label}</span></span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Status</span>
            <span class="drawer-field-value">${r.ativa
              ? '<span class="chip chip-green">Ativa</span>'
              : '<span class="chip chip-gray">Desativada</span>'
            }</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Categoria Adm.</span>
            <span class="drawer-field-value">${r.categoria_adm ?? '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Dependência Adm.</span>
            <span class="drawer-field-value">${r.dependencia_adm ?? '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Porte</span>
            <span class="drawer-field-value">${r.porte_escola ?? '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Cód. INEP</span>
            <span class="drawer-field-value mono">${r.cod_inep ?? '—'}</span>
          </div>
        </div>
      </div>

      ${r.etapas_ensino ? `
      <div class="drawer-section">
        <div class="drawer-section-title">Etapas de Ensino</div>
        <div class="drawer-grid cols-1">
          <div class="drawer-field">
            <span class="drawer-field-value">${r.etapas_ensino}</span>
          </div>
        </div>
      </div>` : ''}

      <div class="drawer-section">
        <div class="drawer-section-title">Localização</div>
        <div class="drawer-grid">
          <div class="drawer-field">
            <span class="drawer-field-label">Estado</span>
            <span class="drawer-field-value">${estado} (${uf})</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Município</span>
            <span class="drawer-field-value">${mun}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Localidade</span>
            <span class="drawer-field-value">${localidade}</span>
          </div>
          ${r.endereco ? `
          <div class="drawer-field cols-1" style="grid-column:1/-1">
            <span class="drawer-field-label">Endereço</span>
            <span class="drawer-field-value">${r.endereco}</span>
          </div>` : ''}
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Coordenadas</div>
        <div class="drawer-grid">
          <div class="drawer-field">
            <span class="drawer-field-label">Latitude</span>
            <span class="drawer-field-value mono">${r.coord_lat != null ? r.coord_lat.toFixed(6) : '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Longitude</span>
            <span class="drawer-field-value mono">${r.coord_lon != null ? r.coord_lon.toFixed(6) : '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">UTM Norte</span>
            <span class="drawer-field-value mono">${r.utm_norte != null ? r.utm_norte.toFixed(2) : '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">UTM Leste</span>
            <span class="drawer-field-value mono">${r.utm_leste != null ? r.utm_leste.toFixed(2) : '—'}</span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Zona UTM</span>
            <span class="drawer-field-value mono">${r.utm_zona ?? '—'}</span>
          </div>
        </div>
      </div>
    `

    const overlay = document.getElementById('inst-drawer-overlay')
    overlay.classList.add('open')
  }

  // Fechar drawer
  document.getElementById('drawer-close-btn').addEventListener('click', closeDrawer)
  document.getElementById('inst-drawer-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDrawer()
  })
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer()
  })

  function closeDrawer() {
    document.getElementById('inst-drawer-overlay')?.classList.remove('open')
  }

  // Busca
  document.getElementById('search').addEventListener('input', e => {
    query = e.target.value.toLowerCase()
    const filtered = allRows.filter(r =>
      r.nome.toLowerCase().includes(query) ||
      (r.municipios?.nome ?? '').toLowerCase().includes(query) ||
      (r.localidades?.nome ?? '').toLowerCase().includes(query) ||
      (r.categoria_adm ?? '').toLowerCase().includes(query)
    )
    render(filtered)
  })

  load()
}
