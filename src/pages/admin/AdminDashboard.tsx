import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Canje, CanjeDetalle } from '../../types';
import { format } from 'date-fns';
import { Download, Search, Filter, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

// Extended type for table display (JOINs)
type CanjeCompleto = Canje & {
  clientes?: { nombre: string, localidad_id: string, localidades: { nombre: string } };
  agroveterinarias?: { nombre: string, localidades: { nombre: string } };
  canje_detalles?: CanjeDetalle[];
};

const AdminDashboard = () => {
  const [canjes, setCanjes] = useState<CanjeCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [searchDni, setSearchDni] = useState('');
  const [filterLocalidad, setFilterLocalidad] = useState('');
  const [filterAgroveterinaria, setFilterAgroveterinaria] = useState('');

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Total Clientes
    const { count } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    setTotalClientes(count || 0);

    // 2. Canjes con JOINs
    const { data, error } = await supabase
      .from('canjes')
      .select(`
        *,
        clientes ( nombre, localidades ( nombre ) ),
        agroveterinarias ( nombre, localidades ( nombre ) ),
        canje_detalles ( * )
      `)
      .order('fecha', { ascending: false });

    if (error) {
      toast.error('Error al cargar canjes');
    } else {
      setCanjes(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado
  const filteredData = canjes.filter(c => {
    const matchDni = c.cliente_dni.includes(searchDni);
    const matchLocalidad = filterLocalidad ? c.agroveterinarias?.localidades?.nombre === filterLocalidad : true;
    const matchAgro = filterAgroveterinaria ? c.agroveterinarias?.nombre === filterAgroveterinaria : true;
    return matchDni && matchLocalidad && matchAgro;
  });

  // KPIs
  const beneficiosUtilizados = canjes.length;
  const clientesAptos = totalClientes - beneficiosUtilizados;
  
  const ventasGeneradas = canjes.reduce((acc, c) => acc + Number(c.subtotal || c.precio), 0);
  const montoTotalDescontado = canjes.reduce((acc, c) => acc + Number(c.monto_descontado), 0);
  const totalNetoVendido = canjes.reduce((acc, c) => acc + Number(c.total_pagado), 0);
  const ticketPromedio = beneficiosUtilizados > 0 ? (ventasGeneradas / beneficiosUtilizados) : 0;

  // Groupings for top items
  const localMap: Record<string, number> = {};
  const agroMap: Record<string, number> = {};
  
  canjes.forEach(c => {
    const loc = c.agroveterinarias?.localidades?.nombre || 'Desconocida';
    const agro = c.agroveterinarias?.nombre || 'Desconocida';
    
    localMap[loc] = (localMap[loc] || 0) + 1;
    agroMap[agro] = (agroMap[agro] || 0) + 1;
  });

  const uniqueLocalidades = Object.keys(localMap);
  const uniqueAgro = Object.keys(agroMap);

  // Calcular Métricas de Productos (Top)
  const productStats: Record<string, { cantidad: number; subtotal: number; descuento: number }> = {};
  
  canjes.forEach(c => {
    if (c.canje_detalles && c.canje_detalles.length > 0) {
      c.canje_detalles.forEach((d: any) => {
        if (!productStats[d.producto_nombre]) {
          productStats[d.producto_nombre] = { cantidad: 0, subtotal: 0, descuento: 0 };
        }
        productStats[d.producto_nombre].cantidad += 1;
        productStats[d.producto_nombre].subtotal += Number(d.subtotal);
        productStats[d.producto_nombre].descuento += Number(d.monto_descontado);
      });
    }
  });

  const topProductos = Object.entries(productStats)
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.subtotal - a.subtotal) // Ordenar por monto vendido
    .slice(0, 4); // Top 4 para el grid

  // Calcular Top Veterinarias (Por Ahorro Generado / Descuentos)
  const agroStats: Record<string, { localidad: string; totalDescuento: number }> = {};
  canjes.forEach(c => {
    const agroName = c.agroveterinarias?.nombre || 'Desconocida';
    const locName = c.agroveterinarias?.localidades?.nombre || 'Desconocida';
    
    if (!agroStats[agroName]) {
      agroStats[agroName] = { localidad: locName, totalDescuento: 0 };
    }
    
    agroStats[agroName].totalDescuento += Number(c.monto_descontado || 0);
  });

  const topVeterinarias = Object.entries(agroStats)
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.totalDescuento - a.totalDescuento)
    .slice(0, 4);

  const exportReporteCompleto = async () => {
    setExporting(true);
    try {
      toast.loading("Generando reporte consolidado...", { id: "export" });

      // 1. Obtener todos los clientes con sus localidades
      const { data: allClientes, error: cliErr } = await supabase.from('clientes').select(`dni, nombre, localidades(nombre)`);
      if (cliErr) throw cliErr;

      // 2. Construir Data
      let reportData = allClientes.map(cliente => {
        const canje = canjes.find(c => c.cliente_dni === cliente.dni);
        const locData = cliente.localidades as any;
        const localidad = Array.isArray(locData) ? locData[0]?.nombre : locData?.nombre || 'Desconocida';
        
        if (canje) {
          const agroData = canje.agroveterinarias as any;
          const numProductos = canje.canje_detalles ? canje.canje_detalles.length : 0;
          return {
            dni: cliente.dni,
            nombre: cliente.nombre,
            localidad: localidad,
            estado: 'Utilizado',
            fecha: format(new Date(canje.fecha!), 'yyyy-MM-dd HH:mm'),
            agroveterinaria: Array.isArray(agroData) ? agroData[0]?.nombre : agroData?.nombre || '',
            productosAdquiridos: numProductos,
            subtotal: Number(canje.subtotal || canje.precio),
            montoDescontado: Number(canje.monto_descontado),
            totalPagado: Number(canje.total_pagado),
            usuarioAtencion: canje.usuario_atencion || ''
          };
        } else {
          return {
            dni: cliente.dni,
            nombre: cliente.nombre,
            localidad: localidad,
            estado: 'Disponible',
            fecha: '',
            agroveterinaria: '',
            productosAdquiridos: 0,
            subtotal: null,
            montoDescontado: null,
            totalPagado: null,
            usuarioAtencion: ''
          };
        }
      });

      // Ordenar por Localidad, luego por DNI
      reportData.sort((a, b) => {
        if (a.localidad === b.localidad) return a.dni.localeCompare(b.dni);
        return a.localidad.localeCompare(b.localidad);
      });

      const workbook = new ExcelJS.Workbook();
      
      // ============================================
      // Hoja 1: Resumen Ejecutivo
      // ============================================
      const sheet = workbook.addWorksheet('Resumen Ejecutivo');

      sheet.columns = [
        { header: 'DNI', key: 'dni', width: 12 },
        { header: 'Nombre del cliente', key: 'nombre', width: 30 },
        { header: 'Localidad', key: 'localidad', width: 15 },
        { header: 'Estado del beneficio', key: 'estado', width: 18 },
        { header: 'Fecha del canje', key: 'fecha', width: 20 },
        { header: 'Agroveterinaria', key: 'agroveterinaria', width: 30 },
        { header: 'Usuario Atención', key: 'usuarioAtencion', width: 20 },
        { header: 'Cant. Prod.', key: 'productosAdquiridos', width: 12 },
        { header: 'Subtotal Total', key: 'subtotal', width: 15 },
        { header: 'Descuento Total', key: 'montoDescontado', width: 18 },
        { header: 'Total Neto', key: 'totalPagado', width: 15 }
      ];

      // Formato de cabecera
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005BAA' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      sheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Agregar datos
      reportData.forEach(row => {
        const addedRow = sheet.addRow(row);
        if (row.subtotal !== null) addedRow.getCell('subtotal').numFmt = '"S/"#,##0.00';
        if (row.montoDescontado !== null) addedRow.getCell('montoDescontado').numFmt = '"S/"#,##0.00';
        if (row.totalPagado !== null) addedRow.getCell('totalPagado').numFmt = '"S/"#,##0.00';
      });
      // Este final original del método exportExcelEjecutivo se omite porque lo reemplazaremos al concatenar las hojas
      // ============================================
      // Hoja 2: Detalle Analítico
      // ============================================
      const sheetAnalitico = workbook.addWorksheet('Detalle Analítico');
      
      const dataAnalitico: any[] = [];
      canjes.forEach(canje => {
        const agroData = canje.agroveterinarias as any;
        const agro = Array.isArray(agroData) ? agroData[0]?.nombre : agroData?.nombre || '';
        const loc = agroData?.localidades?.nombre || 'Desconocida';
        const cliData = canje.clientes as any;

        if (!canje.canje_detalles || canje.canje_detalles.length === 0) {
          dataAnalitico.push({
            fecha: format(new Date(canje.fecha!), 'yyyy-MM-dd HH:mm'),
            nombre: cliData?.nombre || '',
            dni: canje.cliente_dni,
            agroveterinaria: agro,
            localidad: loc,
            producto: 'Antiguo (Sin detalle)',
            descuentoPct: canje.descuento_pct || 0,
            subtotal: Number(canje.subtotal || canje.precio),
            montoDescontado: Number(canje.monto_descontado),
            totalNeto: Number(canje.total_pagado)
          });
        } else {
          canje.canje_detalles.forEach((d: any) => {
            dataAnalitico.push({
              fecha: format(new Date(canje.fecha!), 'yyyy-MM-dd HH:mm'),
              nombre: cliData?.nombre || '',
              dni: canje.cliente_dni,
              agroveterinaria: agro,
              localidad: loc,
              producto: d.producto_nombre,
              descuentoPct: d.descuento_pct,
              subtotal: Number(d.subtotal),
              montoDescontado: Number(d.monto_descontado),
              totalNeto: Number(d.total_neto)
            });
          });
        }
      });

      sheetAnalitico.columns = [
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Cliente', key: 'nombre', width: 30 },
        { header: 'DNI', key: 'dni', width: 12 },
        { header: 'Agroveterinaria', key: 'agroveterinaria', width: 30 },
        { header: 'Localidad', key: 'localidad', width: 15 },
        { header: 'Producto', key: 'producto', width: 30 },
        { header: '% Desc.', key: 'descuentoPct', width: 10 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'Monto Descontado', key: 'montoDescontado', width: 18 },
        { header: 'Total Neto', key: 'totalNeto', width: 15 }
      ];

      sheetAnalitico.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });
      sheetAnalitico.views = [{ state: 'frozen', ySplit: 1 }];

      dataAnalitico.forEach(row => {
        const addedRow = sheetAnalitico.addRow(row);
        addedRow.getCell('descuentoPct').numFmt = '0"%"';
        addedRow.getCell('subtotal').numFmt = '"S/"#,##0.00';
        addedRow.getCell('montoDescontado').numFmt = '"S/"#,##0.00';
        addedRow.getCell('totalNeto').numFmt = '"S/"#,##0.00';
      });

      // ============================================
      // Hoja 3: Indicadores
      // ============================================
      const sheetIndicadores = workbook.addWorksheet('Indicadores');
      
      sheetIndicadores.getColumn(1).width = 30;
      sheetIndicadores.getColumn(2).width = 20;

      // KPIs
      sheetIndicadores.addRow(['INDICADORES GLOBALES']);
      sheetIndicadores.getRow(1).font = { bold: true, size: 14 };
      sheetIndicadores.addRow(['Beneficios utilizados', beneficiosUtilizados]);
      sheetIndicadores.addRow(['Ventas generadas', ventasGeneradas]);
      sheetIndicadores.addRow(['Descuentos otorgados', montoTotalDescontado]);
      sheetIndicadores.addRow(['Total neto', totalNetoVendido]);
      sheetIndicadores.addRow(['Ticket promedio', ticketPromedio]);
      
      [3, 4, 5, 6].forEach(r => {
        sheetIndicadores.getCell(`B${r}`).numFmt = '"S/"#,##0.00';
      });

      sheetIndicadores.addRow([]);
      sheetIndicadores.addRow(['TOP PRODUCTOS MÁS UTILIZADOS']);
      const headerRowTop = sheetIndicadores.getRow(9);
      headerRowTop.font = { bold: true, size: 14 };

      sheetIndicadores.addRow(['Nombre del producto', 'Cantidad de usos', 'Venta acumulada', 'Descuento acumulado']);
      sheetIndicadores.getRow(10).font = { bold: true };
      sheetIndicadores.getRow(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      
      sheetIndicadores.getColumn(3).width = 20;
      sheetIndicadores.getColumn(4).width = 20;

      topProductos.forEach(p => {
        const r = sheetIndicadores.addRow([p.nombre, p.cantidad, p.subtotal, p.descuento]);
        r.getCell(3).numFmt = '"S/"#,##0.00';
        r.getCell(4).numFmt = '"S/"#,##0.00';
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Reporte_Consolidado_Beneficios.xlsx');
      toast.success("Reporte Consolidado generado", { id: "export" });
    } catch (e) {
      toast.error("Error al generar el reporte consolidado", { id: "export" });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textMain">Dashboard</h2>
          <p className="text-gray-500 text-sm">Monitorización en tiempo real del piloto.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportReporteCompleto} 
            disabled={exporting}
            className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Download size={16} />
            {exporting ? 'Generando...' : 'Exportar Reporte Excel'}
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="card p-4 border-l-4 border-l-success">
          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Beneficios Usados</p>
          <h3 className="text-2xl font-bold text-textMain">{beneficiosUtilizados}</h3>
          <p className="text-xs text-gray-400 mt-1">Canjes realizados</p>
        </div>
        <div className="card p-4 border-l-4 border-l-indigo-500">
          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Ventas Generadas</p>
          <h3 className="text-2xl font-bold text-textMain">S/ {ventasGeneradas.toFixed(2)}</h3>
          <p className="text-xs text-gray-400 mt-1">Suma de subtotales</p>
        </div>
        <div className="card p-4 border-l-4 border-l-warning">
          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Total Descuentos</p>
          <h3 className="text-2xl font-bold text-textMain">S/ {montoTotalDescontado.toFixed(2)}</h3>
          <p className="text-xs text-gray-400 mt-1">Subsidio otorgado</p>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Total Neto</p>
          <h3 className="text-2xl font-bold text-textMain">S/ {totalNetoVendido.toFixed(2)}</h3>
          <p className="text-xs text-gray-400 mt-1">Ingreso real tiendas</p>
        </div>
        <div className="card p-4 border-l-4 border-l-blue-500">
          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Ticket Promedio</p>
          <h3 className="text-2xl font-bold text-textMain">S/ {ticketPromedio.toFixed(2)}</h3>
          <p className="text-xs text-gray-400 mt-1">Venta por beneficio</p>
        </div>
      </div>

      {/* Gráficos BI */}
      {(topProductos.length > 0 || topVeterinarias.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-textMain mb-4 uppercase tracking-wider text-gray-500">
              Ventas por Producto (S/)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductos} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#6B7280' }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="subtotal" name="Ventas (S/)" fill="#00CAFE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-textMain mb-4 uppercase tracking-wider text-gray-500">
              Top Veterinarias
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topVeterinarias.map((v, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col justify-between">
                  <div>
                    <span className="text-sm font-medium text-andes-dark truncate block" title={v.nombre}>{v.nombre}</span>
                    <span className="text-xs text-gray-500 truncate block" title={v.localidad}>{v.localidad}</span>
                  </div>
                  <div className="mt-3 flex justify-between items-end">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Ahorro Generado</div>
                      <div className="text-lg font-bold text-andes">S/ {v.totalDescuento.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
          <h3 className="font-semibold text-textMain flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            Búsqueda de Transacciones Reales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por DNI..." 
                className="input-field pl-9 py-2 text-sm"
                value={searchDni}
                onChange={(e) => setSearchDni(e.target.value)}
              />
            </div>
            <select 
              className="input-field py-2 text-sm"
              value={filterLocalidad}
              onChange={(e) => setFilterLocalidad(e.target.value)}
            >
              <option value="">Todas las localidades</option>
              {uniqueLocalidades.map(c => c && <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
              className="input-field py-2 text-sm"
              value={filterAgroveterinaria}
              onChange={(e) => setFilterAgroveterinaria(e.target.value)}
            >
              <option value="">Todas las agroveterinarias</option>
              {uniqueAgro.map(a => a && <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-andes-dark border-b border-andes-dark text-xs uppercase text-white">
                <th className="p-4 font-semibold rounded-tl-lg">Fecha</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Localidad / Agro</th>
                <th className="p-4 font-semibold">Productos Adquiridos</th>
                <th className="p-4 font-semibold text-right rounded-tr-lg">Subtotal / Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Cargando...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aún no hay canjes registrados en el piloto.</td></tr>
              ) : (
                filteredData.map(reg => (
                  <tr key={reg.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 align-top">
                      {format(new Date(reg.fecha || ''), 'dd/MM/yyyy')}
                      <div className="text-xs text-gray-400 mt-1">{format(new Date(reg.fecha || ''), 'HH:mm')}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-sm font-bold text-gray-900">{reg.clientes?.nombre}</div>
                      <div className="text-xs text-gray-500 mt-1">DNI: {reg.cliente_dni}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-sm text-gray-800 font-medium">{reg.agroveterinarias?.localidades?.nombre}</div>
                      <div className="text-xs text-gray-500 mt-1">{reg.agroveterinarias?.nombre}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-sm text-gray-700">
                        {reg.canje_detalles && reg.canje_detalles.length > 0 ? (
                          <div className="space-y-2">
                            {reg.canje_detalles.map((d: any) => (
                              <div key={d.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                <div className="font-bold text-xs text-gray-800 flex justify-between mb-2">
                                  <span>{d.producto_nombre}</span>
                                  <span className="text-andes-dark bg-blue-100 px-2 py-0.5 rounded-full">-{d.descuento_pct}%</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-gray-500 border-t border-gray-100 pt-1">
                                  <span>St: S/ {Number(d.subtotal).toFixed(2)}</span>
                                  <span>Dcto: S/ {Number(d.monto_descontado).toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Antiguo (Sin detalle)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right align-top">
                      <div className="text-sm text-gray-500 mb-1">St: S/ {Number(reg.subtotal || reg.precio).toFixed(2)}</div>
                      <div className="text-base font-bold text-andes-dark">Neto: S/ {Number(reg.total_pagado).toFixed(2)}</div>
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

export default AdminDashboard;
