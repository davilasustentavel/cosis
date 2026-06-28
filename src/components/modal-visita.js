import { sb } from '../supabase.js'
import { state } from '../state.js'

export function abrirModalVisita(instituicao, onSaved) {
  const existing = document.getElementById('modal-visita-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'modal-visita-overlay'
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal" style="max-width:600px;width:95vw">
      <div class="modal-header">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:2px">
            Nova Visita
          </div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${instituicao.nome}</div>
        </div>
        <button class="drawer-close" id="modal-visita-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Data da Visita *</label>
            <input type="date" id="mv-data" required>
          </div>
          <div class="form-group">
            <label>Período *</label>
            <select id="mv-periodo">
              <option value="">Selecione</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Manhã/Tarde">Manhã/Tarde</option>
            </select>
          </div>
          <div class="form-group">
            <label>Qtd. Palestras</label>
            <input type="number" id="mv-palestras" min="0" value="1">
          </div>
          <div class="form-group">
            <label>Pessoa de Contato</label>
            <input type="text" id="mv-contato" placeholder="Nome do responsável">
          </div>
          <div class="form-group">
            <label>Telefone</label>
            <input type="text" id="mv-telefone" placeholder="(00) 00000-0000">
          </div>
        </div>

        <div class="form-section-title">Público Participante</div>
        <div class="form-grid form-grid-4">
          <div class="form-group">
            <label>Até 12 anos</label>
            <input type="number" id="mv-ate12" min="0" value="0">
          </div>
          <div class="form-group">
            <label>13 a 17 anos</label>
            <input type="number" id="mv-13a17" min="0" value="0">
          </div>
          <div class="form-group">
            <label>18 ou mais</label>
            <input type="number" id="mv-18mais" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Total</label>
            <input type="number" id="mv-total" min="0" value="0" readonly style="background:var(--cinza-pale);color:var(--text2)">
          </div>
        </div>

        <div class="form-section-title">Kits Distribuídos</div>
        <div class="form-grid form-grid-4">
          <div class="form-group">
            <label>Instituição</label>
            <input type="number" id="mv-kit-inst" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Criança</label>
            <input type="number" id="mv-kit-cri" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Adolescente</label>
            <input type="number" id="mv-kit-ado" min="0" value="0">
          </div>
          <div class="form-group">
            <label>Adulto</label>
            <input type="number" id="mv-kit-adu" min="0" value="0">
          </div>
        </div>

        <div class="form-section-title">Fotos da Visita</div>
        <div class="foto-upload-area" id="foto-upload-area">
          <input type="file" id="mv-fotos" multiple accept="image/*" style="display:none">
          <div id="foto-preview-grid" class="foto-preview-grid"></div>
          <label for="mv-fotos" class="btn btn-ghost btn-sm" style="cursor:pointer;margin-top:8px">
            + Adicionar fotos
          </label>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">JPG, PNG, WEBP · máx. 10 MB por foto</div>
        </div>

        <div id="mv-erro" class="form-error hidden"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="mv-cancelar">Cancelar</button>
        <button class="btn btn-primary" id="mv-salvar">Salvar Visita</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))

  // Fechar
  const fechar = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
  document.getElementById('modal-visita-close').addEventListener('click', fechar)
  document.getElementById('mv-cancelar').addEventListener('click', fechar)
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar() })

  // Auto-calcular total de pessoas
  const calcTotal = () => {
    const a = +document.getElementById('mv-ate12').value || 0
    const b = +document.getElementById('mv-13a17').value || 0
    const c = +document.getElementById('mv-18mais').value || 0
    document.getElementById('mv-total').value = a + b + c
  }
  ;['mv-ate12','mv-13a17','mv-18mais'].forEach(id =>
    document.getElementById(id).addEventListener('input', calcTotal))

  // Preview de fotos selecionadas
  let fotosParaUpload = []
  document.getElementById('mv-fotos').addEventListener('change', e => {
    const novos = Array.from(e.target.files)
    fotosParaUpload = [...fotosParaUpload, ...novos]
    renderPreviews()
    e.target.value = ''
  })

  function renderPreviews() {
    const grid = document.getElementById('foto-preview-grid')
    grid.innerHTML = fotosParaUpload.map((f, i) => `
      <div class="foto-preview-item">
        <img src="${URL.createObjectURL(f)}" alt="${f.name}">
        <button class="foto-preview-remove" data-idx="${i}" title="Remover">✕</button>
      </div>
    `).join('')
    grid.querySelectorAll('.foto-preview-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        fotosParaUpload.splice(+btn.dataset.idx, 1)
        renderPreviews()
      })
    })
  }

  // Salvar
  document.getElementById('mv-salvar').addEventListener('click', async () => {
    const erroEl = document.getElementById('mv-erro')
    erroEl.classList.add('hidden')

    const data_visita = document.getElementById('mv-data').value
    const periodo     = document.getElementById('mv-periodo').value
    if (!data_visita || !periodo) {
      erroEl.textContent = 'Data e período são obrigatórios.'
      erroEl.classList.remove('hidden')
      return
    }

    const btn = document.getElementById('mv-salvar')
    btn.disabled = true
    btn.textContent = 'Salvando…'

    const payload = {
      instituicao_id: instituicao.id,
      data_visita,
      periodo,
      qtd_palestras:   +document.getElementById('mv-palestras').value || null,
      pessoas_ate12:   +document.getElementById('mv-ate12').value    || null,
      pessoas_13a17:   +document.getElementById('mv-13a17').value    || null,
      pessoas_18mais:  +document.getElementById('mv-18mais').value   || null,
      pessoas_total:   +document.getElementById('mv-total').value    || null,
      kits_instituicao:+document.getElementById('mv-kit-inst').value || null,
      kits_crianca:    +document.getElementById('mv-kit-cri').value  || null,
      kits_adolescente:+document.getElementById('mv-kit-ado').value  || null,
      kits_adulto:     +document.getElementById('mv-kit-adu').value  || null,
      kits_total: (
        (+document.getElementById('mv-kit-inst').value || 0) +
        (+document.getElementById('mv-kit-cri').value  || 0) +
        (+document.getElementById('mv-kit-ado').value  || 0) +
        (+document.getElementById('mv-kit-adu').value  || 0)
      ) || null,
      pessoa_contato:  document.getElementById('mv-contato').value.trim()  || null,
      telefone:        document.getElementById('mv-telefone').value.trim() || null,
      criado_por:      state.user.id,
      status_validacao: 'pendente',
    }

    const { data: visita, error } = await sb.from('visitas').insert(payload).select().single()
    if (error) {
      erroEl.textContent = 'Erro ao salvar: ' + error.message
      erroEl.classList.remove('hidden')
      btn.disabled = false
      btn.textContent = 'Salvar Visita'
      return
    }

    // Upload das fotos
    if (fotosParaUpload.length > 0) {
      btn.textContent = 'Enviando fotos…'
      for (const foto of fotosParaUpload) {
        const ext  = foto.name.split('.').pop()
        const path = `${visita.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await sb.storage.from('fotos-visitas').upload(path, foto)
        if (upErr) { console.error('Upload erro:', upErr); continue }
        const { data: { publicUrl } } = sb.storage.from('fotos-visitas').getPublicUrl(path)
        await sb.from('evidencias').insert({
          visita_id: visita.id,
          tipo: 'foto',
          url: publicUrl,
          criado_por: state.user.id,
        })
      }
    }

    fechar()
    onSaved?.()
  })
}
