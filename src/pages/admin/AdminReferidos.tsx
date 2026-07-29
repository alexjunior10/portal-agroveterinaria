import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Search, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  AlertCircle,
  Filter,
  Loader2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function AdminReferidos() {
  const [referidos, setReferidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedReferido, setSelectedReferido] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    estado: '',
    monto_desembolsado: '',
    fecha_desembolso: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchReferidos();
  }, []);

  const fetchReferidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('referidos')
      .select(`
        *,
        agroveterinarias(nombre, localidades(nombre))
      `)
      .order('fecha_registro', { ascending: false });

    if (data) {
      setReferidos(data);
    }
    setLoading(false);
  };

  const kpis = {
    total: referidos.length,
    pendientes: referidos.filter(r => r.estado === 'Pendiente de envío').length,
    enEvaluacion: referidos.filter(r => r.estado === 'En evaluación').length,
    desembolsados: referidos.filter(r => r.estado === 'Desembolsado').length,
    montoPotencial: referidos.reduce((acc, r) => acc + Number(r.monto_aproximado), 0),
    montoDesembolsado: referidos.reduce((acc, r) => acc + Number(r.monto_desembolsado || 0), 0)
  };

  const openEditModal = (ref: any) => {
    setSelectedReferido(ref);
    setEditForm({
      estado: ref.estado || 'Pendiente de envío',
      monto_desembolsado: ref.monto_desembolsado || '',
      fecha_desembolso: ref.fecha_desembolso ? new Date(ref.fecha_desembolso).toISOString().split('T')[0] : '',
      observaciones: ref.observaciones || ''
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const updateData: any = {
        estado: editForm.estado,
        observaciones: editForm.observaciones
      };

      if (editForm.estado === 'Desembolsado') {
        if (!editForm.monto_desembolsado || !editForm.fecha_desembolso) {
          alert("Por favor ingrese el monto y la fecha de desembolso.");
          setIsSaving(false);
          return;
        }
        updateData.monto_desembolsado = parseFloat(editForm.monto_desembolsado);
        updateData.fecha_desembolso = new Date(editForm.fecha_desembolso).toISOString();
      } else {
        updateData.monto_desembolsado = null;
        updateData.fecha_desembolso = null;
      }

      const { error } = await supabase
        .from('referidos')
        .update(updateData)
        .eq('id', selectedReferido.id);

      if (error) throw error;
      
      setIsModalOpen(false);
      fetchReferidos();
    } catch (err: any) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportToExcel = async () => {
    if (referidos.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    
    // Hoja 1: Resumen Ejecutivo
    const wsResumen = workbook.addWorksheet('Resumen Ejecutivo');
    wsResumen.columns = [
      { header: 'Métrica', key: 'metrica', width: 30 },
      { header: 'Valor', key: 'valor', width: 20 }
    ];
    
    // Format header
    wsResumen.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005BAA' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    wsResumen.addRow({ metrica: "Total Referidos Registrados", valor: kpis.total });
    wsResumen.addRow({ metrica: "Pendientes de Envío", valor: kpis.pendientes });
    wsResumen.addRow({ metrica: "En Evaluación", valor: kpis.enEvaluacion });
    wsResumen.addRow({ metrica: "Desembolsados", valor: kpis.desembolsados });
    wsResumen.addRow({ metrica: "Monto Potencial Total (S/)", valor: kpis.montoPotencial });
    wsResumen.addRow({ metrica: "Monto Desembolsado Total (S/)", valor: kpis.montoDesembolsado });

    // Hoja 2: Detalle Analítico
    const wsDetalle = workbook.addWorksheet('Detalle Analítico');
    wsDetalle.columns = [
      { header: 'Fecha Registro', key: 'fechaRegistro', width: 20 },
      { header: 'Agroveterinaria', key: 'agroveterinaria', width: 25 },
      { header: 'Localidad', key: 'localidad', width: 15 },
      { header: 'Referido (DNI)', key: 'refDNI', width: 15 },
      { header: 'Referido (Nombre)', key: 'refNombre', width: 25 },
      { header: 'Referido (Celular)', key: 'refCelular', width: 15 },
      { header: 'Referido (Distrito)', key: 'refDistrito', width: 20 },
      { header: 'Monto Aprox (S/)', key: 'montoAprox', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha Desembolso', key: 'fechaDesembolso', width: 20 },
      { header: 'Monto Desembolsado (S/)', key: 'montoDesembolsado', width: 20 },
      { header: 'Observaciones', key: 'obs', width: 30 }
    ];

    wsDetalle.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005BAA' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    referidos.forEach(ref => {
      wsDetalle.addRow({
        fechaRegistro: new Date(ref.fecha_registro).toLocaleDateString('es-PE'),
        agroveterinaria: ref.agroveterinarias?.nombre,
        localidad: ref.agroveterinarias?.localidades?.nombre,
        refDNI: ref.referido_dni,
        refNombre: ref.referido_nombre,
        refCelular: ref.referido_celular,
        refDistrito: ref.referido_distrito,
        montoAprox: Number(ref.monto_aproximado),
        estado: ref.estado,
        fechaDesembolso: ref.fecha_desembolso ? new Date(ref.fecha_desembolso).toLocaleDateString('es-PE') : '',
        montoDesembolsado: ref.monto_desembolsado ? Number(ref.monto_desembolsado) : 0,
        obs: ref.observaciones || ''
      });
    });

    // Hoja 3: Indicadores por Agroveterinaria
    const wsIndicadores = workbook.addWorksheet('Por Agroveterinaria');
    wsIndicadores.columns = [
      { header: 'Agroveterinaria', key: 'nombre', width: 30 },
      { header: 'Total Referidos', key: 'referidos', width: 15 },
      { header: 'Total Desembolsados', key: 'desembolsados', width: 20 },
      { header: 'Monto Potencial (S/)', key: 'montoPotencial', width: 20 },
      { header: 'Monto Real (S/)', key: 'montoReal', width: 20 }
    ];

    wsIndicadores.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005BAA' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    const agroStats = referidos.reduce((acc: any, r: any) => {
      const nombre = r.agroveterinarias?.nombre || 'Sin nombre';
      if (!acc[nombre]) {
        acc[nombre] = { nombre: nombre, referidos: 0, desembolsados: 0, montoPotencial: 0, montoReal: 0 };
      }
      acc[nombre].referidos++;
      if (r.estado === 'Desembolsado') acc[nombre].desembolsados++;
      acc[nombre].montoPotencial += Number(r.monto_aproximado);
      if (r.monto_desembolsado) acc[nombre].montoReal += Number(r.monto_desembolsado);
      return acc;
    }, {});
    
    Object.values(agroStats).forEach((stat: any) => {
      wsIndicadores.addRow({
        nombre: stat.nombre,
        referidos: stat.referidos,
        desembolsados: stat.desembolsados,
        montoPotencial: stat.montoPotencial,
        montoReal: stat.montoReal
      });
    });

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Reporte_Referidos_Agroveterinarias_${new Date().getTime()}.xlsx`);
  };

  const getStatusColor = (estado: string) => {
    switch(estado) {
      case 'Desembolsado': return 'bg-green-100 text-green-800';
      case 'En evaluación': return 'bg-purple-100 text-purple-800';
      case 'Pendiente de envío': return 'bg-amber-100 text-amber-800';
      case 'No aprobado': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="text-andes" size={28} />
            Gestión de Referidos (Nacional)
          </h2>
          <p className="text-gray-500 text-sm mt-1">Supervisa y actualiza el estado de los referidos generados por la red de agroveterinarias.</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Download size={16} />
          Exportar a Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-gray-500 text-xs font-semibold uppercase mb-1">Registrados</span>
          <span className="text-2xl font-bold text-gray-900">{kpis.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-gray-500 text-xs font-semibold uppercase mb-1 text-amber-600">Pendientes</span>
          <span className="text-2xl font-bold text-gray-900">{kpis.pendientes}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-gray-500 text-xs font-semibold uppercase mb-1 text-purple-600">En Evaluación</span>
          <span className="text-2xl font-bold text-gray-900">{kpis.enEvaluacion}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-gray-500 text-xs font-semibold uppercase mb-1 text-green-600">Desembolsados</span>
          <span className="text-2xl font-bold text-gray-900">{kpis.desembolsados}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <span className="text-gray-500 text-xs font-semibold uppercase mb-1 text-gray-600">Monto Potencial</span>
          <span className="text-xl font-bold text-gray-900">S/ {kpis.montoPotencial.toLocaleString('es-PE')}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center bg-green-50 border-green-100">
          <span className="text-green-700 text-xs font-bold uppercase mb-1">Monto Real</span>
          <span className="text-xl font-bold text-green-700">S/ {kpis.montoDesembolsado.toLocaleString('es-PE')}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900">Listado de Referidos</h3>
          <div className="flex gap-2">
            {/* Future filters can go here */}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center text-gray-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Fecha</th>
                  <th className="px-6 py-3 font-semibold">Punto de Atención</th>
                  <th className="px-6 py-3 font-semibold">Cliente Referido</th>
                  <th className="px-6 py-3 font-semibold text-right">Monto Aprox.</th>
                  <th className="px-6 py-3 font-semibold text-center">Estado</th>
                  <th className="px-6 py-3 font-semibold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referidos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No hay referidos registrados.
                    </td>
                  </tr>
                ) : (
                  referidos.map((ref) => (
                    <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(ref.fecha_registro).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{ref.agroveterinarias?.nombre}</p>
                        <p className="text-xs text-gray-500">{ref.agroveterinarias?.localidades?.nombre}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">
                          {ref.referido_nombre}
                        </p>
                        <p className="text-xs text-gray-500">DNI: {ref.referido_dni}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        S/ {Number(ref.monto_aproximado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(ref.estado)}`}>
                          {ref.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => openEditModal(ref)}
                          className="text-andes hover:text-andes-dark font-medium hover:underline text-sm"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Gestión */}
      {isModalOpen && selectedReferido && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-andes" />
                Gestionar Referido
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Context info */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-blue-800 font-medium">Referido:</p>
                  <p className="font-semibold text-gray-900">{selectedReferido.referido_nombre}</p>
                  <p className="text-xs text-gray-600 mt-1">Cel: {selectedReferido.referido_celular}</p>
                </div>
                <div className="flex-1 border-l border-blue-200 pl-4">
                  <p className="text-xs text-blue-800 font-medium">Monto Solicitado:</p>
                  <p className="font-bold text-gray-900">S/ {Number(selectedReferido.monto_aproximado).toLocaleString('es-PE')}</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado del Referido</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-andes outline-none"
                    value={editForm.estado}
                    onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                  >
                    <option value="Pendiente de envío">Pendiente de envío</option>
                    <option value="Enviado">Enviado (a Forms)</option>
                    <option value="En evaluación">En evaluación</option>
                    <option value="Desembolsado">Desembolsado</option>
                    <option value="No aprobado">No aprobado</option>
                  </select>
                </div>

                {editForm.estado === 'Desembolsado' && (
                  <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
                    <div>
                      <label className="block text-xs font-bold text-green-800 mb-1">Monto Desembolsado (S/)</label>
                      <input 
                        type="number" 
                        value={editForm.monto_desembolsado}
                        onChange={(e) => setEditForm({...editForm, monto_desembolsado: e.target.value})}
                        className="w-full px-3 py-2 border border-green-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-green-800 mb-1">Fecha de Desembolso</label>
                      <input 
                        type="date" 
                        value={editForm.fecha_desembolso}
                        onChange={(e) => setEditForm({...editForm, fecha_desembolso: e.target.value})}
                        className="w-full px-3 py-2 border border-green-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones (Opcional)</label>
                  <textarea 
                    value={editForm.observaciones}
                    onChange={(e) => setEditForm({...editForm, observaciones: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-andes outline-none min-h-[80px]"
                    placeholder="Detalles sobre la evaluación o rechazo..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isSaving}
                className="bg-andes hover:bg-andes-dark disabled:bg-gray-300 text-white font-medium rounded-lg px-6 py-2 transition-colors flex items-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
