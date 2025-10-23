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
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'BearerAuth',
        )
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'Web3Auth',
                description: 'Enter Web3Auth JWT token',
                in: 'header',
            },
            'Web3Auth',
        )
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('User', 'User management and profiles')
        .addTag('Wallet', 'Wallet and balance management')
        .addTag('Transactions', 'Token transfer operations')
        .addTag('Contacts', 'Contact management')
        .addTag('OnRamp', 'Fiat to crypto conversion')
        .addTag('OffRamp', 'Crypto to fiat conversion')
        .addTag('VISA Card', 'VISA card management')
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
