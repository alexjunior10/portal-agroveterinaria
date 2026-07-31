import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Store, Stethoscope, Users, Home as HomeIcon, MapPin, Menu, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Agroveterinaria } from '../../types';
import { useAuth } from '../../context/AuthContext';

import VeterinariaHome from './VeterinariaHome';
import VeterinariaProductos from './VeterinariaProductos';
import VeterinariaServicios from './VeterinariaServicios';
import VeterinariaReferidos from './VeterinariaReferidos';

type AgroveterinariaConLocalidad = Agroveterinaria & { localidades?: { nombre: string } };

const VeterinariaPage = () => {
  const { agroveterinariaId, signOut } = useAuth();
  const [selectedAgro, setSelectedAgro] = useState<AgroveterinariaConLocalidad | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgro = async () => {
      if (!agroveterinariaId) {
        setInitialLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('agroveterinarias')
          .select('*, localidades(nombre)')
          .eq('id', agroveterinariaId)
          .single();
          
        if (data) {
          setSelectedAgro(data as AgroveterinariaConLocalidad);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchAgro();
  }, [agroveterinariaId]);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.includes('productos')) return 'Beneficios por Productos';
    if (path.includes('servicios')) return 'Servicios Veterinarios';
    if (path.includes('referidos')) return 'Programa de Referidos';
    return 'Inicio';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-andes-dark flex flex-col items-center justify-center z-[200]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl overflow-hidden">
            <img src="/logo.jpg" alt="Los Andes Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Los Andes</h1>
          <p className="text-andes-light mt-2 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Cargando portal...
          </p>
        </div>
      </div>
    );
  }

  // 3. Main Layout (Home & Modules)
  return (
    <div className="min-h-screen bg-bgMain flex flex-col md:flex-row">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-andes-dark text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white text-andes-dark flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="Los Andes Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight leading-tight">Los Andes</h1>
              <p className="text-xs text-andes-light opacity-80">Agroveterinaria</p>
            </div>
          </div>
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 flex-1 space-y-2">
          <NavLink 
            to="/veterinaria" 
            end
            onClick={() => setSidebarOpen(false)}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow-soft' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <HomeIcon size={20} />
            Inicio
          </NavLink>
          <NavLink 
            to="/veterinaria/productos" 
            onClick={() => setSidebarOpen(false)}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow-soft' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Store size={20} />
            Beneficios Productos
          </NavLink>
          <NavLink 
            to="/veterinaria/servicios" 
            onClick={() => setSidebarOpen(false)}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow-soft' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Stethoscope size={20} />
            Servicios Veterinarios
          </NavLink>
          <NavLink 
            to="/veterinaria/referidos" 
            onClick={() => setSidebarOpen(false)}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-andes text-white font-medium shadow-soft' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Users size={20} />
            Programa Referidos
          </NavLink>
        </nav>

        {/* Botón Salir */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Salir de la sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden flex flex-col min-h-screen">
        {/* Header (Top Bar) */}
        <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="md:hidden text-gray-500 hover:text-gray-900" onClick={() => setSidebarOpen(true)}>
                <Menu size={24} />
              </button>
              <div className="hidden sm:flex items-center text-sm text-gray-500">
                <span className="hover:text-gray-900 transition-colors">Portal Agroveterinaria</span>
                <span className="mx-2">/</span>
                <span className="font-semibold text-andes-dark">{getBreadcrumb()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 relative group justify-end">
               {location.pathname !== '/veterinaria' && selectedAgro && (
                 <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 text-andes px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100 shadow-sm transition-all hover:bg-blue-100" title="Punto de atención actual">
                   <MapPin size={12} />
                   <span>{selectedAgro.nombre}</span>
                 </div>
               )}
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300 bg-bgMain">
          {!agroveterinariaId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Store size={48} className="text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-700">Cuenta sin agroveterinaria asignada</h2>
              <p className="text-gray-500 mt-2 max-w-md">Contacta al administrador para que asigne un punto de atención a tu cuenta.</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={
                 <VeterinariaHome 
                   selectedAgro={selectedAgro} 
                 />
               } />
              <Route path="/productos" element={<VeterinariaProductos selectedAgroId={agroveterinariaId} />} />
              <Route path="/servicios" element={<VeterinariaServicios selectedAgroId={agroveterinariaId} />} />
              <Route path="/referidos" element={<VeterinariaReferidos selectedAgroId={agroveterinariaId} />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
};

export default VeterinariaPage;
