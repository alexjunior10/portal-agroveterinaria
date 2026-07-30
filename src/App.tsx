import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Layouts / Pages
import LoginPage from './pages/auth/LoginPage';
import VeterinariaPage from './pages/veterinaria/VeterinariaPage';
import AdminPage from './pages/admin/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* AGROVET Routes */}
          <Route element={<ProtectedRoute allowedRole="AGROVET" />}>
            <Route path="/veterinaria/*" element={<VeterinariaPage />} />
          </Route>
          
          {/* ADMIN Routes */}
          <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
            <Route path="/admin/*" element={<AdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
