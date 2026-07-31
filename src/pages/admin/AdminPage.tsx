import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShieldCheck, Users } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminServiciosDashboard from './AdminServiciosDashboard';
import AdminProducts from './AdminProducts';
import AdminServicios from './AdminServicios';
import AdminReferidos from './AdminReferidos';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bgMain flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-andes-dark text-white flex flex-col">
        <div className="p-6 border-b border-andes flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white text-andes-dark flex items-center justify-center overflow-hidden">
            <img src="/logo.jpg" alt="Los Andes Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight leading-tight">Los Andes</h1>
            <p className="text-xs text-andes-light opacity-80">Portal Admin</p>
          </div>
        </div>
        
        <nav className="p-4 flex-1 space-y-2">
          <NavLink 
            to="/admin" 
            end
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow' : 'text-gray-300 hover:bg-andes/50 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard Beneficios
          </NavLink>
          <NavLink 
            to="/admin/dashboard-servicios" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow' : 'text-gray-300 hover:bg-andes/50 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard Servicios
          </NavLink>
          <NavLink 
            to="/admin/referidos" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow' : 'text-gray-300 hover:bg-andes/50 hover:text-white'}`}
          >
            <Users size={20} />
            Gestión Referidos
          </NavLink>
          <NavLink 
            to="/admin/productos" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow' : 'text-gray-300 hover:bg-andes/50 hover:text-white'}`}
          >
            <Package size={20} />
            Catálogo
          </NavLink>
          <NavLink 
            to="/admin/servicios" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow' : 'text-gray-300 hover:bg-andes/50 hover:text-white'}`}
          >
            <ShieldCheck size={20} />
            Asignación de Servicios
          </NavLink>
        </nav>
        
        {/* Botón Salir */}
        <div className="p-4 border-t border-andes/50">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:bg-andes/50 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Salir de la sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden flex flex-col">
        {/* Topbar for mobile */}
        <header className="bg-white border-b border-gray-100 p-4 shadow-sm flex items-center justify-between md:hidden">
          <span className="font-bold text-textMain">Admin Panel</span>
        </header>
        
        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/dashboard-servicios" element={<AdminServiciosDashboard />} />
            <Route path="/referidos" element={<AdminReferidos />} />
            <Route path="/productos" element={<AdminProducts />} />
            <Route path="/servicios" element={<AdminServicios />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
