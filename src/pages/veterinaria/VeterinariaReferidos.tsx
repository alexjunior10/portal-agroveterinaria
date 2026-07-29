import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Agroveterinaria } from '../../types';

interface VeterinariaReferidosProps {
  selectedAgroId: string;
}

export default function VeterinariaReferidos({ selectedAgroId }: VeterinariaReferidosProps) {
  const [agroveterinaria, setAgroveterinaria] = useState<any>(null);
  const [referidos, setReferidos] = useState<any[]>([]);
  
  // Form state
  const [referidoForm, setReferidoForm] = useState({
    dni: '',
    nombre: '',
    monto: ''
  });
  
  // Visibility toggles
  const [showDni, setShowDni] = useState(false);
  const [showNombre, setShowNombre] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (selectedAgroId) {
      fetchData();
    }
  }, [selectedAgroId]);

  const fetchData = async () => {
    // 1. Fetch Agro Info
    const { data: agroData } = await supabase
      .from('agroveterinarias')
      .select('*, localidades(nombre)')
      .eq('id', selectedAgroId)
      .single();
      
    if (agroData) {
      setAgroveterinaria(agroData);
    }

    // 2. Fetch Referidos
    const { data: refData } = await supabase
      .from('referidos')
      .select('*')
      .eq('agroveterinaria_id', selectedAgroId)
      .order('fecha_registro', { ascending: false });

    if (refData) {
      setReferidos(refData);
    }
  };

  const handleRegister = async () => {
    if (!referidoForm.dni || !referidoForm.monto) {
      alert("Por favor ingrese al menos el DNI y el Monto.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('referidos')
        .insert({
          agroveterinaria_id: selectedAgroId,
          referido_dni: referidoForm.dni,
          referido_nombre: referidoForm.nombre || 'No registrado',
          referido_celular: '',
          referido_distrito: '',
          referido_localidad: '',
          monto_aproximado: parseFloat(referidoForm.monto)
        });

      if (error) throw error;
      
      // Success
      setShowSuccessModal(true);
      fetchData(); // Refresh list
    } catch (err: any) {
      console.error(err);
      alert("Error al registrar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReferidoForm({
      dni: '',
      nombre: '',
      monto: ''
    });
    setShowDni(false);
    setShowNombre(false);
    setShowSuccessModal(false);
  };

  const openForms = () => {
    window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=tAtDi4qVqUmuymK19TwNw_4gPNXuU1hGjOpqamVJDwhUNTZZUjQyWlJZM1BUNkVTOU5LWEJLV0owNC4u&route=shorturl", "_blank");
  };

  const kpis = {
    total: referidos.length,
    pendientes: referidos.filter(r => r.estado === 'Pendiente de envío').length,
    desembolsados: referidos.filter(r => r.estado === 'Desembolsado').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="text-andes" size={28} />
            Gestión de Referidos
          </h2>
          <p className="text-gray-500 text-sm mt-1">Registra nuevos clientes interesados en un crédito y deriva sus datos a evaluación.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Users size={14} className="text-blue-500" />
            Total Registrados
          </span>
          <span className="text-2xl font-bold text-gray-900">{kpis.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Clock size={14} className="text-amber-500" />
            Pendientes
          </span>
          <span className="text-2xl font-bold text-gray-900">{kpis.pendientes}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-green-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-500" />
            Desembolsados
          </span>
          <span className="text-2xl font-bold text-gray-900">{kpis.desembolsados}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
              <Plus size={20} className="text-andes" />
              Nuevo Cliente
            </h3>
            
            {/* Contexto */}
            <div className="bg-blue-50/50 rounded-lg p-3 mb-6 border border-blue-100">
              <p className="text-xs text-blue-800 font-medium">Agroveterinaria actual:</p>
              <p className="font-semibold text-gray-900 text-sm">{agroveterinaria?.nombre}</p>
            </div>

            {/* Datos del Cliente */}
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">DNI del Cliente *</label>
                  <div className="relative">
                    <input 
                      type={showDni ? "text" : "password"}
                      value={referidoForm.dni}
                      onChange={(e) => setReferidoForm({...referidoForm, dni: e.target.value})}
                      className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-andes focus:border-andes outline-none"
                      maxLength={8}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowDni(!showDni)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showDni ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo (Opcional)</label>
                  <div className="relative">
                    <input 
                      type={showNombre ? "text" : "password"}
                      value={referidoForm.nombre}
                      onChange={(e) => setReferidoForm({...referidoForm, nombre: e.target.value})}
                      className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-andes focus:border-andes outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNombre(!showNombre)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showNombre ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monto Solicitado (S/) *</label>
                  <input 
                    type="number" 
                    value={referidoForm.monto}
                    onChange={(e) => setReferidoForm({...referidoForm, monto: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-andes focus:border-andes outline-none font-bold text-andes-dark"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleRegister}
                disabled={isSubmitting || !referidoForm.dni || !referidoForm.monto}
                className="mt-6 w-full bg-andes hover:bg-andes-dark disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Derivar Cliente
              </button>
            </div>
          </div>
        </div>

        {/* Tabla Histórica */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-900">Historial de Clientes Derivados</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">Cliente Referido</th>
                    <th className="px-6 py-3 font-semibold text-right">Monto Aprox.</th>
                    <th className="px-6 py-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {referidos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        No hay clientes derivados registrados.
                      </td>
                    </tr>
                  ) : (
                    referidos.map((ref) => (
                      <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {new Date(ref.fecha_registro).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">
                            {/* Mask name unless it's "No registrado" */}
                            {ref.referido_nombre !== 'No registrado' 
                              ? '*'.repeat(Math.min(8, ref.referido_nombre.length)) + '...'
                              : 'No registrado'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            DNI: {'*'.repeat(ref.referido_dni.length - 3) + ref.referido_dni.slice(-3)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          S/ {Number(ref.monto_aproximado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                            ${ref.estado === 'Desembolsado' ? 'bg-green-100 text-green-700' :
                              ref.estado === 'Pendiente de envío' ? 'bg-amber-100 text-amber-700' :
                              ref.estado === 'No aprobado' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }
                          `}>
                            {ref.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Success */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-andes"></div>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">¡Cliente Registrado!</h2>
              <p className="text-gray-500 mt-2 text-sm mb-6">El registro interno ha sido guardado exitosamente. Ahora debes derivarlo en el formulario oficial.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={openForms}
                  className="w-full bg-andes hover:bg-andes-dark text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  Abrir Microsoft Forms
                </button>
                <button 
                  onClick={resetForm}
                  className="w-full text-gray-500 hover:text-gray-900 font-medium py-2 px-4 rounded-xl transition-colors text-sm mt-1"
                >
                  Más tarde, cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
