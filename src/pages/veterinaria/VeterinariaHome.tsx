import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Stethoscope, Users, ChevronRight, MapPin, Package, Clock, ShieldCheck, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  selectedAgro?: any;
  onChangeAgroRequest?: () => void;
}

const VeterinariaHome = ({ selectedAgro, onChangeAgroRequest }: Props) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    productosConvenio: 0,
    serviciosDisponibles: 0,
    beneficiosPendientes: 0,
    serviciosPendientes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedAgro) return;
      setLoading(true);

      try {
        // 1. Productos disponibles
        const { count: prodCount } = await supabase.from('agroveterinaria_productos')
          .select('*', { count: 'exact', head: true })
          .eq('agroveterinaria_id', selectedAgro.id)
          .eq('estado', 'activo');

        // 2. Servicios disponibles
        const { count: servDispCount } = await supabase.from('agroveterinaria_servicios')
          .select('*', { count: 'exact', head: true })
          .eq('agroveterinaria_id', selectedAgro.id)
          .eq('estado', 'Activo');

        // 3. Servicios pendientes
        const { data: servPendData } = await supabase.from('cliente_servicios')
          .select('id, agroveterinaria_servicios!inner(agroveterinaria_id)')
          .eq('estado', 'Pendiente')
          .eq('agroveterinaria_servicios.agroveterinaria_id', selectedAgro.id);

        // 4. Beneficios pendientes (Clientes de la localidad - clientes que ya canjearon)
        const { count: clientesCount } = await supabase.from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('localidad_id', selectedAgro.localidad_id);

        const { data: canjesData } = await supabase.from('canjes')
          .select('cliente_dni, clientes!inner(localidad_id)')
          .eq('clientes.localidad_id', selectedAgro.localidad_id);
          
        const claimedSet = new Set(canjesData?.map(c => c.cliente_dni));
        const beneficiosPendientes = Math.max(0, (clientesCount || 0) - claimedSet.size);

        setStats({
          productosConvenio: prodCount || 0,
          serviciosDisponibles: servDispCount || 0,
          serviciosPendientes: servPendData?.length || 0,
          beneficiosPendientes
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedAgro]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Institucional Integrado */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-andes-dark min-h-[320px] flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero-agroveterinaria.jpg" 
            alt="Cliente rural con asesor" 
            className="w-full h-full object-cover object-center opacity-70"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-andes-dark via-andes-dark/90 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-6 md:p-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Portal Agroveterinaria</h1>
            <p className="text-blue-50 text-base md:text-lg leading-relaxed font-light mb-6">
              Centro de operaciones para gestionar los beneficios de los clientes de Caja Los Andes.
            </p>
          </div>

          {/* Tarjeta de Punto de Atención Integrada */}
          {selectedAgro && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl max-w-sm w-full shrink-0">
              <p className="text-andes-light text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <MapPin size={14} /> Punto de Atención Actual
              </p>
              <h2 className="text-2xl font-bold text-white leading-tight mb-2">
                {selectedAgro.nombre}
              </h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-semibold text-white">
                  {selectedAgro.localidades?.nombre || 'Localidad Desconocida'}
                </span>
              </div>
              <p className="text-white/70 text-xs">
                Todos los beneficios y servicios registrados se asociarán a esta agroveterinaria.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPIs Estáticos Operativos */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-andes" />
          Resumen Operativo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-soft">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Package size={18} className="text-blue-500" />
              <span className="text-xs font-bold uppercase">Prod. en Convenio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.productosConvenio}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-soft">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <ShieldCheck size={18} className="text-purple-500" />
              <span className="text-xs font-bold uppercase">Servicios Activos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.serviciosDisponibles}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-soft">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Store size={18} className="text-amber-500" />
              <span className="text-xs font-bold uppercase">Beneficios Pdt.</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.beneficiosPendientes}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-soft">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Clock size={18} className="text-emerald-500" />
              <span className="text-xs font-bold uppercase">Servicios Pdt.</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : stats.serviciosPendientes}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Módulos de Atención */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-6">Módulos de Trabajo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Módulo Productos */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate('/veterinaria/productos')}>
            <div className="w-16 h-16 bg-blue-50 text-andes rounded-2xl flex items-center justify-center mb-6 group-hover:bg-andes group-hover:text-white transition-colors">
              <Store size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Beneficios por Productos</h3>
            <p className="text-sm text-gray-500 flex-1 mb-8 leading-relaxed">
              Registrar compras con descuento según los convenios vigentes en esta sucursal.
            </p>
            <button 
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-andes hover:bg-andes-dark text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Ingresar <ChevronRight size={18} />
            </button>
          </div>

          {/* Módulo Servicios */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate('/veterinaria/servicios')}>
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Stethoscope size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Servicios Veterinarios</h3>
            <p className="text-sm text-gray-500 flex-1 mb-8 leading-relaxed">
              Atender citas y registrar el uso de servicios asignados a los clientes.
            </p>
            <button 
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Ingresar <ChevronRight size={18} />
            </button>
          </div>

          {/* Módulo Referidos */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate('/veterinaria/referidos')}>
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Programa de Referidos</h3>
            <p className="text-sm text-gray-500 flex-1 mb-8 leading-relaxed">
              Inscribe a nuevos clientes al programa y gana recompensas por referidos.
            </p>
            <button 
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Ingresar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeterinariaHome;
