import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRole: 'ADMIN' | 'AGROVET';
}

export default function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bgMain flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-andes w-10 h-10 mb-4" />
        <p className="text-gray-500 font-medium">Cargando...</p>
      </div>
    );
  }

  // Si no hay sesión, redirigir al login
  if (!session || !role) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol no coincide con el permitido, redirigir a su portal respectivo
  if (role !== allowedRole) {
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'AGROVET') return <Navigate to="/veterinaria" replace />;
  }

  // Todo correcto
  return <Outlet />;
}
