import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

interface ProtectedRouteProps {
    allowedRoles: string[];
    children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
    const role = useSelector((state: any) => state.auth.role);
    if (!role) {
        return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
