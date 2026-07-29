import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { PackageOpen } from 'lucide-react';

const AdminProducts = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agroveterinaria_productos')
      .select(`
        precio_venta,
        descuento_pct,
        agroveterinarias ( nombre, localidades ( nombre ) ),
        productos ( nombre )
      `);

    if (error) {
      toast.error('Error al cargar productos');
    } else {
      setProductos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-textMain">Catálogo de Productos y Convenios</h2>
        <p className="text-gray-500 text-sm">Visualización del portafolio autorizado por agroveterinaria.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="p-4 font-semibold">Localidad</th>
                <th className="p-4 font-semibold">Agroveterinaria</th>
                <th className="p-4 font-semibold">Producto</th>
                <th className="p-4 font-semibold text-right">Precio Venta (S/)</th>
                <th className="p-4 font-semibold text-right">Descuento (%)</th>
                <th className="p-4 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando...</td></tr>
              ) : productos.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500 flex flex-col items-center">
                  <PackageOpen size={40} className="text-gray-300 mb-2" />
                  No hay productos registrados en el convenio
                </td></tr>
              ) : (
                productos.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">{prod.agroveterinarias?.localidades?.nombre}</td>
                    <td className="p-4 text-sm font-medium text-textMain">{prod.agroveterinarias?.nombre}</td>
                    <td className="p-4 text-sm text-gray-800">{prod.productos?.nombre}</td>
                    <td className="p-4 text-right text-sm">S/ {Number(prod.precio_venta).toFixed(2)}</td>
                    <td className="p-4 text-right text-sm font-semibold text-andes">{prod.descuento_pct}%</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activo
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
  );
};

export default AdminProducts;
