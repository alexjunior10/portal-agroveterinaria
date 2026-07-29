import { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, XCircle, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Cliente } from '../../types';

interface SearchForm {
  dni: string;
}

type AgroProducto = {
  id: string;
  producto_id: string;
  descuento_pct: number;
  productos: { nombre: string };
};

type LineaCanje = {
  id: string;
  producto_id: string;
  producto_nombre: string;
  descuento_pct: number;
  subtotal: number | '';
};

interface Props {
  selectedAgroId: string;
}

const VeterinariaProductos = ({ selectedAgroId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [productoUsado, setProductoUsado] = useState(false);
  
  const [catalogoProductos, setCatalogoProductos] = useState<AgroProducto[]>([]);
  const [lineas, setLineas] = useState<LineaCanje[]>([]);
  
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);

  const [confirmProductModal, setConfirmProductModal] = useState(false);

  const { register: registerSearch, handleSubmit: handleSearchSubmit, formState: { errors: errorsSearch } } = useForm<SearchForm>();



  // 2. Buscar Cliente
  const onSearch = async (data: SearchForm) => {
    if (!selectedAgroId) {
      toast.error('Primero seleccione una Agroveterinaria');
      return;
    }

    setLoading(true);
    setSearchAttempted(true);
    setCliente(null);
    setStatusError(null);
    setSuccess(false);
    setProductoUsado(false);
    setLineas([]);
    setCatalogoProductos([]);

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

      // Verificar si ya tiene canje de descuento general bajo el nuevo modelo multilínea (producto_id nulo)
      const { data: canjeData } = await supabase
        .from('canjes')
        .select('id')
        .eq('cliente_dni', clienteData.dni)
        .is('producto_id', null)
        .maybeSingle();

      if (canjeData) {
        setProductoUsado(true);
      } else {
        setProductoUsado(false);
        // Cargar catálogo de productos de la agroveterinaria
        const { data: prodsData, error: prodsErr } = await supabase
          .from('agroveterinaria_productos')
          .select(`
            producto_id,
            descuento_pct,
            productos ( nombre )
          `)
          .eq('agroveterinaria_id', selectedAgroId);
        
        if (prodsErr) {
          console.error("Error fetching productos:", prodsErr);
        }
        
        if (prodsData) {
          setCatalogoProductos(prodsData as any[]);
          // Inicializar con exactamente una línea vacía
          setLineas([{
            id: Math.random().toString(36).substring(7),
            producto_id: '',
            producto_nombre: '',
            descuento_pct: 0,
            subtotal: ''
          }]);
        }
      }
    } catch (e) {
      toast.error('Error al realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const agregarLinea = () => {
    setLineas(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      producto_id: '',
      producto_nombre: '',
      descuento_pct: 0,
      subtotal: ''
    }]);
  };

  const eliminarLinea = (id: string) => {
    if (lineas.length === 1) return;
    setLineas(lineas.filter(l => l.id !== id));
  };

  const updateLinea = (id: string, field: keyof LineaCanje, value: any) => {
    setLineas(prevLineas => {
      return prevLineas.map(l => {
        if (l.id === id) {
          const newLinea = { ...l, [field]: value };
          if (field === 'producto_id') {
            const prod = catalogoProductos.find(p => p.producto_id === value);
            if (prod) {
              newLinea.producto_nombre = prod.productos.nombre;
              newLinea.descuento_pct = Number(prod.descuento_pct);
            } else {
              newLinea.producto_nombre = '';
              newLinea.descuento_pct = 0;
            }
          }
          return newLinea;
        }
        return l;
      });
    });
  };

  const validLineas = lineas.filter(l => l.producto_id !== '');
  const totalSubtotal = validLineas.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0);
  const totalDescuento = validLineas.reduce((acc, l) => acc + ((Number(l.subtotal) || 0) * l.descuento_pct / 100), 0);
  const totalNeto = totalSubtotal - totalDescuento;

  const isFormValid = validLineas.length > 0 && validLineas.every(l => Number(l.subtotal) > 0);

  const handleRegisterProductsClick = () => {
    if (!cliente || !selectedAgroId || !isFormValid) return;
    setConfirmProductModal(true);
  };

  const handleRegisterProductsConfirm = async () => {
    if (!cliente || !selectedAgroId || !isFormValid) return;

    setConfirmProductModal(false);
    setRegistering(true);

    const detallesJSON = validLineas.map(l => {
      const st = Number(l.subtotal);
      const dcto = (st * l.descuento_pct) / 100;
      return {
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre,
        descuento_pct: l.descuento_pct,
        subtotal: st,
        monto_descontado: dcto,
        total_neto: st - dcto
      };
    });

    try {
      const { error } = await supabase.rpc('registrar_beneficio_v4', {
        p_cliente_dni: cliente.dni,
        p_agroveterinaria_id: selectedAgroId,
        p_subtotal_total: totalSubtotal,
        p_descuento_total: totalDescuento,
        p_total_neto: totalNeto,
        p_usuario_atencion: 'Veterinaria',
        p_detalles: detallesJSON
      });

      if (error) {
        toast.error(error.message || 'Error al registrar el beneficio.');
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      toast.error('Ocurrió un error inesperado');
    }

    setRegistering(false);
  };

  const handleReset = () => {
    setCliente(null);
    setSearchAttempted(false);
    setStatusError(null);
    setSuccess(false);
    setProductoUsado(false);
    setLineas([]);
  };

  if (success) {
    return (
      <div className="card flex flex-col items-center text-center py-12 px-6">
        <div className="w-20 h-20 bg-green-100 text-success rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-textMain mb-2">Beneficio registrado correctamente</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          La compra detallada ha sido procesada exitosamente y registrada en el sistema.
        </p>
        <button onClick={handleReset} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <RefreshCw size={20} />
          Registrar otro cliente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 mb-6">
        <h2 className="text-xl font-bold text-andes-dark mb-2">🛒 Beneficios por Productos</h2>
        <p className="text-gray-600 text-sm">Busca al cliente por DNI y registra los productos adquiridos con descuento.</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
          <Search size={20} className="text-andes" />
          Buscar Cliente
        </h2>
        <form onSubmit={handleSearchSubmit(onSearch)} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Ingrese el DNI del cliente..."
              className={`input-field ${errorsSearch.dni ? 'border-error focus:ring-error' : ''}`}
              {...registerSearch('dni', { required: 'El DNI es obligatorio' })}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap min-w-[120px]">
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {searchAttempted && !loading && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {statusError === 'not_found' && (
             <div className="card bg-gray-50 flex flex-col items-center justify-center py-10 border-dashed border-gray-200">
                <AlertCircle size={40} className="text-gray-400 mb-3" />
                <h3 className="text-gray-600 font-medium">Cliente no encontrado</h3>
                <p className="text-sm text-gray-500 text-center mt-1">Verifique que el DNI ingresado sea correcto.</p>
             </div>
          )}

          {statusError === null && cliente && (
            <div className="space-y-6">
              <div className="card relative overflow-hidden border-blue-200 bg-blue-50/30">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-textMain">{cliente.nombre}</h3>
                    <p className="text-sm text-gray-500">DNI: {cliente.dni}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Cliente validado
                  </span>
                </div>
              </div>
              
              <div className="card border-t-4 border-t-andes">
                <h3 className="text-lg font-semibold text-textMain mb-4">Descuento General por Convenio</h3>
                
                {productoUsado ? (
                  <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
                    <XCircle size={20} />
                    <div>
                      <p className="font-bold">Beneficio utilizado</p>
                      <p className="text-sm text-red-500">Este cliente ya utilizó su descuento de convenio.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600 text-sm border-y border-gray-200">
                            <th className="py-3 px-4 font-semibold">Producto / Categoría</th>
                            <th className="py-3 px-4 font-semibold w-24">% Desc.</th>
                            <th className="py-3 px-4 font-semibold w-40">Subtotal</th>
                            <th className="py-3 px-4 font-semibold w-32">Descuento</th>
                            <th className="py-3 px-4 font-semibold w-32">Neto</th>
                            <th className="py-3 px-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineas.map(linea => {
                            const st = Number(linea.subtotal) || 0;
                            const dcto = (st * linea.descuento_pct) / 100;
                            const neto = st - dcto;
                            
                            return (
                              <tr key={linea.id} className="hover:bg-gray-50/50">
                                <td className="py-3 px-4">
                                  <select 
                                    className="input-field py-2 text-sm"
                                    value={linea.producto_id}
                                    onChange={(e) => updateLinea(linea.id, 'producto_id', e.target.value)}
                                  >
                                    <option value="">Seleccione producto...</option>
                                    {catalogoProductos.map(p => (
                                      <option key={p.producto_id} value={p.producto_id}>
                                        {p.productos.nombre} (-{p.descuento_pct}%)
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {linea.descuento_pct > 0 ? (
                                    <span className="inline-flex items-center justify-center w-10 h-8 rounded-md bg-andes-light text-andes font-bold text-sm">
                                      {linea.descuento_pct}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">S/</span>
                                    <input 
                                      type="number"
                                      step="0.01"
                                      min="0.1"
                                      className="input-field pl-8 py-2 text-sm text-right"
                                      value={linea.subtotal}
                                      onChange={(e) => updateLinea(linea.id, 'subtotal', e.target.value)}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-success font-medium block h-8 leading-8">
                                    {dcto > 0 ? `- S/ ${dcto.toFixed(2)}` : '-'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="font-bold text-gray-900 block h-8 leading-8">
                                    {neto > 0 ? `S/ ${neto.toFixed(2)}` : '-'}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  {lineas.length > 1 && (
                                    <button 
                                      type="button" 
                                      onClick={() => eliminarLinea(linea.id)}
                                      className="text-gray-400 hover:text-error transition-colors p-2 rounded-lg hover:bg-red-50"
                                      title="Eliminar línea"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-start">
                      <button 
                        type="button" 
                        onClick={agregarLinea}
                        className="flex items-center gap-2 text-sm font-medium text-andes hover:text-andes-dark hover:bg-andes-light/50 px-3 py-2 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Agregar otro producto
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mt-6 max-w-sm ml-auto">
                      <div className="space-y-3">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal Total</span>
                          <span className="font-medium text-gray-900">S/ {totalSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Descuento Total</span>
                          <span className="font-medium text-success">- S/ {totalDescuento.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                          <span className="font-bold text-gray-800">Total Neto</span>
                          <span className="text-2xl font-bold text-andes-dark">S/ {totalNeto.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <button 
                        type="button" 
                        onClick={handleRegisterProductsClick}
                        disabled={registering || !isFormValid}
                        className="btn-primary w-full py-3"
                      >
                        {registering ? 'Procesando...' : 'Confirmar y Registrar Beneficio'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmProductModal && cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 bg-blue-50/50">
              <h2 className="text-lg font-bold text-textMain flex items-center gap-2">
                <AlertCircle size={20} className="text-andes" />
                Confirmación de Canje
              </h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cliente</p>
                <p className="font-bold text-gray-900">{cliente.nombre}</p>
                <p className="text-sm text-gray-600">DNI: {cliente.dni}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Productos a canjear</p>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2">
                  {validLineas.map(l => {
                    const st = Number(l.subtotal);
                    const dcto = (st * l.descuento_pct) / 100;
                    return (
                      <div key={l.id} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="font-medium">{l.producto_nombre}</p>
                          <p className="text-xs text-gray-500">{l.descuento_pct}% dcto.</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs line-through text-gray-400">S/ {st.toFixed(2)}</p>
                          <p className="font-bold text-gray-900">S/ {(st - dcto).toFixed(2)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal Total</span>
                  <span>S/ {totalSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span>Descuento Total</span>
                  <span>- S/ {totalDescuento.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-blue-200">
                  <span>Total Neto</span>
                  <span>S/ {totalNeto.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-amber-800 text-sm mt-4">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Importante:</strong> Una vez confirmado el registro, este no podrá modificarse desde el sistema. Verifique cuidadosamente la información antes de continuar.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 justify-end">
              <button 
                onClick={() => setConfirmProductModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-medium rounded-lg transition-colors"
              >
                Volver a editar
              </button>
              <button 
                onClick={handleRegisterProductsConfirm}
                className="btn-primary py-2 px-6"
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

export default VeterinariaProductos;
