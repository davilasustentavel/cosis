import { sb } from '../supabase.js'
import { renderLayout } from '../layout.js'

const TIPO_LABEL = { 1: 'Tipo 01 — Escola', 2: 'Tipo 02 — Órgão / Assoc.' }
const TIPO_CLS   = { 1: 'chip-tipo1', 2: 'chip-tipo2' }

export async function renderInstituicoes() {
  const main = renderLayout('instituicoes')
  main.innerHTML = `
    <p class="page-title">Instituições</p>
    <p class="page-subtitle">591 instituições cadastradas nos estados MA, RN e CE — Contrato Petrobras 5900.0127373.24.2</p>

    <div class="filter-bar">
      <div class="search-input-wrap" style="flex:2;min-width:200px">
        <span class="search-icon">🔍</span>
        <input id="search" type="text" placeholder="Buscar por nome, localidade…">
      </div>
      <select id="f-tipo">
        <option value="">Tipo (todos)</option>
        <option value="1">Tipo 1 — Escola</option>
        <option value="2">Tipo 2 — Órgão / Assoc.</option>
      </select>
      <select id="f-uf">
        <option value="">UF (todas)</option>
      </select>
      <select id="f-municipio">
        <option value="">Município (todos)</option>
      </select>
      <select id="f-status">
        <option value="">Status (todos)</option>
        <option value="1">Ativa</option>
        <option value="0">Desativada</option>
      </select>
      <button class="btn btn-ghost btn-sm" id="btn-limpar">Limpar</button>
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

    <!-- Drawer -->
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
  let filteredRows = []

  // ── Carregar dados ──────────────────────────────────────────
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
    populateFilterOptions()
    applyFilters()
  }

  // ── Popular selects de UF e Município ───────────────────────
  function populateFilterOptions() {
    const ufs = [...new Map(
      allRows
        .filter(r => r.municipios?.estados)
        .map(r => [r.municipios.estados.sigla, r.municipios.estados.nome])
    )].sort((a, b) => a[0].localeCompare(b[0]))

    const fUf = document.getElementById('f-uf')
    ufs.forEach(([sigla, nome]) => {
      const o = document.createElement('option')
      o.value = sigla
      o.textContent = `${sigla} — ${nome}`
      fUf.appendChild(o)
    })
  }

  function populateMunicipios(uf) {
    const fMun = document.getElementById('f-municipio')
    fMun.innerHTML = '<option value="">Município (todos)</option>'
    const muns = [...new Set(
      allRows
        .filter(r => !uf || r.municipios?.estados?.sigla === uf)
        .map(r => r.municipios?.nome)
        .filter(Boolean)
    )].sort()
    muns.forEach(m => {
      const o = document.createElement('option')
      o.value = m
      o.textContent = m
      fMun.appendChild(o)
    })
  }

  // ── Filtrar ────────────────────────────────────────────────
  function applyFilters() {
    const texto = document.getElementById('search').value.toLowerCase()
    const tipo  = document.getElementById('f-tipo').value
    const uf    = document.getElementById('f-uf').value
    const mun   = document.getElementById('f-municipio').value
    const status = document.getElementById('f-status').value

    filteredRows = allRows.filter(r => {
      if (tipo   && String(r.tipo_evento) !== tipo) return false
      if (uf     && r.municipios?.estados?.sigla !== uf) return false
      if (mun    && r.municipios?.nome !== mun) return false
      if (status === '1' && !r.ativa) return false
      if (status === '0' &&  r.ativa) return false
      if (texto) {
        const haystack = [r.nome, r.municipios?.nome, r.localidades?.nome, r.categoria_adm]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(texto)) return false
      }
      return true
    })
    render(filteredRows)
  }

  // ── Renderizar tabela ──────────────────────────────────────
  function render(rows) {
    const total = allRows.length
    const n = rows.length
    document.getElementById('count-label').textContent =
      n === total ? `${n} registros` : `${n} de ${total} registros`

    if (!rows.length) {
      document.getElementById('table-wrap').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏫</div>
          <div class="empty-text">Nenhuma instituição encontrada</div>
          <div class="empty-sub">Ajuste os filtros para ampliar a busca</div>
        </div>`
      return
    }

    document.getElementById('table-wrap').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th style="text-align:center">Tipo</th>
            <th style="text-align:center">Categoria</th>
            <th style="text-align:center">Localidade</th>
            <th style="text-align:center">Município</th>
            <th style="text-align:center">UF</th>
            <th style="text-align:center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td style="color:var(--text3);font-size:12px">${r.item}</td>
              <td><a class="inst-link" data-id="${r.id}">${r.nome}</a></td>
              <td style="text-align:center;font-weight:700;color:var(--text2)">${r.tipo_evento ?? '—'}</td>
              <td style="text-align:center">${r.categoria_adm ?? '—'}</td>
              <td style="text-align:center">${r.localidades?.nome ?? '—'}</td>
              <td style="text-align:center">${r.municipios?.nome ?? '—'}</td>
              <td style="text-align:center;font-weight:700">${r.municipios?.estados?.sigla ?? '—'}</td>
              <td style="text-align:center">${r.ativa
                ? '<span class="chip chip-green">Ativa</span>'
                : '<span class="chip chip-gray">Desativada</span>'
              }</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`

    document.getElementById('table-wrap').addEventListener('click', e => {
      const link = e.target.closest('.inst-link')
      if (!link) return
      const row = allRows.find(r => String(r.id) === link.dataset.id)
      if (row) openDrawer(row)
    })
  }

  // ── Drawer ─────────────────────────────────────────────────
  function openDrawer(r) {
    const tipo = TIPO_LABEL[r.tipo_evento] ?? `Tipo ${r.tipo_evento}`
    const tipoCls = TIPO_CLS[r.tipo_evento] ?? 'chip-gray'
    const mun  = r.municipios?.nome ?? '—'
    const uf   = r.municipios?.estados?.sigla ?? ''
    const estado = r.municipios?.estados?.nome ?? ''

    document.getElementById('drawer-kicker').textContent = `Item #${r.item} · ${uf}`
    document.getElementById('drawer-title').textContent  = r.nome

    document.getElementById('drawer-body').innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Classificação</div>
        <div class="drawer-grid">
          <div class="drawer-field">
            <span class="drawer-field-label">Tipo de Evento</span>
            <span class="drawer-field-value"><span class="chip ${tipoCls}">${tipo}</span></span>
          </div>
          <div class="drawer-field">
            <span class="drawer-field-label">Status</span>
            <span class="drawer-field-value">${r.ativa
              ? '<span class="chip chip-green">Ativa</span>'
              : '<span class="chip chip-gray">Desativada</span>'}</span>
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
            <span class="drawer-field-value">${r.localidades?.nome ?? '—'}</span>
          </div>
          ${r.endereco ? `
          <div class="drawer-field" style="grid-column:1/-1">
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
    document.getElementById('inst-drawer-overlay').classList.add('open')
  }

  document.getElementById('drawer-close-btn').addEventListener('click', closeDrawer)
  document.getElementById('inst-drawer-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDrawer()
  })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer() })
  function closeDrawer() {
    document.getElementById('inst-drawer-overlay')?.classList.remove('open')
  }

  // ── Eventos dos filtros ────────────────────────────────────
  document.getElementById('search').addEventListener('input', applyFilters)
  document.getElementById('f-tipo').addEventListener('change', applyFilters)
  document.getElementById('f-status').addEventListener('change', applyFilters)

  document.getElementById('f-uf').addEventListener('change', () => {
    populateMunicipios(document.getElementById('f-uf').value)
    document.getElementById('f-municipio').value = ''
    applyFilters()
  })
  document.getElementById('f-municipio').addEventListener('change', applyFilters)

  document.getElementById('btn-limpar').addEventListener('click', () => {
    document.getElementById('search').value = ''
    document.getElementById('f-tipo').value = ''
    document.getElementById('f-uf').value = ''
    document.getElementById('f-status').value = ''
    populateMunicipios('')
    applyFilters()
  })

  load()
}
