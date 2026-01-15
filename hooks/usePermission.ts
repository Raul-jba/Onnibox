
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export type Permission = 
    | 'view_dashboard_full'     // See Net Profit, Charts
    | 'view_reports'            // Access Reports Page
    | 'manage_financials'       // Access Accounts Payable, Closing
    | 'close_box'               // Perform Daily Close
    | 'reopen_cash'             // Reopen individual Route/Agency cash
    | 'manage_registries'       // Access Settings/Registries
    | 'manage_system'           // Backup, Restore, Reset
    | 'delete_records'          // Hard Delete items (Drivers, Vehicles)
    | 'edit_commissions'        // Change commission rules
    | 'approve_tourism';        // Approve/Reject Quotes

const PERMISSION_MATRIX: Record<Permission, UserRole[]> = {
    // 1. Dashboard & Visibility
    view_dashboard_full: ['ADMIN', 'MANAGER', 'AUDITOR'], 
    view_reports: ['ADMIN', 'MANAGER', 'FINANCIAL', 'AUDITOR'],
    
    // 2. Modules Access
    manage_financials: ['ADMIN', 'MANAGER', 'FINANCIAL'],
    manage_registries: ['ADMIN', 'MANAGER'], 
    
    // 3. Critical Actions
    close_box: ['ADMIN', 'MANAGER', 'FINANCIAL'],
    reopen_cash: ['ADMIN', 'MANAGER'], // Only Manager/Admin can reopen a checked cash to prevent fraud
    manage_system: ['ADMIN'], 
    delete_records: ['ADMIN', 'MANAGER'], 
    edit_commissions: ['ADMIN'],
    approve_tourism: ['ADMIN', 'MANAGER', 'FINANCIAL'],
};

export const usePermission = () => {
    const { user } = useAuth();

    const can = (permission: Permission): boolean => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        
        const allowedRoles = PERMISSION_MATRIX[permission];
        return allowedRoles.includes(user.role);
    };

    const roleName = () => {
        switch(user?.role) {
            case 'ADMIN': return 'Administrador';
            case 'MANAGER': return 'Gestor de Frota';
            case 'FINANCIAL': return 'Financeiro';
            case 'OPERATOR': return 'Operador';
            case 'AUDITOR': return 'Auditor';
            default: return 'Visitante';
        }
    };

    return { can, role: user?.role, roleName: roleName() };
};
