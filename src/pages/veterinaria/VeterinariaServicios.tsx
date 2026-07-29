import { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, AlertTriangle, Stethoscope, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Cliente } from '../../types';

interface SearchForm {
  dni: string;
}

type ClienteServicio = {
  id: string;
  estado: string;
  nombre_servicio: string;
  agroveterinaria_id: string;
};

interface Props {
  selectedAgroId: string;
}

const VeterinariaServicios = ({ selectedAgroId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  
  const [serviciosAsignados, setServiciosAsignados] = useState<ClienteServicio[]>([]);
  const [redeemingServiceId, setRedeemingServiceId] = useState<string | null>(null);
  const [serviceSuccessIds, setServiceSuccessIds] = useState<string[]>([]);
  
  const [confirmServiceModal, setConfirmServiceModal] = useState<string | null>(null);

  const { register: registerSearch, handleSubmit: handleSearchSubmit, formState: { errors: errorsSearch } } = useForm<SearchForm>();

  // 1. Buscar Cliente y sus Servicios
  const onSearch = async (data: SearchForm) => {
    if (!selectedAgroId) {
      toast.error('Primero seleccione una Agroveterinaria en la barra superior');
      return;
    }

    setLoading(true);
    setSearchAttempted(true);
    setCliente(null);
    setStatusError(null);
    setServiceSuccessIds([]);
    setServiciosAsignados([]);

    try {
      // Buscar cliente
      const { data: clienteData, error: clientErr } = await supabase
        .from('clientes')
        .select('*, localidades(nombre)')
        .eq('dni', data.dni)
        .single();

      if (clientErr || !clienteData) {
        setStatusError('not_found');
        setLoading(false);
        return;
      }

      setCliente(clienteData as Cliente);

      // Verificar servicios
      const { data: servData } = await supabase
        .from('cliente_servicios')
        .select(`
          id, 
          estado,
          agroveterinaria_servicios (
            agroveterinaria_id,
            servicios ( nombre )
          )
        `)
        .eq('cliente_dni', clienteData.dni);
      
      if (servData && servData.length > 0) {
        // Filtramos solo los servicios correspondientes a la agroveterinaria seleccionada
        const filteredServices = servData.filter((s: any) => s.agroveterinaria_servicios?.agroveterinaria_id === selectedAgroId);
        
        const mapped = filteredServices.map((s: any) => ({
          id: s.id,
          estado: s.estado,
          nombre_servicio: s.agroveterinaria_servicios?.servicios?.nombre || 'Desconocido',
          agroveterinaria_id: s.agroveterinaria_servicios?.agroveterinaria_id
        }));
        setServiciosAsignados(mapped);
      }
      
    } catch (e) {
      toast.error('Error al realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterServiceClick = (servicioId: string) => {
    setConfirmServiceModal(servicioId);
  };

  const handleRegisterServiceConfirm = async () => {
    if (!confirmServiceModal) return;
    const servicioId = confirmServiceModal;
    
    setRedeemingServiceId(servicioId);
    setConfirmServiceModal(null);
    
    try {
      const { error } = await supabase
        .from('cliente_servicios')
        .update({
          estado: 'Utilizado',
          fecha_utilizacion: new Date().toISOString(),
          usuario_atencion: 'Veterinaria'
        })
        .eq('id', servicioId);
        
      if (error) throw error;
      
      setServiceSuccessIds(prev => [...prev, servicioId]);
      
      setServiciosAsignados(prev => prev.map(s => 
        s.id === servicioId ? { ...s, estado: 'Utilizado' } : s
      ));
      
      toast.success("Servicio registrado exitosamente");
    } catch (e: any) {
      toast.error("Error al registrar servicio");
    } finally {
      setRedeemingServiceId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100 mb-6">
        <h2 className="text-xl font-bold text-purple-900 mb-2">🩺 Servicios Veterinarios</h2>
        <p className="text-gray-600 text-sm">Busca al cliente por DNI y registra el uso de los servicios veterinarios asignados a esta sucursal.</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
          <Search size={20} className="text-purple-600" />
          Buscar Cliente
        </h2>
        <form onSubmit={handleSearchSubmit(onSearch)} className="flex gap-4 items-start">
          <div className="flex-1 max-w-sm">
            <input 
              type="text" 
              placeholder="Ingrese el DNI del cliente..."
              className={`input-field ${errorsSearch.dni ? 'border-error focus:ring-error' : ''}`}
              {...registerSearch('dni', { required: 'El DNI es obligatorio' })}
              disabled={loading || !selectedAgroId}
              autoComplete="off"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !selectedAgroId} 
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-soft transition-colors duration-200 disabled:opacity-50 whitespace-nowrap min-w-[120px]"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        {!selectedAgroId && (
          <p className="text-amber-600 text-sm mt-3 flex items-center gap-1">
            <AlertCircle size={16} /> Seleccione una sucursal en la barra superior para buscar.
          </p>
        )}
      </div>

      {searchAttempted && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {statusError === 'not_found' && (
             <div className="card bg-gray-50 flex flex-col items-center justify-center py-12 border-dashed border-gray-200">
                <AlertCircle size={40} className="text-gray-400 mb-3" />
                <h3 className="text-gray-600 font-medium">Cliente no encontrado</h3>
                <p className="text-sm text-gray-500 text-center mt-1">Verifique que el DNI ingresado sea correcto.</p>
             </div>
          )}

          {statusError === null && cliente && (
            <div className="space-y-6">
              <div className="card relative overflow-hidden border-purple-200 bg-purple-50/30">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{cliente.nombre}</h3>
                    <p className="text-sm text-gray-500">DNI: {cliente.dni}</p>
                  </div>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-200">
                    {cliente.localidades?.nombre}
                  </span>
                </div>
              </div>
              
              <div className="card border-t-4 border-t-purple-500">
                <h3 className="text-lg font-semibold text-textMain mb-4 flex justify-between items-center">
                  Beneficios de Servicio Asignados
                  <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-bold">
                    {serviciosAsignados.length}
                  </span>
                </h3>
                
                {serviciosAsignados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Stethoscope size={32} className="text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 text-center">
                      Este cliente no tiene beneficios de servicios asignados en esta sucursal.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviciosAsignados.map(servicio => {
                      const isUsed = servicio.estado === 'Utilizado' || servicio.estado === 'Cancelado';
                      const isRedeeming = redeemingServiceId === servicio.id;
                      const isSuccess = serviceSuccessIds.includes(servicio.id);
                      
                      const showAsUsed = isUsed || isSuccess;

                      return (
                        <div key={servicio.id} className="relative">
                          {showAsUsed ? (
                            <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="text-success" size={20} />
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">{servicio.nombre_servicio}</span>
                                <span className="text-xs uppercase font-bold tracking-wider text-success">Utilizado</span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm space-y-4 hover:border-purple-300 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-purple-900 text-lg leading-tight">{servicio.nombre_servicio}</p>
                                </div>
                                <span className="bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                                  Pendiente
                                </span>
                              </div>
                              <button 
                                onClick={() => handleRegisterServiceClick(servicio.id)}
                                disabled={isRedeeming}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                              >
                                {isRedeeming ? 'Registrando...' : 'Registrar Uso de Servicio'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: SERVICIOS */}
      {confirmServiceModal && cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 bg-purple-50/50">
              <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-purple-600" />
                Confirmación de Canje (Servicios)
              </h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cliente</p>
                <p className="font-bold text-gray-900">{cliente.nombre}</p>
                <p className="text-sm text-gray-600">DNI: {cliente.dni}</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-600 uppercase font-bold mb-2">Servicio a registrar</p>
                {(() => {
                  const s = serviciosAsignados.find(serv => serv.id === confirmServiceModal);
                  return s ? (
                    <div>
                      <p className="font-bold text-gray-900 text-lg mb-1">{s.nombre_servicio}</p>
                      <span className="text-xs font-bold px-2 py-1 bg-white border border-purple-200 rounded text-purple-700 shadow-sm">Pendiente → Utilizado</span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-amber-800 text-sm mt-4">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Importante:</strong> Una vez confirmado el registro, este no podrá modificarse desde el sistema. Verifique cuidadosamente antes de continuar.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 justify-end">
              <button 
                onClick={() => setConfirmServiceModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-medium rounded-lg transition-colors"
              >
                Volver
              </button>
              <button 
                onClick={handleRegisterServiceConfirm}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-6 py-2 transition-colors shadow-sm"
              >
                Confirmar registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VeterinariaServicios;
