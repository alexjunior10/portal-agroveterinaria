import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Stethoscope, Loader2, Search, X, Plus, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

type Servicio = { id: string, nombre: string };
type Agroveterinaria = { id: string, nombre: string, localidad_id: string };
type ConfigCupo = { 
  id: string; 
  agroveterinaria_id: string; 
  servicio_id: string; 
  cupo_total: number; 
  servicio: Servicio;
  agroveterinaria: Agroveterinaria;
};

type Asignacion = {
  id: string;
  agro_servicio_id: string;
  estado: string;
  fecha_asignacion: string;
  fecha_utilizacion?: string;
  agroveterinaria_nombre?: string;
  servicio_nombre?: string;
};

type ClienteDisplay = {
  dni: string;
  nombre: string;
  localidad_id: string;
  localidad_nombre: string;
  asignaciones: Asignacion[];
};

const AdminServicios = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  const [clientes, setClientes] = useState<ClienteDisplay[]>([]);
  const [configCupos, setConfigCupos] = useState<ConfigCupo[]>([]);
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});
  const [uniqueLocalidades, setUniqueLocalidades] = useState<string[]>([]);

  // Filtros
  const [searchDni, setSearchDni] = useState('');
  const [searchNombre, setSearchNombre] = useState('');
  const [filterLocalidad, setFilterLocalidad] = useState('');
  
  // Modal de Cliente
  const [selectedCliente, setSelectedCliente] = useState<ClienteDisplay | null>(null);
  const [newAsignacionId, setNewAsignacionId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Obtener configuración de cupos (agroveterinaria_servicios)
    const { data: cfgData } = await supabase
      .from('agroveterinaria_servicios')
      .select(`
        id, 
        agroveterinaria_id, 
        servicio_id, 
        cupo_total, 
        servicio:servicios(id, nombre),
        agroveterinaria:agroveterinarias(id, nombre, localidad_id)
      `);
      
    if (cfgData) {
      // @ts-ignore
      setConfigCupos(cfgData);
    }

    // 2. Obtener Clientes
    const { data: cliData } = await supabase
      .from('clientes')
      .select('dni, nombre, localidad_id, localidades(nombre)');

    // 3. Obtener Asignaciones (cliente_servicios)
    const { data: asigData } = await supabase
      .from('cliente_servicios')
      .select('*')
      .order('fecha_asignacion', { ascending: false });

    const stats: Record<string, number> = {};
    const asignacionesByDni: Record<string, Asignacion[]> = {};
    
    if (asigData && cfgData) {
      asigData.forEach(a => {
        // Contar uso para cupos (solo Pendiente o Utilizado consumen cupo)
        if (a.estado !== 'Cancelado') {
          stats[a.agro_servicio_id] = (stats[a.agro_servicio_id] || 0) + 1;
        }

        // Agrupar asignaciones por cliente
        if (!asignacionesByDni[a.cliente_dni]) {
          asignacionesByDni[a.cliente_dni] = [];
        }

        // Enriquecer la asignacion con nombres
        // @ts-ignore
        const cfg = cfgData.find(c => c.id === a.agro_servicio_id);
        
        asignacionesByDni[a.cliente_dni].push({
          id: a.id,
          agro_servicio_id: a.agro_servicio_id,
          estado: a.estado,
          fecha_asignacion: a.fecha_asignacion,
          fecha_utilizacion: a.fecha_utilizacion,
          agroveterinaria_nombre: cfg?.agroveterinaria?.nombre || 'Desconocida',
          servicio_nombre: cfg?.servicio?.nombre || 'Desconocido'
        });
      });
    }
    
    setUsageStats(stats);

    if (cliData) {
      const locSet = new Set<string>();
      const processed: ClienteDisplay[] = cliData.map(c => {
        // @ts-ignore
        const locName = Array.isArray(c.localidades) ? c.localidades[0]?.nombre : c.localidades?.nombre;
        if (locName) locSet.add(locName);

        return {
          dni: c.dni,
          nombre: c.nombre,
          localidad_id: c.localidad_id,
          localidad_nombre: locName || 'Sin Localidad',
          asignaciones: asignacionesByDni[c.dni] || []
        };
      });
      setClientes(processed);
      setUniqueLocalidades(Array.from(locSet).sort());

      // Update selected client if modal is open
      if (selectedCliente) {
        const updated = processed.find(p => p.dni === selectedCliente.dni);
        if (updated) setSelectedCliente(updated);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async () => {
    if (!selectedCliente || !newAsignacionId) return;
    
    setSaving('new');
    try {
      const currentUsage = usageStats[newAsignacionId] || 0;
      const config = configCupos.find(c => c.id === newAsignacionId);
      
      if (!config) throw new Error("Configuración no encontrada");

      if (currentUsage >= config.cupo_total) {
        toast.error(`Sin cupos disponibles para ${config.servicio.nombre}`);
        setSaving(null);
        return;
      }

      // Check for duplicates
      const alreadyAssigned = selectedCliente.asignaciones.find(
        a => a.agro_servicio_id === newAsignacionId && (a.estado === 'Pendiente' || a.estado === 'Utilizado')
      );

      if (alreadyAssigned) {
        toast.error(`El cliente ya tiene asignado este servicio`);
        setSaving(null);
        return;
      }

      const { error } = await supabase.from('cliente_servicios').insert({
        cliente_dni: selectedCliente.dni,
        agro_servicio_id: newAsignacionId,
        usuario_asignacion: 'Admin'
      });

      if (error) throw error;
      
      toast.success("Servicio asignado correctamente");
      setNewAsignacionId('');
      await fetchData(); 

    } catch (e: any) {
      toast.error("Error al asignar: " + e.message);
    }
    setSaving(null);
  };

  const handleCancelAssignment = async (asignacionId: string) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta asignación? El beneficio pasará a estado 'Cancelado' y el cupo será devuelto a la agroveterinaria.")) return;
    
    setSaving(asignacionId);
    try {
      const { error } = await supabase.from('cliente_servicios').update({ estado: 'Cancelado' }).eq('id', asignacionId);
      if (error) throw error;
      
      toast.success("Asignación cancelada");
      await fetchData();
    } catch(e: any) {
      toast.error("Error al cancelar: " + e.message);
    }
    setSaving(null);
  };

  // Filtrado de Clientes
  const filteredClientes = clientes.filter(c => {
    const matchDni = c.dni.includes(searchDni);
    const matchNombre = c.nombre.toLowerCase().includes(searchNombre.toLowerCase());
    const matchLoc = !filterLocalidad || c.localidad_nombre === filterLocalidad;
    return matchDni && matchNombre && matchLoc;
  });

  // Opciones disponibles para el cliente seleccionado
  const availableServices = selectedCliente 
    ? configCupos.filter(c => c.agroveterinaria.localidad_id === selectedCliente.localidad_id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <Stethoscope size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-textMain">Asignación de Servicios</h2>
          <p className="text-gray-500 text-sm">Gestiona beneficios de servicios veterinarios centrados en el cliente.</p>
        </div>
      </div>

      {/* Filtros Generales */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por DNI..." 
              className="input-field pl-9 py-2 text-sm"
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Buscar por Nombre..." 
              className="input-field py-2 text-sm w-full"
              value={searchNombre}
              onChange={(e) => setSearchNombre(e.target.value)}
            />
          </div>
          <select 
            className="input-field py-2 text-sm flex-1"
            value={filterLocalidad}
            onChange={(e) => setFilterLocalidad(e.target.value)}
          >
            <option value="">Todas las localidades</option>
            {uniqueLocalidades.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Localidad</th>
                <th className="p-4 font-semibold text-center">Beneficios Asignados</th>
                <th className="p-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Cargando clientes...</td></tr>
              ) : filteredClientes.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No se encontraron clientes</td></tr>
              ) : (
                filteredClientes.map(cli => {
                  const pendientes = cli.asignaciones.filter(a => a.estado === 'Pendiente').length;
                  const utilizados = cli.asignaciones.filter(a => a.estado === 'Utilizado').length;
                  
                  return (
                    <tr key={cli.dni} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-medium text-textMain">{cli.nombre}</div>
                        <div className="text-xs text-gray-500">DNI: {cli.dni}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-700">{cli.localidad_nombre}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {pendientes > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-medium">{pendientes} Pendientes</span>}
                          {utilizados > 0 && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">{utilizados} Utilizados</span>}
                          {cli.asignaciones.length === 0 && <span className="text-gray-400 text-xs italic">Sin beneficios</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedCliente(cli)}
                          className="btn-secondary text-sm py-1.5 px-3 whitespace-nowrap"
                        >
                          Gestionar Beneficios
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Gestión por Cliente */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h2 className="text-xl font-bold text-textMain">Gestión de Beneficios</h2>
                <div className="flex gap-4 text-sm text-gray-500 mt-1">
                  <span><strong className="text-gray-700">{selectedCliente.nombre}</strong></span>
                  <span>DNI: {selectedCliente.dni}</span>
                  <span>Localidad: {selectedCliente.localidad_nombre}</span>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCliente(null); setNewAsignacionId(''); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6 overflow-y-auto">
              
              {/* Sección de Asignación */}
              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Plus size={18} />
                  Asignar Nuevo Beneficio
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    className="input-field py-2 text-sm flex-1 bg-white"
                    value={newAsignacionId}
                    onChange={(e) => setNewAsignacionId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Servicio Disponible --</option>
                    {availableServices.map(cfg => {
                      const used = usageStats[cfg.id] || 0;
                      const remaining = cfg.cupo_total - used;
                      const isFull = remaining <= 0;
                      return (
                        <option key={cfg.id} value={cfg.id} disabled={isFull}>
                          {cfg.servicio.nombre} en {cfg.agroveterinaria.nombre} {isFull ? '(Sin cupos)' : `(${remaining} cupos disp.)`}
                        </option>
                      )
                    })}
                  </select>
                  <button 
                    onClick={handleAssign}
                    disabled={!newAsignacionId || saving === 'new'}
                    className="btn-primary py-2 px-4 whitespace-nowrap flex items-center justify-center min-w-[120px]"
                  >
                    {saving === 'new' ? <Loader2 size={16} className="animate-spin" /> : 'Asignar Servicio'}
                  </button>
                </div>
              </div>

              {/* Historial de Asignaciones */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CalendarDays size={18} />
                  Beneficios del Cliente
                </h3>
                
                {selectedCliente.asignaciones.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-gray-500">Este cliente aún no tiene beneficios asignados.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="p-3 font-semibold text-gray-600">Servicio / Agroveterinaria</th>
                          <th className="p-3 font-semibold text-gray-600">Estado</th>
                          <th className="p-3 font-semibold text-gray-600">Fechas</th>
                          <th className="p-3 font-semibold text-right text-gray-600">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedCliente.asignaciones.map(asig => (
                          <tr key={asig.id} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="font-medium text-textMain">{asig.servicio_nombre}</div>
                              <div className="text-xs text-gray-500">{asig.agroveterinaria_nombre}</div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                asig.estado === 'Utilizado' ? 'bg-gray-100 text-gray-600' : 
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {asig.estado}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="text-xs text-gray-500">
                                Asig: {format(new Date(asig.fecha_asignacion), 'dd/MM/yy HH:mm')}
                              </div>
                              {asig.fecha_utilizacion && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Uso: {format(new Date(asig.fecha_utilizacion), 'dd/MM/yy HH:mm')}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {asig.estado === 'Pendiente' && (
                                <button
                                  onClick={() => handleCancelAssignment(asig.id)}
                                  disabled={saving === asig.id}
                                  className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors inline-flex"
                                  title="Cancelar Asignación (Devuelve el cupo)"
                                >
                                  {saving === asig.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminServicios;
