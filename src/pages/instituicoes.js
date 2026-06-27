import { sb } from '../supabase.js'
import { renderLayout } from '../layout.js'

export async function renderInstituicoes() {
  const main = renderLayout('instituicoes')
  main.innerHTML = `
    <p class="page-title">Instituições</p>
    <p class="page-subtitle">591 instituições cadastradas nos estados MA, RN e CE</p>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input id="search" type="text" placeholder="Buscar por nome, município…">
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
  `

  let allRows = []
  let query = ''

  async function load() {
    const { data } = await sb
      .from('instituicoes')
      .select('item, nome, ativa, municipio_id, municipios(nome, estados(sigla))')
      .order('item')

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
            <th>Município</th>
            <th>UF</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td style="color:var(--text3);font-size:12px">${r.item}</td>
              <td style="font-weight:600">${r.nome}</td>
              <td>${r.municipios?.nome ?? '—'}</td>
              <td>${r.municipios?.estados?.sigla ?? '—'}</td>
              <td>${r.ativa
                ? '<span class="chip chip-green">Ativa</span>'
                : '<span class="chip chip-gray">Desativada</span>'
              }</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  }

  document.getElementById('search').addEventListener('input', e => {
    query = e.target.value.toLowerCase()
    const filtered = allRows.filter(r =>
      r.nome.toLowerCase().includes(query) ||
      (r.municipios?.nome ?? '').toLowerCase().includes(query)
    )
    render(filtered)
  })

  load()
}
