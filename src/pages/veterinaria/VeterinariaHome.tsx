import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Package, ShieldCheck, Users, Activity, CheckCircle2, Clock, AlertCircle, ChevronRight, UserPlus, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Cliente } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  selectedAgro?: any;
}

export default function VeterinariaHome({ selectedAgro }: Props) {
  const navigate = useNavigate();
  
  // KPIs
  const [stats, setStats] = useState({
    productosConvenio: 0,
    serviciosAsignados: 0,
    clientesAtendidos: 0,
    beneficiosEntregados: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Search State
  const [searchDni, setSearchDni] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  // Client Data
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [beneficioProducto, setBeneficioProducto] = useState<{ estado: 'Pendiente' | 'Utilizado', fecha?: string } | null>(null);
  const [servicios, setServicios] = useState<any[]>([]);

  // Load KPIs
  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedAgro) return;
      setLoadingStats(true);
      try {
        const { count: prodCount } = await supabase.from('agroveterinaria_productos')
          .select('*', { count: 'exact', head: true })
          .eq('agroveterinaria_id', selectedAgro.id);

        const { count: servAsignadosCount } = await supabase.from('cliente_servicios')
          .select('id, agroveterinaria_servicios!inner(agroveterinaria_id)', { count: 'exact', head: true })
          .eq('estado', 'Pendiente')
          .eq('agroveterinaria_servicios.agroveterinaria_id', selectedAgro.id);

        const { data: canjesData } = await supabase.from('canjes')
          .select('cliente_dni')
          .eq('agroveterinaria_id', selectedAgro.id);
          
        const { data: servUtilizadosData } = await supabase.from('cliente_servicios')
          .select('cliente_dni, agroveterinaria_servicios!inner(agroveterinaria_id)')
          .eq('estado', 'Utilizado')
          .eq('agroveterinaria_servicios.agroveterinaria_id', selectedAgro.id);

        const dnisSet = new Set<string>();
        let totalEntregados = 0;

        if (canjesData) {
          canjesData.forEach(c => dnisSet.add(c.cliente_dni));
          totalEntregados += canjesData.length;
        }
        
        if (servUtilizadosData) {
          servUtilizadosData.forEach(c => dnisSet.add(c.cliente_dni));
          totalEntregados += servUtilizadosData.length;
        }

        setStats({
          productosConvenio: prodCount || 0,
          serviciosAsignados: servAsignadosCount || 0,
          clientesAtendidos: dnisSet.size,
          beneficiosEntregados: totalEntregados
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [selectedAgro]);

  // Execute Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchDni.trim()) return;
    if (!selectedAgro) {
      toast.error('Seleccione un punto de atención');
      return;
    }

    setIsSearching(true);
    setSearchAttempted(true);
    setStatusError(null);
    setCliente(null);
    setBeneficioProducto(null);
    setServicios([]);

    try {
      // 1. Buscar Cliente
      const { data: clienteData, error: clientErr } = await supabase
        .from('clientes')
        .select('*, localidades(nombre)')
        .eq('dni', searchDni.trim())
        .single();

      if (clientErr || !clienteData) {
        setStatusError('not_found');
        setIsSearching(false);
        return;
      }
      setCliente(clienteData as Cliente);

      // 2. Verificar Beneficio de Productos (Canjes)
      // Buscamos si tiene algún canje de descuento general (producto_id IS NULL)
      const { data: canjeData } = await supabase
        .from('canjes')
        .select('id, fecha')
        .eq('cliente_dni', clienteData.dni)
        .is('producto_id', null)
        .maybeSingle();

      if (canjeData) {
        setBeneficioProducto({ estado: 'Utilizado', fecha: canjeData.fecha });
      } else {
        setBeneficioProducto({ estado: 'Pendiente' });
      }

      // 3. Verificar Servicios Veterinarios
      const { data: serviciosData } = await supabase
        .from('cliente_servicios')
        .select(`
          id,
          estado,
          fecha_asignacion,
          fecha_utilizacion,
          agroveterinaria_servicios!inner (
            agroveterinaria_id,
            servicios ( nombre )
          )
        `)
        .eq('cliente_dni', clienteData.dni)
        .eq('agroveterinaria_servicios.agroveterinaria_id', selectedAgro.id);

      if (serviciosData) {
        setServicios(serviciosData);
      }

    } catch (error) {
      console.error(error);
      toast.error('Error al realizar la búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  // Metrics for Resumen de Atención
  const numProductosDisponibles = beneficioProducto?.estado === 'Pendiente' ? 1 : 0;
  const numServiciosDisponibles = servicios.filter(s => s.estado === 'Pendiente' || s.estado === 'Reservado').length;
  const numBeneficiosUtilizados = (beneficioProducto?.estado === 'Utilizado' ? 1 : 0) + servicios.filter(s => s.estado === 'Utilizado').length;
  
  // Find latest date of usage
  let ultimaAtencion = null;
  const fechasAtencion = [];
  if (beneficioProducto?.fecha) fechasAtencion.push(new Date(beneficioProducto.fecha));
  servicios.filter(s => s.estado === 'Utilizado' && s.fecha_utilizacion).forEach(s => fechasAtencion.push(new Date(s.fecha_utilizacion)));
  
  if (fechasAtencion.length > 0) {
    ultimaAtencion = new Date(Math.max(...fechasAtencion.map(e => e.getTime())));
  }

  const hasAnyBenefits = beneficioProducto !== null || servicios.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      
      {/* Mini KPIs (Barra Superior) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Prod. Convenio</span>
          </div>
          <span className="font-bold text-gray-900">{loadingStats ? '-' : stats.productosConvenio}</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-purple-500" />
            <span className="text-xs text-gray-500 font-medium">Serv. Pendientes</span>
          </div>
          <span className="font-bold text-gray-900">{loadingStats ? '-' : stats.serviciosAsignados}</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-amber-500" />
            <span className="text-xs text-gray-500 font-medium">Clientes Atendidos</span>
          </div>
          <span className="font-bold text-gray-900">{loadingStats ? '-' : stats.clientesAtendidos}</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-500" />
            <span className="text-xs text-gray-500 font-medium">Entregados Hoy</span>
          </div>
          <span className="font-bold text-gray-900">{loadingStats ? '-' : stats.beneficiosEntregados}</span>
        </div>
      </div>

      {/* Buscador Central (Hero CRM) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-andes-dark p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pattern-dots.svg')] opacity-10"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Centro de Atención al Cliente</h1>
            <p className="text-andes-light mb-8 font-light">Ingrese el DNI del cliente para consultar y gestionar sus beneficios.</p>
            
            <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-32 py-4 border-0 rounded-2xl text-lg ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-andes shadow-lg"
                placeholder="Ej. 70000001"
                value={searchDni}
                onChange={(e) => setSearchDni(e.target.value)}
                disabled={isSearching}
                autoComplete="off"
              />
              <div className="absolute inset-y-2 right-2 flex items-center">
                <button
                  type="submit"
                  disabled={isSearching || !searchDni.trim()}
                  className="px-6 py-2 bg-andes hover:bg-andes-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Resultados de la Búsqueda */}
      {searchAttempted && !isSearching && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Cliente no encontrado */}
          {statusError === 'not_found' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <AlertCircle size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Cliente no encontrado</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">No hemos encontrado ningún cliente asociado al DNI <strong>{searchDni}</strong>. Verifique que el número sea correcto.</p>
              <button 
                onClick={() => navigate('/veterinaria/referidos')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium rounded-xl transition-colors border border-amber-200"
              >
                <UserPlus size={18} />
                Registrar Referido
              </button>
            </div>
          )}

          {/* Ficha del Cliente (CRM) */}
          {!statusError && cliente && (
            <div className="space-y-6">
              
              {/* Header Cliente & Resumen */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                {/* Info Principal */}
                <div className="p-6 md:p-8 flex-1 border-b md:border-b-0 md:border-r border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h2>
                        <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 size={12} /> Validado
                        </span>
                      </div>
                      <p className="text-gray-500 flex items-center gap-2">
                        <span className="font-mono text-sm">DNI: {cliente.dni}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-sm"><MapPin size={14}/> {(cliente as any).localidades?.nombre}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button 
                      onClick={() => navigate('/veterinaria/referidos')}
                      className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <UserPlus size={16} />
                      Registrar como Referido
                    </button>
                  </div>
                </div>

                {/* Resumen de Atención */}
                <div className="bg-gray-50 p-6 md:p-8 w-full md:w-80 shrink-0">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={14} /> Resumen de Atención
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Productos Disp.</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{numProductosDisponibles}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Servicios Disp.</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{numServiciosDisponibles}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Beneficios Usados</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{numBeneficiosUtilizados}</span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">Última Atención</span>
                        <span className="text-gray-700 font-medium text-xs">
                          {ultimaAtencion ? ultimaAtencion.toLocaleDateString('es-PE') : 'Nunca'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Si no tiene absolutamente ningún beneficio */}
              {!hasAnyBenefits && (
                 <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-8 text-center">
                   <Info size={32} className="text-blue-400 mx-auto mb-3" />
                   <h3 className="text-lg font-medium text-blue-900 mb-1">Sin beneficios asignados</h3>
                   <p className="text-blue-700/70 text-sm">No existen beneficios vigentes para este cliente en esta sucursal.</p>
                 </div>
              )}

              {/* Bloque Beneficios de Productos */}
              {beneficioProducto && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Package size={20} /></div>
                    <h3 className="text-lg font-bold text-gray-900">Beneficios de Productos</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Descuento General Convenio</h4>
                        <p className="text-sm text-gray-500">Aplica descuento en productos seleccionados.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Badge Estado */}
                        {beneficioProducto.estado === 'Pendiente' ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                            PENDIENTE
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                            UTILIZADO
                          </span>
                        )}

                        {/* Botón Acción */}
                        {beneficioProducto.estado === 'Pendiente' && (
                          <button 
                            onClick={() => navigate('/veterinaria/productos', { state: { dni: searchDni } })}
                            className="flex items-center gap-2 bg-andes hover:bg-andes-dark text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                          >
                            Canjear <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloque Servicios Veterinarios */}
              {servicios.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><ShieldCheck size={20} /></div>
                    <h3 className="text-lg font-bold text-gray-900">Servicios Veterinarios</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {servicios.map((s, idx) => {
                        const srvName = s.agroveterinaria_servicios?.servicios?.nombre || 'Servicio Desconocido';
                        
                        // Determinar color de badge
                        let badgeColor = 'bg-gray-50 text-gray-600 border-gray-200';
                        if (s.estado === 'Pendiente') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        if (s.estado === 'Reservado') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        if (s.estado === 'Utilizado') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        if (s.estado === 'Vencido') badgeColor = 'bg-gray-100 text-gray-500 border-gray-300';

                        return (
                          <div key={s.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-colors">
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">{srvName}</h4>
                              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                <Clock size={14} /> Asignado: {new Date(s.fecha_asignacion).toLocaleDateString('es-PE')}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${badgeColor}`}>
                                {s.estado.toUpperCase()}
                              </span>

                              {(s.estado === 'Pendiente' || s.estado === 'Reservado') && (
                                <button 
                                  onClick={() => navigate('/veterinaria/servicios', { state: { dni: searchDni } })}
                                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                                >
                                  Registrar atención <ChevronRight size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
