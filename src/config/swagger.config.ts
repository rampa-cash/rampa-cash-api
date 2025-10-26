import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('Rampa - API')
        .setDescription('API for Rampa - Solana-based remittances app')
        .setVersion('1.0.0')
        .setContact('Rampa Team', 'https://rampa.cash', 'team@rampa.cash')
        .addServer('http://localhost:3001', 'Development server')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'Session',
                name: 'Session',
                description: 'Enter session token from Para SDK',
                in: 'header',
            },
            'SessionAuth',
        )
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('User', 'User management and profiles')
        .addTag('Wallet', 'Wallet and balance management')
        .addTag('Transactions', 'Token transfer operations')
        .addTag('Contacts', 'Contact management')
        .addTag('OnRamp', 'Fiat to crypto conversion')
        .addTag('OffRamp', 'Crypto to fiat conversion')
        .addTag('Learning', 'Learning modules and BONK rewards')
        .addTag('Investments', 'Investment options and portfolio management')
        .addTag('Health', 'Health check endpoints')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'none', // Start with all sections collapsed
        },
        customSiteTitle: 'Rampa API Documentation',
    });
}
