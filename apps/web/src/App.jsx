import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfigProvider } from './context/ConfigContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { AppLayout } from './components/AppLayout.jsx'
import QrLanding from './pages/QrLanding.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AppHome from './pages/AppHome.jsx'
import Calendario from './pages/Calendario.jsx'
import Celulas from './pages/Celulas.jsx'
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
  return usuario?.papel === 'ADMIN' ? <Navigate to="/app/celulas" replace /> : <AppHome />
}

function SoLider({ children }) {
  const { usuario } = useAuth()
  return usuario?.papel === 'LIDER' ? children : <Navigate to="/app" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ConfigProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/entrar" replace />} />
            <Route path="/c/:qrToken" element={<QrLanding />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/auth/google/sucesso" element={<GoogleSucesso />} />

            {/* Protected layout route — wraps all /app* paths */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/app" element={<InicioOuCelulas />} />
              <Route path="/app/calendario" element={<Calendario />} />
              <Route path="/app/perfil" element={<Perfil />} />
              <Route path="/app/celulas" element={<Celulas />} />
              <Route path="/app/celula/:id" element={<CelulaDetalhe />} />
              <Route path="/app/pedidos" element={<MeusPedidos />} />
              <Route path="/app/pedidos/novo" element={<PedidoForm />} />
              <Route path="/app/pedidos/:id/editar" element={<PedidoForm />} />
              <Route path="/app/testemunhos" element={<SoLider><Testemunhos /></SoLider>} />
              <Route path="/app/vidas" element={<SoLider><Vidas /></SoLider>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </ConfigProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
