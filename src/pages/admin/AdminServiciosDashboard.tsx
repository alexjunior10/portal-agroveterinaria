import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Download, Search, Filter, ShieldCheck, CheckCircle2, Clock, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Tipos base para el Dashboard
type AsignacionCompleta = {
  id: string;
  cliente_dni: string;
  estado: string;
  fecha_asignacion: string;
  fecha_utilizacion?: string;
  usuario_asignacion?: string;
  usuario_atencion?: string;
  agroveterinaria_servicios?: {
    cupo_total: number;
    servicios?: { nombre: string };
    agroveterinarias?: { nombre: string };
  };
  clientes?: {
    nombre: string;
    localidades?: { nombre: string } | { nombre: string }[];
  }
};

type ConvenioConfig = {
  id: string;
  cupo_total: number;
  estado: string;
  agroveterinarias?: { nombre: string };
  servicios?: { nombre: string };
};

const AdminServiciosDashboard = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionCompleta[]>([]);
  const [convenios, setConvenios] = useState<ConvenioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [searchDni, setSearchDni] = useState('');
  const [filterLocalidad, setFilterLocalidad] = useState('');
  const [filterAgroveterinaria, setFilterAgroveterinaria] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Obtener Asignaciones (cliente_servicios)
    const { data: asigData, error: asigErr } = await supabase
      .from('cliente_servicios')
      .select(`
        *,
        clientes ( nombre, localidades ( nombre ) ),
        agroveterinaria_servicios (
          cupo_total,
          servicios ( nombre ),
          agroveterinarias ( nombre )
        )
      `)
      .order('fecha_asignacion', { ascending: false });

    if (asigErr) {
      toast.error('Error al cargar asignaciones');
    } else {
      setAsignaciones(asigData as any[]);
    }

    // 2. Obtener Convenios (agroveterinaria_servicios)
    const { data: convData } = await supabase
      .from('agroveterinaria_servicios')
      .select(`
        id, cupo_total, estado,
        agroveterinarias ( nombre ),
        servicios ( nombre )
      `);
      
    if (convData) {
      setConvenios(convData as any[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helpers de Extracción
  const getLoc = (c: any) => {
    if (!c.clientes?.localidades) return 'Desconocida';
    return Array.isArray(c.clientes.localidades) 
      ? c.clientes.localidades[0]?.nombre 
      : (c.clientes.localidades as any).nombre || 'Desconocida';
  };
  
  const getAgro = (c: any) => c.agroveterinaria_servicios?.agroveterinarias?.nombre || 'Desconocida';
  const getServ = (c: any) => c.agroveterinaria_servicios?.servicios?.nombre || 'Desconocido';

  // Filtrado de la Tabla de Detalle
  const filteredData = asignaciones.filter(c => {
    const matchDni = c.cliente_dni.includes(searchDni);
    const matchLocalidad = filterLocalidad ? getLoc(c) === filterLocalidad : true;
    const matchAgro = filterAgroveterinaria ? getAgro(c) === filterAgroveterinaria : true;
    const matchEstado = filterEstado ? c.estado === filterEstado : true;
    return matchDni && matchLocalidad && matchAgro && matchEstado;
  });

  // ==========================================
  // KPIs Globales (Beneficios)
  // ==========================================
  const validAsignaciones = asignaciones.filter(a => a.estado !== 'Cancelado'); // Base para cálculos de %
  const totalAsignados = validAsignaciones.length;
  const totalUtilizados = validAsignaciones.filter(a => a.estado === 'Utilizado').length;
  const totalPendientes = validAsignaciones.filter(a => a.estado === 'Pendiente').length;
  const totalCancelados = asignaciones.filter(a => a.estado === 'Cancelado').length;
  const tasaUtilizacion = totalAsignados > 0 ? (totalUtilizados / totalAsignados) * 100 : 0;
  
  const clientesUnicos = new Set(validAsignaciones.map(a => a.cliente_dni)).size;

  // ==========================================
  // KPIs de Convenios / Cupos
  // ==========================================
  const conveniosActivos = convenios.filter(c => c.estado === 'Activo').length;
  const cuposTotales = convenios.reduce((acc, c) => acc + c.cupo_total, 0);
  
  // Los cupos consumidos son los que están en estado Utilizado o Pendiente. (Misma regla que AdminServicios)
  const cuposConsumidos = validAsignaciones.length; 
  const cuposDisponibles = cuposTotales - cuposConsumidos;
  const porcentajeCuposUsados = cuposTotales > 0 ? (cuposConsumidos / cuposTotales) * 100 : 0;

  // ==========================================
  // Agrupaciones para Tablas Analíticas
  // ==========================================
  
  // 1. Por Servicio
  const statsPorServicio: Record<string, { asignados: number, utilizados: number, pendientes: number }> = {};
  validAsignaciones.forEach(a => {
    const serv = getServ(a);
    if (!statsPorServicio[serv]) statsPorServicio[serv] = { asignados: 0, utilizados: 0, pendientes: 0 };
    statsPorServicio[serv].asignados++;
    if (a.estado === 'Utilizado') statsPorServicio[serv].utilizados++;
    if (a.estado === 'Pendiente') statsPorServicio[serv].pendientes++;
  });
  const tablaServicios = Object.entries(statsPorServicio).map(([nombre, s]) => ({
    nombre, ...s, tasa: s.asignados > 0 ? (s.utilizados / s.asignados) * 100 : 0
  }));

  // 2. Por Agroveterinaria
  const statsPorAgro: Record<string, { asignados: number, utilizados: number, pendientes: number }> = {};
  validAsignaciones.forEach(a => {
    const agro = getAgro(a);
    if (!statsPorAgro[agro]) statsPorAgro[agro] = { asignados: 0, utilizados: 0, pendientes: 0 };
    statsPorAgro[agro].asignados++;
    if (a.estado === 'Utilizado') statsPorAgro[agro].utilizados++;
    if (a.estado === 'Pendiente') statsPorAgro[agro].pendientes++;
  });
  const tablaAgros = Object.entries(statsPorAgro).map(([nombre, s]) => ({
    nombre, ...s
  }));

  // 3. Estado de Cupos (Cruzando convenios y asignaciones validas)
  const consumoPorConvenioID: Record<string, number> = {};
  validAsignaciones.forEach(a => {
    const cid = (a as any).agro_servicio_id; // Este campo viene en la consulta de tabla plana
    if (cid) {
      consumoPorConvenioID[cid] = (consumoPorConvenioID[cid] || 0) + 1;
    }
  });
  
  const tablaCupos = convenios.map(c => {
    const usados = consumoPorConvenioID[c.id] || 0;
    const disp = c.cupo_total - usados;
    return {
      agroveterinaria: c.agroveterinarias?.nombre || '?',
      servicio: c.servicios?.nombre || '?',
      total: c.cupo_total,
      usados,
      disponible: disp
    };
  });

  // Extract uniques for filters
  const uniqueLocalidades = Array.from(new Set(asignaciones.map(a => getLoc(a)))).sort();
  const uniqueAgro = Array.from(new Set(asignaciones.map(a => getAgro(a)))).sort();

  // ==========================================
  // EXPORTACIÓN A EXCEL
  // ==========================================
  const exportReporte = async () => {
    setExporting(true);
    try {
      toast.loading("Generando reporte de servicios...", { id: "exportServ" });
      const workbook = new ExcelJS.Workbook();
      
      const headerStyle = (row: ExcelJS.Row) => {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005BAA' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      };

      // ----------------------------------------------------
      // HOJA 1: Resumen Ejecutivo
      // ----------------------------------------------------
      const sheetExec = workbook.addWorksheet('Resumen Ejecutivo');
      sheetExec.columns = [
        { header: 'Fecha Asignación', key: 'fechaAsig', width: 20 },
        { header: 'Fecha Utilización', key: 'fechaUso', width: 20 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'DNI', key: 'dni', width: 12 },
        { header: 'Localidad', key: 'localidad', width: 20 },
        { header: 'Agroveterinaria', key: 'agro', width: 30 },
        { header: 'Servicio', key: 'servicio', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 }
      ];
      headerStyle(sheetExec.getRow(1));
      sheetExec.views = [{ state: 'frozen', ySplit: 1 }];

      asignaciones.forEach(a => {
        sheetExec.addRow({
          fechaAsig: format(new Date(a.fecha_asignacion), 'yyyy-MM-dd HH:mm'),
          fechaUso: a.fecha_utilizacion ? format(new Date(a.fecha_utilizacion), 'yyyy-MM-dd HH:mm') : '-',
          cliente: a.clientes?.nombre || '',
          dni: a.cliente_dni,
          localidad: getLoc(a),
          agro: getAgro(a),
          servicio: getServ(a),
          estado: a.estado
        });
      });

      // ----------------------------------------------------
      // HOJA 2: Detalle Analítico
      // ----------------------------------------------------
      const sheetAna = workbook.addWorksheet('Detalle Analítico');
      sheetAna.columns = [
        { header: 'ID Asignación', key: 'id', width: 35 },
        { header: 'Fecha Asignación', key: 'fechaAsig', width: 20 },
        { header: 'Fecha Utilización', key: 'fechaUso', width: 20 },
        { header: 'DNI', key: 'dni', width: 12 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Localidad', key: 'localidad', width: 20 },
        { header: 'Agroveterinaria', key: 'agro', width: 30 },
        { header: 'Servicio', key: 'servicio', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Usuario Asignación', key: 'usAsig', width: 20 },
        { header: 'Usuario Atención', key: 'usAte', width: 20 }
      ];
      headerStyle(sheetAna.getRow(1));
      sheetAna.views = [{ state: 'frozen', ySplit: 1 }];
      
      asignaciones.forEach(a => {
        sheetAna.addRow({
          id: a.id,
          fechaAsig: format(new Date(a.fecha_asignacion), 'yyyy-MM-dd HH:mm'),
          fechaUso: a.fecha_utilizacion ? format(new Date(a.fecha_utilizacion), 'yyyy-MM-dd HH:mm') : '-',
          dni: a.cliente_dni,
          cliente: a.clientes?.nombre || '',
          localidad: getLoc(a),
          agro: getAgro(a),
          servicio: getServ(a),
          estado: a.estado,
          usAsig: a.usuario_asignacion || '',
          usAte: a.usuario_atencion || ''
        });
      });

      // ----------------------------------------------------
      // HOJA 3: Resumen por Localidad
      // ----------------------------------------------------
      const sheetLoc = workbook.addWorksheet('Resumen por Localidad');
      sheetLoc.columns = [
        { header: 'Localidad', key: 'loc', width: 25 },
        { header: 'Asignados', key: 'asig', width: 15 },
        { header: 'Pendientes', key: 'pend', width: 15 },
        { header: 'Utilizados', key: 'util', width: 15 },
        { header: 'Cancelados', key: 'canc', width: 15 }
      ];
      headerStyle(sheetLoc.getRow(1));

      const locStats: Record<string, { asig: number, pend: number, util: number, canc: number }> = {};
      asignaciones.forEach(a => {
        const l = getLoc(a);
        if (!locStats[l]) locStats[l] = { asig: 0, pend: 0, util: 0, canc: 0 };
        if (a.estado === 'Cancelado') locStats[l].canc++;
        else {
          locStats[l].asig++;
          if (a.estado === 'Pendiente') locStats[l].pend++;
          if (a.estado === 'Utilizado') locStats[l].util++;
        }
      });
      
      Object.entries(locStats).forEach(([loc, s]) => {
        sheetLoc.addRow({ loc, asig: s.asig, pend: s.pend, util: s.util, canc: s.canc });
      });

      // ----------------------------------------------------
      // HOJA 4: Indicadores
      // ----------------------------------------------------
      const sheetInd = workbook.addWorksheet('Indicadores');
      sheetInd.columns = [{ width: 30 }, { width: 15 }];
      
      sheetInd.addRow(['MÉTRICAS GLOBALES', 'Valor']).font = { bold: true };
      sheetInd.addRow(['Beneficios Asignados (Vigentes)', totalAsignados]);
      sheetInd.addRow(['Beneficios Utilizados', totalUtilizados]);
      sheetInd.addRow(['Beneficios Pendientes', totalPendientes]);
      sheetInd.addRow(['Beneficios Cancelados', totalCancelados]);
      sheetInd.addRow(['Tasa de Utilización', `${tasaUtilizacion.toFixed(1)}%`]);
      sheetInd.addRow(['Clientes Únicos Servidos', clientesUnicos]);
      sheetInd.addRow([]);
      sheetInd.addRow(['MÉTRICAS DE CONVENIOS', 'Valor']).font = { bold: true };
      sheetInd.addRow(['Convenios Activos', conveniosActivos]);
      sheetInd.addRow(['Cupos Totales', cuposTotales]);
      sheetInd.addRow(['Cupos Consumidos (Asig.)', cuposConsumidos]);
      sheetInd.addRow(['Cupos Disponibles', cuposDisponibles]);
      sheetInd.addRow(['% Consumo de Cupos', `${porcentajeCuposUsados.toFixed(1)}%`]);

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Reporte_Servicios_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
      toast.success("Reporte descargado correctamente", { id: "exportServ" });

    } catch (e) {
      toast.error("Error al exportar reporte", { id: "exportServ" });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-textMain">Dashboard de Servicios</h2>
          <p className="text-gray-500 text-sm">Monitoreo y análisis del desempeño de los servicios veterinarios.</p>
        </div>
        <button 
          onClick={exportReporte}
          disabled={exporting || asignaciones.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <FileSpreadsheet size={18} />
          {exporting ? 'Generando...' : 'Exportar Reporte Excel'}
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card bg-white border-l-4 border-l-andes-dark p-4">
          <p className="text-xs font-bold text-gray-500 uppercase">Asignados</p>
          <p className="text-2xl font-bold text-gray-900">{totalAsignados}</p>
        </div>
        <div className="card bg-white border-l-4 border-l-success p-4">
          <p className="text-xs font-bold text-gray-500 uppercase">Utilizados</p>
          <p className="text-2xl font-bold text-success">{totalUtilizados}</p>
        </div>
        <div className="card bg-white border-l-4 border-l-amber-500 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{totalPendientes}</p>
        </div>
        <div className="card bg-white border-l-4 border-l-gray-400 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase">Cancelados</p>
          <p className="text-2xl font-bold text-gray-600">{totalCancelados}</p>
        </div>
        <div className="card bg-white border-l-4 border-l-blue-400 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase">Clientes</p>
          <p className="text-2xl font-bold text-gray-900">{clientesUnicos}</p>
        </div>
        <div className="card bg-white border-l-4 border-l-purple-500 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase">Tasa de Uso</p>
          <p className="text-2xl font-bold text-purple-600">{tasaUtilizacion.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPIs Convenios */}
        <div className="card p-5 space-y-4 col-span-1">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <ShieldCheck size={18} className="text-andes" /> Resumen de Convenios
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Convenios Activos</span>
              <span className="font-bold text-gray-900">{conveniosActivos}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Cupos Totales Ofertados</span>
              <span className="font-bold text-gray-900">{cuposTotales}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Cupos Consumidos</span>
              <span className="font-bold text-amber-600">{cuposConsumidos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">Tasa Ocupación</span>
              <span className="font-bold text-andes text-lg">{porcentajeCuposUsados.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Tabla Resumen por Servicio */}
        <div className="card p-0 overflow-hidden col-span-2">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Desempeño por Servicio</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-andes-dark text-white">
              <tr>
                <th className="p-3 font-semibold rounded-tl-lg">Servicio</th>
                <th className="p-3 font-semibold text-center">Asignados</th>
                <th className="p-3 font-semibold text-center">Utilizados</th>
                <th className="p-3 font-semibold text-center">Pendientes</th>
                <th className="p-3 font-semibold text-right rounded-tr-lg">% Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tablaServicios.map(s => (
                <tr key={s.nombre} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-textMain">{s.nombre}</td>
                  <td className="p-3 text-center">{s.asignados}</td>
                  <td className="p-3 text-center text-success font-medium">{s.utilizados}</td>
                  <td className="p-3 text-center text-amber-600">{s.pendientes}</td>
                  <td className="p-3 text-right font-bold text-gray-700">{s.tasa.toFixed(1)}%</td>
                </tr>
              ))}
              {tablaServicios.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla Resumen por Agroveterinaria */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Desempeño por Agroveterinaria</h3>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-andes-dark text-white sticky top-0">
                <tr>
                  <th className="p-3 font-semibold rounded-tl-lg">Agroveterinaria</th>
                  <th className="p-3 font-semibold text-center">Asig.</th>
                  <th className="p-3 font-semibold text-center">Util.</th>
                  <th className="p-3 font-semibold text-center rounded-tr-lg">Pend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tablaAgros.map(a => (
                  <tr key={a.nombre} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-textMain text-xs truncate max-w-[120px]" title={a.nombre}>{a.nombre}</td>
                    <td className="p-3 text-center">{a.asignados}</td>
                    <td className="p-3 text-center text-success font-medium">{a.utilizados}</td>
                    <td className="p-3 text-center text-amber-600">{a.pendientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Estado de Cupos (Semáforo) */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Estado de Cupos (Disponibilidad)</h3>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-andes-dark text-white sticky top-0">
                <tr>
                  <th className="p-3 font-semibold rounded-tl-lg">Agro / Servicio</th>
                  <th className="p-3 font-semibold text-center">Total</th>
                  <th className="p-3 font-semibold text-center">Disp.</th>
                  <th className="p-3 font-semibold text-center rounded-tr-lg">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tablaCupos.map((c, idx) => {
                  const percent = c.total > 0 ? c.disponible / c.total : 0;
                  let colorClass = 'bg-green-100 text-green-700'; // Normal
                  let text = 'OK';
                  if (c.disponible === 0) { colorClass = 'bg-red-100 text-red-700'; text = 'Agotado'; }
                  else if (percent <= 0.2) { colorClass = 'bg-amber-100 text-amber-700'; text = 'Crítico'; }

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-textMain text-xs truncate max-w-[150px]" title={c.servicio}>{c.servicio}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]" title={c.agroveterinaria}>{c.agroveterinaria}</div>
                      </td>
                      <td className="p-3 text-center text-gray-500">{c.total}</td>
                      <td className="p-3 text-center font-bold text-gray-700">{c.disponible}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                          {text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla Principal Detallada */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 relative">
            <Search size={16} className="absolute left-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por DNI..." 
              className="input-field pl-9 py-1.5 text-sm w-full"
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
            />
          </div>
          <div className="flex gap-3 flex-1">
            <select className="input-field py-1.5 text-sm flex-1" value={filterLocalidad} onChange={(e) => setFilterLocalidad(e.target.value)}>
              <option value="">Localidad (Todas)</option>
              {uniqueLocalidades.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="input-field py-1.5 text-sm flex-1" value={filterAgroveterinaria} onChange={(e) => setFilterAgroveterinaria(e.target.value)}>
              <option value="">Agroveterinaria (Todas)</option>
              {uniqueAgro.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="input-field py-1.5 text-sm w-32" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Estado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Utilizado">Utilizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-andes-dark text-white border-b border-andes-dark text-xs uppercase">
                <th className="p-4 font-semibold rounded-tl-lg">Cliente</th>
                <th className="p-4 font-semibold">Ubicación</th>
                <th className="p-4 font-semibold">Beneficio Asignado</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold rounded-tr-lg">Fechas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Cargando datos...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron registros.</td></tr>
              ) : (
                filteredData.map(reg => (
                  <tr key={reg.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-textMain">{reg.clientes?.nombre || 'Desconocido'}</div>
                      <div className="text-xs text-gray-500">DNI: {reg.cliente_dni}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{getAgro(reg)}</div>
                      <div className="text-xs text-gray-500">{getLoc(reg)}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                        {getServ(reg)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium ${
                        reg.estado === 'Utilizado' ? 'bg-success/10 text-success' : 
                        reg.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {reg.estado}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        Asignado: {format(new Date(reg.fecha_asignacion), 'dd/MM/yy HH:mm')}
                      </div>
                      {reg.fecha_utilizacion && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <CheckCircle2 size={12} />
                          Uso: {format(new Date(reg.fecha_utilizacion), 'dd/MM/yy HH:mm')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminServiciosDashboard;
