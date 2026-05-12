import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
    private readonly keycloakUrl: string;
    private readonly realm: string;
    private readonly clientId: string;
    private readonly clientSecret: string;

    constructor(
        private readonly jwtService: JwtService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
        this.realm = this.configService.get<string>('KEYCLOAK_REALM');
        this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
        this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');
    }

    async login(username: string, password: string) {
        try {
            const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

            console.log('--- Debug Login ---');
            console.log('Token URL:', tokenUrl);
            console.log('Client ID:', this.clientId);
            console.log('Username:', username);
            // Don't log password

            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('client_id', this.clientId);
            params.append('username', username);
            params.append('password', password);

            if (this.clientSecret) {
                params.append('client_secret', this.clientSecret);
            }

            console.log('Sending request to Keycloak...');
            const { data } = await firstValueFrom(
                this.httpService.post(tokenUrl, params.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );
            console.log('Keycloak response received');

            // Decode token to get user info if needed, or just return tokens
            // For now, we return the tokens directly from Keycloak
            // You might want to map roles here if your frontend expects specific structure

            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
                // You can add user info decoding here if needed
                user: {
                    username: username,
                    // roles: ... (need to decode token to get roles)
                }
            };
        } catch (error) {
            console.error('Keycloak login error:', error.response?.data || error.message);
            
            // Extract error message from Keycloak response
            const keycloakError = error.response?.data;
            let errorMessage = 'Invalid username or password';
            
            if (keycloakError) {
                // Keycloak error response format: { error: 'invalid_grant', error_description: '...' }
                if (keycloakError.error_description) {
                    errorMessage = keycloakError.error_description;
                } else if (keycloakError.error) {
                    errorMessage = `Authentication failed: ${keycloakError.error}`;
                }
            }
            
            throw new UnauthorizedException({
                message: errorMessage,
                error: 'Unauthorized'
            });
        }
    }

    async validateUser(payload: any) {
        return payload;
    }
}
