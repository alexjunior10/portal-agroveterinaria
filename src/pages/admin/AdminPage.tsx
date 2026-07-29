import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShieldCheck, Users } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminServiciosDashboard from './AdminServiciosDashboard';
import AdminProducts from './AdminProducts';
import AdminServicios from './AdminServicios';
import AdminReferidos from './AdminReferidos';

const AdminPage = () => {
  return (
    <div className="min-h-screen bg-bgMain flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-andes-dark text-white flex flex-col">
        <div className="p-6 border-b border-andes flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white text-andes-dark flex items-center justify-center font-bold">
            CA
          </div>
          <div>
            <h1 className="font-bold tracking-tight leading-tight">Caja Los Andes</h1>
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
        
        <div className="p-4 text-xs text-center text-gray-400 border-t border-andes/50">
          <ShieldCheck size={16} className="inline mr-1" />
          Modo Validación (MVP)
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
