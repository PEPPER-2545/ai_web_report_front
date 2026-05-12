import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { rolePermissions } from '../../../config/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no permissions metadata set, do not block (preserve existing behavior)
        if (!requiredPermissions) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        // If no user info, deny
        if (!user) return false;

        // Admin bypass
        if (user?.roles?.includes('admin')) {
            return true;
        }

        const userRoles: string[] = user.roles || [];

        // Helper: check if a granted permission (may include wildcard) matches required permission
        const matches = (granted: string, required: string) => {
            if (granted === '*') return true;
            if (granted.endsWith('*')) {
                const prefix = granted.slice(0, -1);
                return required.startsWith(prefix);
            }
            return granted === required;
        };

        // Check if any required permission is satisfied by any role of the user
        return requiredPermissions.some((required) =>
            userRoles.some((role) => {
                const perms = rolePermissions[role] || [];
                return perms.some((granted) => matches(granted, required));
            }),
        );
    }
}
