import { sb } from '../supabase.js'
import { state, isGestor } from '../state.js'
import { renderLayout } from '../layout.js'
import { toast } from '../ui.js'
import { abrirModalVisita } from '../components/modal-visita.js'

export async function renderVisitas() {
  const main = renderLayout('visitas')
  const soCampo = !isGestor()   // usuário de campo vê só as próprias visitas

  main.innerHTML = `
    <p class="page-title">Visitas</p>
    <p class="page-subtitle">${soCampo ? 'Suas visitas registradas' : 'Registro e acompanhamento de visitas às instituições'}</p>

    <div class="filter-bar">
      <select id="vv-status">
        ${soCampo ? `
        <option value="pendente+rejeitada" selected>Pendentes e Rejeitadas</option>
        <option value="">Todas</option>
        ` : `
        <option value="">Todas</option>
        `}
        <option value="pendente">Pendentes</option>
        <option value="aprovada">Aprovadas</option>
        <option value="rejeitada">Rejeitadas</option>
      </select>
      <select id="vv-uf"><option value="">UF (todas)</option></select>
      <select id="vv-municipio"><option value="">Município (todos)</option></select>
      <select id="vv-instituicao"><option value="">Instituição (todas)</option></select>
      ${!soCampo ? '<select id="vv-responsavel"><option value="">Responsável (todos)</option></select>' : ''}
      <button class="btn btn-ghost btn-sm" id="vv-limpar">Limpar</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Visitas Registradas</span>
        <span id="count-label" class="text-muted" style="font-size:12px"></span>
      </div>
      <div class="card-body">
        <div id="table-wrap">
          <div class="loading"><div class="spinner"></div> Carregando…</div>
        </div>
      </div>
    </div>

    <!-- Confirmação de exclusão -->
    <div class="modal-overlay" id="modal-excluir">
      <div class="modal" style="max-width:380px;width:95vw">
        <div class="modal-header">
          <div style="font-size:15px;font-weight:700;color:var(--text)">Excluir Visita</div>
        </div>
        <div class="modal-body">
          <p style="font-size:14px;color:var(--text2)">Tem certeza que deseja excluir esta visita? Esta ação não pode ser desfeita.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="excluir-cancelar">Cancelar</button>
          <button class="btn" style="background:#c0392b;color:white" id="excluir-confirmar">Excluir</button>
        </div>
      </div>
    </div>
  `

  let allRows = []
  let nomeMap = {}
  let instMap = {}
  let visitaParaExcluir = null

  async function load() {
    let query = sb
      .from('visitas')
      .select(`
        id, data_visita, periodo, status_validacao, motivo_negacao,
        validado_por, pessoas_total, qtd_palestras, criado_por,
        pessoas_ate12, pessoas_13a17, pessoas_18mais,
        kits_instituicao, kits_crianca, kits_adolescente, kits_adulto,
        pessoa_contato, telefone,
        coord_lat, coord_lon, utm_norte, utm_leste, utm_zona,
        instituicoes(id, nome, tipo_evento, municipios(nome, estados(sigla)))
      `)
      .order('data_visita', { ascending: false })

    if (soCampo) query = query.eq('criado_por', state.user.id)

    const { data } = await query
    allRows = data ?? []

    // Nomes dos responsáveis
    const uuids = [...new Set(allRows.map(v => v.criado_por).filter(Boolean))]
    nomeMap = {}
    if (uuids.length) {
      const { data: usrs } = await sb.from('usuarios').select('id, nome').in('id', uuids)
      ;(usrs ?? []).forEach(u => { nomeMap[u.id] = u.nome })
    }

    // Mapear instituições para uso no modal de edição
    allRows.forEach(v => {
      if (v.instituicoes) instMap[v.instituicoes.id] = v.instituicoes
    })

    // UFs para filtro
    const ufs = [...new Set(allRows.map(v => v.instituicoes?.municipios?.estados?.sigla).filter(Boolean))].sort()
    const fUf = document.getElementById('vv-uf')
    fUf.innerHTML = '<option value="">UF (todas)</option>'
    ufs.forEach(uf => { const o = document.createElement('option'); o.value = uf; o.textContent = uf; fUf.appendChild(o) })

    popularInstituicoes()

    // Responsável (apenas gestor/admin)
    if (!soCampo) {
      const fResp = document.getElementById('vv-responsavel')
      fResp.innerHTML = '<option value="">Responsável (todos)</option>'
      const uuidsOrdenados = [...new Set(allRows.map(v => v.criado_por).filter(Boolean))]
        .sort((a, b) => (nomeMap[a] ?? '').localeCompare(nomeMap[b] ?? ''))
      uuidsOrdenados.forEach(id => {
        const o = document.createElement('option')
        o.value = id
        o.textContent = nomeMap[id] ?? id
        fResp.appendChild(o)
      })
    }

    applyFilters()
  }

  function popularMunicipios(uf) {
    const fMun = document.getElementById('vv-municipio')
    fMun.innerHTML = '<option value="">Município (todos)</option>'
    const muns = [...new Set(
      allRows.filter(v => !uf || v.instituicoes?.municipios?.estados?.sigla === uf)
        .map(v => v.instituicoes?.municipios?.nome).filter(Boolean)
    )].sort()
    muns.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; fMun.appendChild(o) })
  }

  function popularInstituicoes(uf, mun) {
    const fInst = document.getElementById('vv-instituicao')
    const atual = fInst.value
    fInst.innerHTML = '<option value="">Instituição (todas)</option>'
    const insts = [...new Map(
      allRows
        .filter(v => (!uf  || v.instituicoes?.municipios?.estados?.sigla === uf)
                  && (!mun || v.instituicoes?.municipios?.nome === mun))
        .map(v => [v.instituicoes?.id, v.instituicoes?.nome])
        .filter(([id]) => id)
    )].sort((a, b) => a[1]?.localeCompare(b[1]))
    insts.forEach(([id, nome]) => {
      const o = document.createElement('option')
      o.value = id
      o.textContent = nome
      if (id === atual) o.selected = true
      fInst.appendChild(o)
    })
  }

  function applyFilters() {
    const st   = document.getElementById('vv-status').value
    const uf   = document.getElementById('vv-uf').value
    const mun  = document.getElementById('vv-municipio').value
    const inst = document.getElementById('vv-instituicao').value
    const resp = !soCampo ? document.getElementById('vv-responsavel').value : ''

    const rows = allRows.filter(v => {
      if (st === 'pendente+rejeitada') {
        if (v.status_validacao === 'aprovada') return false
      } else if (st) {
        if (v.status_validacao !== st) return false
      }
      if (uf   && v.instituicoes?.municipios?.estados?.sigla !== uf)  return false
      if (mun  && v.instituicoes?.municipios?.nome !== mun)            return false
      if (inst && v.instituicoes?.id !== inst)                         return false
      if (resp && v.criado_por !== resp)                               return false
      return true
    })
    renderTable(rows)
  }

  // colspan total: campo=8, gestor=8 (ambos têm mesmo nº de colunas agora)
  const totalCols = soCampo ? 8 : 8

  function renderTable(rows) {
    document.getElementById('count-label').textContent = `${rows.length} de ${allRows.length} visitas`

    if (!rows.length) {
      document.getElementById('table-wrap').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">Nenhuma visita encontrada</div>
          <div class="empty-sub">Ajuste os filtros para ampliar a busca</div>
        </div>`
      return
    }

    const podEditar = v => v.status_validacao === 'pendente' || v.status_validacao === 'rejeitada'

    document.getElementById('table-wrap').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Instituição</th>
            <th>Município / UF</th>
            <th>Período</th>
            <th style="text-align:center">Pessoas</th>
            <th style="text-align:center">Status</th>
            ${!soCampo ? '<th>Responsável</th>' : ''}
            <th style="text-align:center">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(v => `
            <tr>
              <td style="white-space:nowrap">${formatDate(v.data_visita)}</td>
              <td style="font-weight:600">${v.instituicoes?.nome ?? '—'}</td>
              <td style="white-space:nowrap">${v.instituicoes?.municipios?.nome ?? '—'} / ${v.instituicoes?.municipios?.estados?.sigla ?? '—'}</td>
              <td>${v.periodo ?? '—'}</td>
              <td style="text-align:center">${v.pessoas_total ?? '—'}</td>
              <td style="text-align:center">${statusChip(v.status_validacao)}</td>
              ${!soCampo ? `<td style="white-space:nowrap">${nomeMap[v.criado_por] ?? '—'}</td>` : ''}
              <td style="text-align:center;white-space:nowrap">
                ${podEditar(v) ? `
                  <button class="btn btn-ghost btn-sm" data-editar="${v.id}" title="Editar">✏️</button>
                  <button class="btn btn-ghost btn-sm" data-excluir="${v.id}" title="Excluir" style="color:#c0392b">🗑️</button>
                ` : '<span style="color:var(--text3);font-size:11px">—</span>'}
              </td>
            </tr>
            ${v.status_validacao === 'rejeitada' && v.motivo_negacao ? `
            <tr>
              <td colspan="${totalCols}" style="padding:4px 14px 10px;font-size:12px;color:#c0392b;background:#fff5f5;border-bottom:1px solid #fcd">
                <strong>Motivo da rejeição:</strong> ${v.motivo_negacao}
                ${v.validado_por ? `<span style="color:var(--text3)"> — por ${v.validado_por}</span>` : ''}
                ${soCampo ? `<span style="margin-left:8px;font-size:11px;color:var(--azul)">↑ Edite e reenvie para nova validação</span>` : ''}
              </td>
            </tr>` : ''}
          `).join('')}
        </tbody>
      </table>`

    // Editar
    document.querySelectorAll('[data-editar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = allRows.find(r => r.id === +btn.dataset.editar)
        if (!v) return
        const inst = v.instituicoes ?? instMap[v.instituicoes?.id]
        abrirModalVisita(inst, load, v)
      })
    })

    // Excluir
    document.querySelectorAll('[data-excluir]').forEach(btn => {
      btn.addEventListener('click', () => {
        visitaParaExcluir = +btn.dataset.excluir
        document.getElementById('modal-excluir').classList.add('open')
      })
    })
  }

  // ── Modal exclusão ────────────────────────────────────────
  document.getElementById('excluir-cancelar').addEventListener('click', () =>
    document.getElementById('modal-excluir').classList.remove('open'))
  document.getElementById('modal-excluir').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('modal-excluir').classList.remove('open')
  })
  document.getElementById('excluir-confirmar').addEventListener('click', async () => {
    document.getElementById('modal-excluir').classList.remove('open')
    const { error } = await sb.from('visitas').delete().eq('id', visitaParaExcluir)
    if (error) { toast('Erro ao excluir: ' + error.message, 'error'); return }
    toast('Visita excluída.', '')
    await load()
  })

  // ── Filtros ───────────────────────────────────────────────
  document.getElementById('vv-uf').addEventListener('change', () => {
    const uf = document.getElementById('vv-uf').value
    popularMunicipios(uf)
    document.getElementById('vv-municipio').value = ''
    popularInstituicoes(uf, '')
    document.getElementById('vv-instituicao').value = ''
    applyFilters()
  })

  document.getElementById('vv-municipio').addEventListener('change', () => {
    const uf  = document.getElementById('vv-uf').value
    const mun = document.getElementById('vv-municipio').value
    popularInstituicoes(uf, mun)
    document.getElementById('vv-instituicao').value = ''
    applyFilters()
  })

  const filtrosSimples = ['vv-status', 'vv-instituicao']
  if (!soCampo) filtrosSimples.push('vv-responsavel')
  filtrosSimples.forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters))

  document.getElementById('vv-limpar').addEventListener('click', () => {
    document.getElementById('vv-status').value = soCampo ? 'pendente+rejeitada' : ''
    document.getElementById('vv-uf').value = ''
    document.getElementById('vv-municipio').value = ''
    document.getElementById('vv-instituicao').value = ''
    if (!soCampo) document.getElementById('vv-responsavel').value = ''
    popularMunicipios('')
    popularInstituicoes()
    applyFilters()
  })

  load()
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function statusChip(s) {
  if (s === 'aprovada')  return '<span class="chip chip-green">Aprovada</span>'
  if (s === 'rejeitada') return '<span class="chip chip-red">Rejeitada</span>'
  return '<span class="chip chip-yellow">Pendente</span>'
}
