import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Package, ShieldCheck, CheckCircle2, Clock, AlertCircle, ChevronRight, CalendarDays, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Cliente } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  selectedAgro?: any;
}

export default function VeterinariaHome({ selectedAgro }: Props) {
  const navigate = useNavigate();
  
  // Search State
  const [searchDni, setSearchDni] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  // Client Data
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [beneficiosProducto, setBeneficiosProducto] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

  // Execute Search
  const handleSearch = async (e?: React.FormEvent, dniToSearch?: string) => {
    if (e) e.preventDefault();
    
    const targetDni = (dniToSearch || searchDni).trim();
    if (!targetDni) return;
    
    if (!selectedAgro) {
      toast.error('Seleccione un punto de atención');
      return;
    }

    setIsSearching(true);
    setSearchAttempted(true);
    setStatusError(null);
    setCliente(null);
    setBeneficiosProducto([]);
    setServicios([]);

    try {
      // Guardar en sessionStorage para persistencia de navegacion
      sessionStorage.setItem('veterinaria_last_dni', targetDni);

      // 1. Buscar Cliente
      const { data: clienteData, error: clientErr } = await supabase
        .from('clientes')
        .select('*, localidades(nombre)')
        .eq('dni', targetDni)
        .single();

      if (clientErr || !clienteData) {
        setStatusError('not_found');
        setIsSearching(false);
        return;
      }
      setCliente(clienteData as Cliente);

      // 2. Verificar Beneficios de Productos (Canjes)
      const { data: canjeData } = await supabase
        .from('canjes')
        .select('id, fecha')
        .eq('cliente_dni', clienteData.dni)
        .is('producto_id', null)
        .maybeSingle();

      // Convertimos el beneficio general a un array para que sea escalable (como pediste)
      if (canjeData) {
        setBeneficiosProducto([{ 
          id: canjeData.id, 
          nombre: 'Descuento General Convenio', 
          descripcion: 'Aplica descuento porcentual en compras seleccionadas.',
          estado: 'Utilizado', 
          fecha: canjeData.fecha 
        }]);
      } else {
        setBeneficiosProducto([{ 
          id: 'desc-gen', 
          nombre: 'Descuento General Convenio', 
          descripcion: 'Aplica descuento porcentual en compras seleccionadas.',
          estado: 'Pendiente' 
        }]);
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

  const handleClear = () => {
    setSearchDni('');
    setCliente(null);
    setSearchAttempted(false);
    setStatusError(null);
    setBeneficiosProducto([]);
    setServicios([]);
    sessionStorage.removeItem('veterinaria_last_dni');
  };

  // Restore last search from memory
  useEffect(() => {
    if (selectedAgro) {
      const lastDni = sessionStorage.getItem('veterinaria_last_dni');
      if (lastDni && !cliente && !isSearching && !searchAttempted) {
        setSearchDni(lastDni);
        handleSearch(undefined, lastDni);
      }
    }
  }, [selectedAgro]);

  // Metrics for Resumen
  const numProductosDisponibles = beneficiosProducto.filter(b => b.estado === 'Pendiente').length;
  const numServiciosDisponibles = servicios.filter(s => s.estado === 'Pendiente' || s.estado === 'Reservado').length;
  const numBeneficiosUtilizados = beneficiosProducto.filter(b => b.estado === 'Utilizado').length + servicios.filter(s => s.estado === 'Utilizado').length;
  
  // Historial Reciente (ordenado por fecha)
  const historialRaw: { nombre: string; fecha: Date; tipo: string }[] = [];
  
  beneficiosProducto.filter(b => b.estado === 'Utilizado' && b.fecha).forEach(b => {
    historialRaw.push({ nombre: b.nombre, fecha: new Date(b.fecha), tipo: 'Producto' });
  });
  
  servicios.filter(s => s.estado === 'Utilizado' && s.fecha_utilizacion).forEach(s => {
    historialRaw.push({ nombre: s.agroveterinaria_servicios?.servicios?.nombre || 'Servicio', fecha: new Date(s.fecha_utilizacion), tipo: 'Servicio' });
  });

  const historial = historialRaw.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 3);
  const ultimaAtencion = historial.length > 0 ? historial[0].fecha : null;
  const hasAnyBenefits = beneficiosProducto.length > 0 || servicios.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      
      {/* 1. Banner Institucional */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg bg-andes-dark min-h-[260px] flex flex-col justify-center border border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero-agroveterinaria.jpg" 
            alt="Fondo agro" 
            className="w-full h-full object-cover object-center opacity-40 mix-blend-overlay"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-andes-dark via-andes-dark/90 to-andes-dark/50"></div>
        </div>
        
        <div className="relative z-10 p-8 md:p-12 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl text-white">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">Portal Agroveterinaria</h1>
            <p className="text-blue-100/80 text-base md:text-lg leading-relaxed font-light">
              Centro de operaciones para gestionar beneficios de clientes.
            </p>
          </div>

          {selectedAgro && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl max-w-sm w-full shrink-0">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2 opacity-80">
                <MapPin size={12} /> Punto de atención actual
              </p>
              <h2 className="text-2xl font-bold text-white leading-tight mb-1">
                {selectedAgro.nombre}
              </h2>
              <p className="text-white/80 font-medium text-sm">
                {(selectedAgro as any).localidades?.nombre || 'Localidad Desconocida'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Buscador Central */}
      <div className="relative -mt-16 z-20 px-4 md:px-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <div className="pl-6 pr-4 py-4 pointer-events-none text-gray-400">
              <Search className="h-6 w-6" />
            </div>
            <input
              type="text"
              className="flex-1 w-full py-4 text-xl font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal bg-transparent border-0 focus:ring-0 outline-none"
              placeholder="Buscar cliente por DNI..."
              value={searchDni}
              onChange={(e) => {
                const val = e.target.value;
                setSearchDni(val);
                if (val.trim() === '') {
                  handleClear();
                }
              }}
              disabled={isSearching}
              autoComplete="off"
            />
            {searchDni && !isSearching && (
              <button 
                type="button" 
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-2"
              >
                <X size={20} />
              </button>
            )}
            <div className="pr-2 pl-2">
              <button
                type="submit"
                disabled={isSearching || !searchDni.trim()}
                className="px-8 py-3.5 bg-andes hover:bg-andes-dark text-white rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Resultados de la Búsqueda */}
      {searchAttempted && !isSearching && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 fade-in px-2 md:px-4">
          
          {/* Cliente no encontrado */}
          {statusError === 'not_found' && (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-lg shadow-gray-200/40 max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-gray-100">
                <Search size={32} className="text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Cliente no encontrado</h3>
              <p className="text-gray-500">No existe un cliente asociado al DNI <strong className="text-gray-800">{searchDni}</strong> dentro del programa piloto de beneficios. Por favor, verifique el número.</p>
            </div>
          )}

          {/* Ficha del Cliente (CRM) */}
          {!statusError && cliente && (
            <div className="space-y-6 max-w-6xl mx-auto">
              
              {/* 3. Tarjeta del Cliente y Resumen/Historial */}
              <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden relative flex flex-col lg:flex-row">
                <div className="absolute top-0 left-0 w-2 h-full bg-andes hidden lg:block"></div>
                <div className="absolute top-0 left-0 w-full h-2 bg-andes lg:hidden"></div>
                
                {/* Datos y KPIs de Cliente */}
                <div className="p-8 lg:p-10 flex-1 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-[11px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        <CheckCircle2 size={12} strokeWidth={3} /> Validado
                      </span>
                      <span className="text-gray-400 text-sm font-medium">Cliente Caja Los Andes</span>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                      {cliente.nombre}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-6 text-gray-600 font-medium mb-8">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-100 p-1.5 rounded-md"><AlertCircle size={16} className="text-gray-500" /></div>
                        <span>DNI: <span className="text-gray-900">{cliente.dni}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-100 p-1.5 rounded-md"><MapPin size={16} className="text-gray-500" /></div>
                        <span>Sede: <span className="text-gray-900">{(cliente as any).localidades?.nombre}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen en Fila */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Productos Disp.</p>
                      <p className="text-xl font-bold text-gray-900">{numProductosDisponibles}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Servicios Disp.</p>
                      <p className="text-xl font-bold text-gray-900">{numServiciosDisponibles}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Beneficios Usados</p>
                      <p className="text-xl font-bold text-emerald-600">{numBeneficiosUtilizados}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">Última Atención</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{ultimaAtencion ? ultimaAtencion.toLocaleDateString('es-PE') : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Historial Reciente */}
                <div className="bg-white p-8 lg:p-10 lg:w-96 shrink-0 flex flex-col">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History size={16} className="text-andes" /> Últimas Atenciones
                  </h3>
                  
                  {historial.length > 0 ? (
                    <div className="space-y-5 flex-1">
                      {historial.map((h, i) => (
                        <div key={i} className="flex gap-4 relative">
                          {i !== historial.length -1 && (
                            <div className="absolute left-4 top-8 bottom-[-20px] w-0.5 bg-gray-100"></div>
                          )}
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 z-10">
                            <CheckCircle2 size={16} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{h.nombre}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{h.fecha.toLocaleDateString('es-PE')}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider">{h.tipo}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                      <Clock size={32} className="text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500 font-medium">Este cliente aún no registra atenciones dentro del programa.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Si no tiene absolutamente ningún beneficio */}
              {!hasAnyBenefits && (
                 <div className="bg-gray-50 rounded-3xl border border-gray-200 p-12 text-center border-dashed mt-8">
                   <AlertCircle size={40} className="text-gray-400 mx-auto mb-4" />
                   <h3 className="text-xl font-bold text-gray-800 mb-2">Este cliente actualmente no posee beneficios vigentes dentro del programa.</h3>
                 </div>
              )}

              {/* 4. Grid de Beneficios (2 Columnas) */}
              {hasAnyBenefits && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  
                  {/* Columna Productos */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 pl-2">
                      <Package className="text-blue-600" size={24} /> Productos
                    </h3>
                    
                    {beneficiosProducto.length > 0 ? (
                      beneficiosProducto.map((bp) => (
                        <div key={bp.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group flex flex-col justify-between min-h-[160px]">
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-bold text-gray-900 text-lg">{bp.nombre}</h4>
                              {bp.estado === 'Pendiente' ? (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> PENDIENTE
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shrink-0 ml-2">
                                  <CheckCircle2 size={12} strokeWidth={3} /> UTILIZADO
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{bp.descripcion}</p>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-6">
                              <CalendarDays size={14} /> Vigencia: 31/12/2026
                            </div>
                          </div>
                          
                          <div className="mt-auto">
                            {bp.estado === 'Pendiente' ? (
                              <button 
                                onClick={() => navigate('/veterinaria/productos', { state: { dni: searchDni } })}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-andes hover:bg-andes-dark text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
                              >
                                Canjear beneficio <ChevronRight size={16} />
                              </button>
                            ) : (
                              <div className="bg-gray-50 text-gray-500 text-sm font-medium px-4 py-2.5 rounded-xl text-left border border-gray-100 flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500" /> Beneficio ya canjeado
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center border-dashed h-full flex flex-col items-center justify-center">
                        <Package size={32} className="text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Este cliente actualmente no tiene beneficios de productos disponibles.</p>
                      </div>
                    )}
                  </div>

                  {/* Columna Servicios */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 pl-2">
                      <ShieldCheck className="text-purple-600" size={24} /> Servicios Veterinarios
                    </h3>
                    
                    {servicios.length > 0 ? (
                      servicios.map((s, idx) => {
                        const srvName = s.agroveterinaria_servicios?.servicios?.nombre || 'Servicio Desconocido';
                        
                        let badgeUI = <span className="bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide shrink-0 ml-2">DESCONOCIDO</span>;
                        
                        if (s.estado === 'Pendiente') {
                          badgeUI = (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> PENDIENTE
                            </span>
                          );
                        } else if (s.estado === 'Reservado') {
                          badgeUI = (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> RESERVADO
                            </span>
                          );
                        } else if (s.estado === 'Utilizado') {
                          badgeUI = (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 shrink-0 ml-2">
                              <CheckCircle2 size={12} strokeWidth={3} /> UTILIZADO
                            </span>
                          );
                        } else if (s.estado === 'Vencido') {
                          badgeUI = (
                            <span className="bg-gray-100 text-gray-500 border border-gray-300 px-3 py-1 rounded-full text-xs font-bold tracking-wide shrink-0 ml-2">
                              VENCIDO
                            </span>
                          );
                        }

                        return (
                          <div key={s.id || idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group flex flex-col justify-between min-h-[160px]">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-gray-900 text-lg">{srvName}</h4>
                                {badgeUI}
                              </div>
                              <p className="text-sm text-gray-500 mb-4">Cobertura total o parcial de atención veterinaria según el plan asignado.</p>
                              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-6">
                                <CalendarDays size={14} /> Asignado: {new Date(s.fecha_asignacion).toLocaleDateString('es-PE')}
                              </div>
                            </div>
                            
                            <div className="mt-auto">
                              {(s.estado === 'Pendiente' || s.estado === 'Reservado') ? (
                                <button 
                                  onClick={() => navigate('/veterinaria/servicios', { state: { dni: searchDni } })}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
                                >
                                  Registrar atención <ChevronRight size={16} />
                                </button>
                              ) : (
                                <div className="bg-gray-50 text-gray-500 text-sm font-medium px-4 py-2.5 rounded-xl text-left border border-gray-100 flex items-center gap-2">
                                  <CheckCircle2 size={16} className="text-gray-400" /> {s.estado === 'Utilizado' ? 'Atención ya registrada' : 'Beneficio vencido'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center border-dashed h-full flex flex-col items-center justify-center">
                        <ShieldCheck size={32} className="text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Este cliente actualmente no tiene servicios veterinarios asignados.</p>
                      </div>
                    )}
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
