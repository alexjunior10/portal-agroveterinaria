export interface Localidad {
  id: string;
  nombre: string;
}

export interface Cliente {
  dni: string;
  nombre: string;
  localidad_id: string;
}

export interface Agroveterinaria {
  id: string;
  nombre: string;
  localidad_id: string;
  descuento_convenio_pct?: number;
}

export interface Producto {
  id: string;
  nombre: string;
}

export interface AgroveterinariaProducto {
  id: string;
  agroveterinaria_id: string;
  producto_id: string;
  precio_venta: number;
  descuento_pct: number;
  estado: string;
}

export interface Canje {
  id: string;
  cliente_dni: string;
  agroveterinaria_id: string;
  producto_id?: string;
  precio?: number;
  subtotal?: number;
  descuento_pct: number;
  monto_descontado: number;
  total_pagado: number;
  cantidad?: number;
  fecha?: string;
  usuario_atencion?: string;
}

export interface CanjeDetalle {
  id: string;
  canje_id: string;
  agroveterinaria_producto_id: string;
  producto_nombre: string;
  descuento_pct: number;
  subtotal: number;
  monto_descontado: number;
  total_neto: number;
}
