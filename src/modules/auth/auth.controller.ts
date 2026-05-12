import { Controller, Post, Body, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { rolePermissions } from '../../config/permissions';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: { username: string; password: string }) {
        return this.authService.login(loginDto.username, loginDto.password);
    }

    @Post('logout')
    async logout() {
        // TODO: Implement logout logic
        return { message: 'Logged out successfully' };
    }

    @Post('refresh')
    async refresh(@Body() body: { refreshToken: string }) {
        // TODO: Implement token refresh
        return { accessToken: 'new_token' };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@Request() req: any) {
        const user = req.user || {};
        const roles: string[] = user.roles || [];

        // Collect permissions from rolePermissions mapping
        const permSet = new Set<string>();
        for (const role of roles) {
            const perms = rolePermissions[role] || [];
            perms.forEach((p) => permSet.add(p));
        }

        return {
            user: {
                ...user,
                roles,
            },
            permissions: Array.from(permSet),
        };
    }
}
