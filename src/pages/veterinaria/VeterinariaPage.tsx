import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Store, Stethoscope, Users, Home as HomeIcon, MapPin, Menu, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Agroveterinaria } from '../../types';

import VeterinariaHome from './VeterinariaHome';
import VeterinariaProductos from './VeterinariaProductos';
import VeterinariaServicios from './VeterinariaServicios';
import VeterinariaReferidos from './VeterinariaReferidos';

type AgroveterinariaConLocalidad = Agroveterinaria & { localidades?: { nombre: string } };

const VeterinariaPage = () => {
  const [agroveterinarias, setAgroveterinarias] = useState<AgroveterinariaConLocalidad[]>([]);
  const [localidades, setLocalidades] = useState<string[]>([]);
  
  const [selectedAgroId, setSelectedAgroId] = useState<string>(localStorage.getItem('agro_id') || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Loading states for splash screen
  const [initialLoading, setInitialLoading] = useState(true);

  // States for Welcome Screen selection
  const [welcomeLocalidad, setWelcomeLocalidad] = useState('');
  const [welcomeAgroId, setWelcomeAgroId] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgros = async () => {
      try {
        const { data } = await supabase.from('agroveterinarias').select('*, localidades(nombre)').order('nombre');
        if (data) {
          const mapped = data as AgroveterinariaConLocalidad[];
          setAgroveterinarias(mapped);
          
          // Extract unique localities
          const locs = Array.from(new Set(mapped.map(a => a.localidades?.nombre))).filter(Boolean) as string[];
          setLocalidades(locs.sort());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchAgros();
  }, []);

  const handleWelcomeSubmit = () => {
    if (welcomeAgroId) {
      setSelectedAgroId(welcomeAgroId);
      localStorage.setItem('agro_id', welcomeAgroId);
      navigate('/veterinaria');
    }
  };

  const selectedAgro = agroveterinarias.find(a => a.id === selectedAgroId);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.includes('productos')) return 'Beneficios por Productos';
    if (path.includes('servicios')) return 'Servicios Veterinarios';
    if (path.includes('referidos')) return 'Programa de Referidos';
    return 'Inicio';
  };

  // 1. Splash Screen
  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-andes-dark flex flex-col items-center justify-center z-[200]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-andes-dark font-black text-3xl">CA</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Caja Los Andes</h1>
          <p className="text-andes-light mt-2">Cargando portal...</p>
        </div>
      </div>
    );
  }

  // 2. Pantalla de Bienvenida (Welcome Screen) si no hay sede seleccionada
  if (!selectedAgroId) {
    const availableAgros = agroveterinarias.filter(a => a.localidades?.nombre === welcomeLocalidad);
    
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-[150] animate-in fade-in duration-500">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero-agroveterinaria.jpg" 
            alt="Fondo" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-andes-dark/90 backdrop-blur-sm"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-lg p-6">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-gradient-to-br from-andes to-andes-dark p-10 text-center text-white relative">
               <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6 text-andes-dark font-black text-2xl">
                 CA
               </div>
               <h1 className="text-2xl font-bold mb-2">Portal Agroveterinaria</h1>
               <p className="text-white/80 text-sm leading-relaxed">
                 Bienvenido. Seleccione el punto de atención desde el cual realizará la atención de clientes.
               </p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                {/* Paso 1: Localidad */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">1. Seleccione la Localidad</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-andes" size={20} />
                    <select 
                      className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-andes focus:border-andes appearance-none font-medium cursor-pointer shadow-sm transition-colors"
                      value={welcomeLocalidad}
                      onChange={(e) => {
                        setWelcomeLocalidad(e.target.value);
                        setWelcomeAgroId(''); // Reset agro when locality changes
                      }}
                    >
                      <option value="" disabled>Elegir localidad...</option>
                      {localidades.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Paso 2: Agroveterinaria */}
                <div className={`transition-opacity duration-300 ${!welcomeLocalidad ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">2. Punto de Atención</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-andes" size={20} />
                    <select 
                      className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-andes focus:border-andes appearance-none font-medium cursor-pointer shadow-sm transition-colors"
                      value={welcomeAgroId}
                      onChange={(e) => setWelcomeAgroId(e.target.value)}
                    >
                      <option value="" disabled>Elegir agroveterinaria...</option>
                      {availableAgros.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleWelcomeSubmit}
                  disabled={!welcomeAgroId}
                  className="w-full flex items-center justify-center gap-2 bg-andes hover:bg-andes-dark disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  <CheckCircle2 size={20} />
                  Ingresar al Portal
                </button>
              </div>
            </div>
          </div>
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
            <div className="w-8 h-8 rounded bg-white text-andes-dark flex items-center justify-center font-bold">
              CA
            </div>
            <div>
              <h1 className="font-bold tracking-tight leading-tight">Caja Los Andes</h1>
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

        {/* Botón Salir / Cambiar Sede */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              localStorage.removeItem('agro_id');
              window.location.href = '/veterinaria';
            }}
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
          <Routes>
            <Route path="/" element={
               <VeterinariaHome 
                 selectedAgro={selectedAgro} 
               />
             } />
            <Route path="/productos" element={<VeterinariaProductos selectedAgroId={selectedAgroId} />} />
            <Route path="/servicios" element={<VeterinariaServicios selectedAgroId={selectedAgroId} />} />
            <Route path="/referidos" element={<VeterinariaReferidos selectedAgroId={selectedAgroId} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default VeterinariaPage;
