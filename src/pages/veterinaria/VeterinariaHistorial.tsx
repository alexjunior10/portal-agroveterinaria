import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Package, ShieldCheck, Calendar, Clock, X, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// 1. Estructura Común (Future-proof)
export interface OperacionHistorial {
  id: string;
  fecha: Date;
  clienteNombre: string;
  clienteDni: string;
  tipo: 'Producto' | 'Servicio';
  beneficio: string;
  estado: 'Utilizado' | 'Reservado' | 'Pendiente' | 'Vencido';
  usuarioRegistro?: string;
  agroveterinariaId: string;
  // Metadata adicional para el modal
  montoDescontado?: number;
  totalPagado?: number;
}

interface Props {
  selectedAgroId: string;
}

export default function VeterinariaHistorial({ selectedAgroId }: Props) {
  const [loading, setLoading] = useState(true);
  const [operaciones, setOperaciones] = useState<OperacionHistorial[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'Todos' | 'Producto' | 'Servicio'>('Todos');
  const [filterTiempo, setFilterTiempo] = useState<'Todos' | 'Hoy' | 'Semana'>('Todos');
  
  // Modal State
  const [selectedOp, setSelectedOp] = useState<OperacionHistorial | null>(null);

  useEffect(() => {
    if (!selectedAgroId) return;
    fetchHistorial();
  }, [selectedAgroId]);

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      // 1. Obtener Canjes (Productos)
      const { data: canjesData, error: errCanjes } = await supabase
        .from('canjes')
        .select(`
          id,
          fecha,
          cliente_dni,
          monto_descontado,
          total_pagado,
          usuario_atencion,
          producto_id,
          clientes ( nombre )
        `)
        .eq('agroveterinaria_id', selectedAgroId);

      // 2. Obtener Servicios
      const { data: serviciosData, error: errServicios } = await supabase
        .from('cliente_servicios')
        .select(`
          id,
          fecha_utilizacion,
          estado,
          cliente_dni,
          usuario_atencion,
          clientes ( nombre ),
          agroveterinaria_servicios!inner (
            agroveterinaria_id,
            servicios ( nombre )
          )
        `)
        .eq('agroveterinaria_servicios.agroveterinaria_id', selectedAgroId)
        .eq('estado', 'Utilizado'); // Historial usualmente son operaciones ejecutadas

      if (errCanjes) console.error("Error canjes:", errCanjes);
      if (errServicios) console.error("Error servicios:", errServicios);

      const ops: OperacionHistorial[] = [];

      // Mapear Canjes
      if (canjesData) {
        canjesData.forEach((c: any) => {
          ops.push({
            id: c.id,
            fecha: new Date(c.fecha),
            clienteNombre: c.clientes?.nombre || 'Desconocido',
            clienteDni: c.cliente_dni,
            tipo: 'Producto',
            beneficio: c.producto_id ? 'Producto Específico' : 'Descuento General Convenio',
            estado: 'Utilizado',
            usuarioRegistro: c.usuario_atencion || 'Sistema',
            agroveterinariaId: selectedAgroId,
            montoDescontado: c.monto_descontado,
            totalPagado: c.total_pagado
          });
        });
      }

      // Mapear Servicios
      if (serviciosData) {
        serviciosData.forEach((s: any) => {
          ops.push({
            id: s.id,
            fecha: s.fecha_utilizacion ? new Date(s.fecha_utilizacion) : new Date(), // fallback
            clienteNombre: s.clientes?.nombre || 'Desconocido',
            clienteDni: s.cliente_dni,
            tipo: 'Servicio',
            beneficio: s.agroveterinaria_servicios?.servicios?.nombre || 'Servicio General',
            estado: s.estado as any,
            usuarioRegistro: s.usuario_atencion || 'Sistema',
            agroveterinariaId: selectedAgroId
          });
        });
      }

      // Ordenar por fecha descendente
      ops.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      
      setOperaciones(ops);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado reactivo
  const filteredOperaciones = useMemo(() => {
    let result = operaciones;

    // Filtro de Búsqueda única (Nombre o DNI)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(op => 
        op.clienteNombre.toLowerCase().includes(q) || 
        op.clienteDni.includes(q) ||
        op.beneficio.toLowerCase().includes(q)
      );
    }

    // Filtro Tipo
    if (filterTipo !== 'Todos') {
      result = result.filter(op => op.tipo === filterTipo);
    }

    // Filtro Tiempo
    if (filterTiempo !== 'Todos') {
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      
      if (filterTiempo === 'Hoy') {
        result = result.filter(op => op.fecha >= hoy);
      } else if (filterTiempo === 'Semana') {
        const haceUnaSemana = new Date(hoy);
        haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
        result = result.filter(op => op.fecha >= haceUnaSemana);
      }
    }

    return result;
  }, [operaciones, searchTerm, filterTipo, filterTiempo]);

  // KPIs
  const kpis = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const opsHoy = operaciones.filter(op => op.fecha >= hoy);
    
    // Clientes únicos históricos vs hoy
    const clientesUnicosTotal = new Set(operaciones.map(op => op.clienteDni)).size;
    const clientesUnicosHoy = new Set(opsHoy.map(op => op.clienteDni)).size;

    return {
      totalOps: operaciones.length,
      totalProductos: operaciones.filter(op => op.tipo === 'Producto').length,
      totalServicios: operaciones.filter(op => op.tipo === 'Servicio').length,
      clientesUnicos: clientesUnicosTotal,
      
      hoyOps: opsHoy.length,
      hoyProductos: opsHoy.filter(op => op.tipo === 'Producto').length,
      hoyServicios: opsHoy.filter(op => op.tipo === 'Servicio').length,
      hoyClientes: clientesUnicosHoy
    };
  }, [operaciones]);

  const renderBadge = (estado: string) => {
    switch(estado) {
      case 'Utilizado': return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Utilizado</span>;
      case 'Reservado': return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Reservado</span>;
      case 'Pendiente': return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Pendiente</span>;
      default: return <span className="bg-gray-100 text-gray-500 border border-gray-300 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide w-max">Vencido</span>;
    }
  };

  const renderTipoBadge = (tipo: string) => {
    return tipo === 'Producto' 
      ? <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-bold"><Package size={12}/> Producto</span>
      : <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-1 rounded text-xs font-bold"><ShieldCheck size={12}/> Servicio</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Historial de Operaciones</h2>
          <p className="text-sm text-gray-500 mt-1">Registro y trazabilidad de todos los beneficios entregados en tu sede.</p>
        </div>
      </div>

      {/* KPIs Superiores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><FileText size={20} /></div>
            <p className="text-sm font-semibold text-gray-500">Total Operaciones</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900">{kpis.totalOps}</h3>
            <span className="text-xs text-gray-500 font-medium">({kpis.hoyOps} hoy)</span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><CheckCircle2 size={20} /></div>
            <p className="text-sm font-semibold text-gray-500">Clientes Únicos</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900">{kpis.clientesUnicos}</h3>
            <span className="text-xs text-gray-500 font-medium">({kpis.hoyClientes} hoy)</span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Package size={20} /></div>
            <p className="text-sm font-semibold text-gray-500">Prods. Registrados</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900">{kpis.totalProductos}</h3>
            <span className="text-xs text-gray-500 font-medium">({kpis.hoyProductos} hoy)</span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><ShieldCheck size={20} /></div>
            <p className="text-sm font-semibold text-gray-500">Servs. Registrados</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900">{kpis.totalServicios}</h3>
            <span className="text-xs text-gray-500 font-medium">({kpis.hoyServicios} hoy)</span>
          </div>
        </div>
      </div>

      {/* Controles de Filtro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between">
        
        {/* Buscador Único */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-andes focus:border-andes sm:text-sm transition-all"
            placeholder="Buscar por DNI o Nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Chips de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-500 mr-2 flex items-center gap-1"><Filter size={16}/> Filtros:</span>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilterTipo('Todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterTipo === 'Todos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >Todos</button>
            <button 
              onClick={() => setFilterTipo('Producto')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterTipo === 'Producto' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >Productos</button>
            <button 
              onClick={() => setFilterTipo('Servicio')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterTipo === 'Servicio' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >Servicios</button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg ml-2">
            <button 
              onClick={() => setFilterTiempo('Todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterTiempo === 'Todos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >Siempre</button>
            <button 
              onClick={() => setFilterTiempo('Semana')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterTiempo === 'Semana' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >Esta semana</button>
            <button 
              onClick={() => setFilterTiempo('Hoy')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterTiempo === 'Hoy' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >Hoy</button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Fecha / Hora</th>
                <th className="px-6 py-4 font-bold">Cliente</th>
                <th className="px-6 py-4 font-bold">DNI</th>
                <th className="px-6 py-4 font-bold">Tipo de Operación</th>
                <th className="px-6 py-4 font-bold">Beneficio / Servicio</th>
                <th className="px-6 py-4 font-bold">Estado</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center mb-2"><Clock size={24} className="animate-spin text-andes"/></div>
                    Cargando historial de operaciones...
                  </td>
                </tr>
              ) : filteredOperaciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center mb-2"><Search size={24} className="text-gray-300"/></div>
                    No se encontraron operaciones con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredOperaciones.map((op) => (
                  <tr key={op.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{op.fecha.toLocaleDateString('es-PE')}</span>
                        <span className="text-xs text-gray-500">{op.fecha.toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{op.clienteNombre}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{op.clienteDni}</td>
                    <td className="px-6 py-4">{renderTipoBadge(op.tipo)}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{op.beneficio}</td>
                    <td className="px-6 py-4">{renderBadge(op.estado)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOp(op)}
                        className="text-andes hover:text-andes-dark p-2 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle */}
      {selectedOp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 border-b flex items-start justify-between text-white ${selectedOp.tipo === 'Producto' ? 'bg-blue-600' : 'bg-purple-600'}`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1 block">
                  Detalle de la Operación
                </span>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {selectedOp.tipo === 'Producto' ? <Package size={20}/> : <ShieldCheck size={20}/>}
                  {selectedOp.beneficio}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOp(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase">Estado</span>
                  <div className="mt-1">{renderBadge(selectedOp.estado)}</div>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs text-gray-500 font-bold uppercase">Fecha de Registro</span>
                  <span className="font-semibold text-gray-900 mt-1">{selectedOp.fecha.toLocaleDateString('es-PE')}</span>
                  <span className="text-xs text-gray-500">{selectedOp.fecha.toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Información del Cliente</h4>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 text-sm">Nombre completo</span>
                    <span className="font-bold text-gray-900 text-sm text-right">{selectedOp.clienteNombre}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 text-sm">DNI</span>
                    <span className="font-mono text-gray-900 text-sm text-right">{selectedOp.clienteDni}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Datos Técnicos</h4>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 text-sm">ID Operación</span>
                    <span className="font-mono text-gray-400 text-xs text-right max-w-[200px] truncate" title={selectedOp.id}>{selectedOp.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 text-sm">Registrado por</span>
                    <span className="font-medium text-gray-900 text-sm text-right">{selectedOp.usuarioRegistro}</span>
                  </div>
                  
                  {selectedOp.tipo === 'Producto' && (
                    <>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">Monto Descontado</span>
                        <span className="font-bold text-emerald-600 text-sm text-right">S/ {selectedOp.montoDescontado?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500 text-sm">Total Pagado</span>
                        <span className="font-bold text-gray-900 text-sm text-right">S/ {selectedOp.totalPagado?.toFixed(2) || '0.00'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedOp(null)}
                className="px-6 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition-colors"
              >
                Cerrar panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
