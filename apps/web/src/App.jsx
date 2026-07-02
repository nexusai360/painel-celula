import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfigProvider } from './context/ConfigContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { ehAdmin, PAPEL_RANK } from './lib/papeis.js'
import { AppLayout } from './components/AppLayout.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import QrLanding from './pages/QrLanding.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AppHome from './pages/AppHome.jsx'
import Calendario from './pages/Calendario.jsx'
import Celulas from './pages/Celulas.jsx'
import Usuarios from './pages/Usuarios.jsx'
import SelecionarCelula from './pages/SelecionarCelula.jsx'
import Aguardando from './pages/Aguardando.jsx'
import CelulaDetalhe from './pages/CelulaDetalhe.jsx'
import Perfil from './pages/Perfil.jsx'
import GoogleSucesso from './pages/GoogleSucesso.jsx'
import MeusPedidos from './pages/MeusPedidos.jsx'
import PedidoForm from './pages/PedidoForm.jsx'
import Testemunhos from './pages/Testemunhos.jsx'
import Vidas from './pages/Vidas.jsx'
import NotFound from './pages/NotFound.jsx'

function InicioOuCelulas() {
  const { usuario } = useAuth()
  // Admin sem célula vai direto para a Administração; admin que participa de uma
  // célula (ou membro/líder) vê a home de participante.
  if (ehAdmin(usuario?.papel) && !usuario?.celulaId) return <Navigate to="/app/celulas" replace />
  return <AppHome />
}

function SoLider({ children }) {
  const { usuario } = useAuth()
  return usuario?.papel === 'LIDER' ? children : <Navigate to="/app" replace />
}

function SoAdmin({ children }) {
  const { usuario } = useAuth()
  return ehAdmin(usuario?.papel) ? children : <Navigate to="/app" replace />
}

function SoGestor({ children }) {
  const { usuario } = useAuth()
  return (PAPEL_RANK[usuario?.papel] || 0) >= PAPEL_RANK.LIDER ? children : <Navigate to="/app" replace />
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
              <Route path="/app/celulas" element={<Celulas />} />
              <Route path="/app/usuarios" element={<SoGestor><Usuarios /></SoGestor>} />
              <Route path="/app/celula/:id" element={<CelulaDetalhe />} />
              <Route path="/app/pedidos" element={<MeusPedidos />} />
              <Route path="/app/pedidos/novo" element={<PedidoForm />} />
              <Route path="/app/pedidos/:id/editar" element={<PedidoForm />} />
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
