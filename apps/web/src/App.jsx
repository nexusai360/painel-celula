import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfigProvider } from './context/ConfigContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { ehAdmin, ehGestorQualificacao } from './lib/papeis.js'
import { AppLayout } from './components/AppLayout.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { AdminLayout } from './pages/admin/AdminLayout.jsx'
import AdminUsuarios from './pages/admin/AdminUsuarios.jsx'
import AdminAvisos from './pages/admin/AdminAvisos.jsx'
import QrLanding from './pages/QrLanding.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AppHome from './pages/AppHome.jsx'
import Calendario from './pages/Calendario.jsx'
import Celulas from './pages/Celulas.jsx'
import Aprovacoes from './pages/Aprovacoes.jsx'
import SelecionarCelula from './pages/SelecionarCelula.jsx'
import Aguardando from './pages/Aguardando.jsx'
import CelulaDetalhe from './pages/CelulaDetalhe.jsx'
import Perfil from './pages/Perfil.jsx'
import GoogleSucesso from './pages/GoogleSucesso.jsx'
import MeusPedidos from './pages/MeusPedidos.jsx'
import PedidoForm from './pages/PedidoForm.jsx'
import Testemunhos from './pages/Testemunhos.jsx'
import NovaCelulaLider from './pages/NovaCelulaLider.jsx'
import Vidas from './pages/Vidas.jsx'
import NotFound from './pages/NotFound.jsx'

function InicioOuCelulas() {
  const { usuario } = useAuth()
  // Admin sem célula vai direto para a Administração; admin que participa de uma
  // célula (ou membro/líder) vê a home de participante.
  if (ehAdmin(usuario?.nivelAcesso) && !usuario?.celulaId) return <Navigate to="/app/admin/usuarios" replace />
  return <AppHome />
}

// Gestor de célula = qualificação LÍDER/PASTOR (função na igreja).
function SoLider({ children }) {
  const { usuario } = useAuth()
  return ehGestorQualificacao(usuario?.qualificacao) ? children : <Navigate to="/app" replace />
}

function SoAdmin({ children }) {
  const { usuario } = useAuth()
  return ehAdmin(usuario?.nivelAcesso) ? children : <Navigate to="/app" replace />
}

// Gestão (aprovar, notificar) = nível ADMIN+ OU qualificação LÍDER/PASTOR.
function SoGestor({ children }) {
  const { usuario } = useAuth()
  const ok = ehAdmin(usuario?.nivelAcesso) || ehGestorQualificacao(usuario?.qualificacao)
  return ok ? children : <Navigate to="/app" replace />
}

// Trava do usuário pendente: só acessa seleção de célula, "aguardando" e o perfil.
function AppComGate() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  if (usuario && usuario.aprovado === false) {
    if (!usuario.celulaId) {
      if (pathname !== '/app/selecionar-celula') return <Navigate to="/app/selecionar-celula" replace />
    } else {
      const liberadas = ['/app/aguardando', '/app/perfil', '/app/selecionar-celula']
      if (!liberadas.includes(pathname)) return <Navigate to="/app/aguardando" replace />
    }
  }
  return <AppLayout />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ConfigProvider>
        <AuthProvider>
          <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/entrar" replace />} />
            <Route path="/c/:qrToken" element={<QrLanding />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/auth/google/sucesso" element={<GoogleSucesso />} />

            {/* Protected layout route — wraps all /app* paths */}
            <Route element={<ProtectedRoute><AppComGate /></ProtectedRoute>}>
              <Route path="/app" element={<InicioOuCelulas />} />
              <Route path="/app/selecionar-celula" element={<SelecionarCelula />} />
              <Route path="/app/aguardando" element={<Aguardando />} />
              <Route path="/app/calendario" element={<Calendario />} />
              <Route path="/app/perfil" element={<Perfil />} />
              {/* Compat: rotas antigas redirecionam para a área de Administração */}
              <Route path="/app/celulas" element={<Navigate to="/app/admin/celulas" replace />} />
              <Route path="/app/usuarios" element={<Navigate to="/app/admin/usuarios" replace />} />
              {/* Aprovações do líder (própria célula) — rota dedicada */}
              <Route path="/app/aprovacoes" element={<SoGestor><Aprovacoes /></SoGestor>} />
              {/* Área de Administração (route-group; rail lateral + sub-nav) */}
              <Route path="/app/admin" element={<SoAdmin><AdminLayout /></SoAdmin>}>
                <Route path="usuarios" element={<AdminUsuarios />} />
                <Route path="celulas" element={<Celulas />} />
                <Route path="avisos" element={<AdminAvisos />} />
              </Route>
              <Route path="/app/celula/:id" element={<CelulaDetalhe />} />
              <Route path="/app/pedidos" element={<MeusPedidos />} />
              <Route path="/app/pedidos/novo" element={<PedidoForm />} />
              <Route path="/app/pedidos/:id/editar" element={<PedidoForm />} />
              <Route path="/app/nova-celula" element={<SoLider><NovaCelulaLider /></SoLider>} />
              <Route path="/app/testemunhos" element={<SoLider><Testemunhos /></SoLider>} />
              <Route path="/app/vidas" element={<SoLider><Vidas /></SoLider>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </ToastProvider>
        </AuthProvider>
        </ConfigProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
