import { sb, SUPA_URL } from '../supabase.js'
import { state } from '../state.js'
import { renderLayout } from '../layout.js'
import { toast, openModal, closeModal, setLoading } from '../ui.js'

export async function renderUsuarios() {
  const main = renderLayout('usuarios')
  main.innerHTML = `
    <p class="page-title">Usuários</p>
    <p class="page-subtitle">Somente o administrador pode criar e gerenciar acessos</p>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Usuários Cadastrados</span>
        <button class="btn btn-primary btn-sm" id="btn-novo">+ Novo Usuário</button>
      </div>
      <div class="card-body">
        <div id="users-wrap">
          <div class="loading"><div class="spinner"></div> Carregando…</div>
        </div>
      </div>
    </div>

    <!-- MODAL CRIAR USUÁRIO -->
    <div class="modal-overlay" id="modal-usuario">
      <div class="modal modal-sm">
        <div class="modal-header">
          <span class="modal-title">Novo Usuário</span>
          <button class="modal-close" id="btn-fechar-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome completo</label>
            <input id="u-nome" type="text" placeholder="Nome do usuário">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input id="u-email" type="email" placeholder="email@exemplo.com">
          </div>
          <div class="form-group">
            <label>Senha provisória</label>
            <input id="u-senha" type="text" placeholder="Mínimo 8 caracteres">
            <span class="form-hint">O usuário deve alterar a senha no primeiro acesso.</span>
          </div>
          <div class="form-group">
            <label>Perfil de acesso</label>
            <select id="u-perfil">
              <option value="campo">Campo — registro de visitas</option>
              <option value="gestor">Gestor — validação de visitas</option>
              <option value="admin">Administrador — acesso total</option>
            </select>
          </div>
          <div id="u-erro" class="form-error hidden"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar">Criar Usuário</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('btn-novo').addEventListener('click', () => openModal('modal-usuario'))
  document.getElementById('btn-fechar-modal').addEventListener('click', () => closeModal('modal-usuario'))
  document.getElementById('btn-cancelar').addEventListener('click', () => closeModal('modal-usuario'))

  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const nome   = document.getElementById('u-nome').value.trim()
    const email  = document.getElementById('u-email').value.trim()
    const senha  = document.getElementById('u-senha').value
    const perfil = document.getElementById('u-perfil').value
    const erroEl = document.getElementById('u-erro')
    const btnEl  = document.getElementById('btn-salvar')

    erroEl.classList.add('hidden')
    if (!nome || !email || !senha) {
      erroEl.textContent = 'Preencha todos os campos.'
      erroEl.classList.remove('hidden')
      return
    }
    if (senha.length < 8) {
      erroEl.textContent = 'A senha deve ter pelo menos 8 caracteres.'
      erroEl.classList.remove('hidden')
      return
    }

    setLoading(btnEl, true)
    const { data: { session } } = await sb.auth.getSession()
    const res = await fetch(`${SUPA_URL}/functions/v1/criar-usuario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ nome, email, senha, perfil }),
    })
    setLoading(btnEl, false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      erroEl.textContent = body.error ?? 'Erro ao criar usuário.'
      erroEl.classList.remove('hidden')
      return
    }

    toast('Usuário criado com sucesso!', 'success')
    closeModal('modal-usuario')
    document.getElementById('u-nome').value = ''
    document.getElementById('u-email').value = ''
    document.getElementById('u-senha').value = ''
    loadUsers()
  })

  async function loadUsers() {
    const { data } = await sb.from('usuarios').select('*').order('nome')
    const rows = data ?? []
    const wrap = document.getElementById('users-wrap')
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Nenhum usuário</div></div>'
      return
    }
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(u => `
            <tr>
              <td style="font-weight:600">${u.nome ?? '—'}</td>
              <td style="color:var(--text2)">${u.email ?? '—'}</td>
              <td>${perfilBadge(u.perfil)}</td>
              <td>${u.ativo
                ? '<span class="chip chip-green">Ativo</span>'
                : '<span class="chip chip-gray">Inativo</span>'
              }</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  }

  loadUsers()
}

function perfilBadge(p) {
  const map = {
    admin:  '<span class="badge badge-admin">Admin</span>',
    gestor: '<span class="badge badge-gestor">Gestor</span>',
    campo:  '<span class="badge badge-campo">Campo</span>',
  }
  return map[p] ?? p
}
