import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('API Endpoints Integration Tests', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [],
                    synchronize: true,
                }),
                AppModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        dataSource = moduleFixture.get<DataSource>(DataSource);

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Health Endpoints', () => {
        it('GET /health should return health status', async () => {
            const response = await request(app.getHttpServer())
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('database');
        });

        it('GET /health/ready should return readiness status', async () => {
            const response = await request(app.getHttpServer())
                .get('/health/ready')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(['ready', 'not ready']).toContain(response.body.status);
        });

        it('GET /health/live should return liveness status', async () => {
            const response = await request(app.getHttpServer())
                .get('/health/live')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'alive');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
        });
    });

    describe('Authentication Endpoints', () => {
        it('POST /auth/session/import should require valid session data', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /auth/session/validate should require session token', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/session/validate')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /auth/session/refresh should require session token', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/session/refresh')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('User Endpoints', () => {
        it('GET /users/profile should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/profile')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('PUT /users/profile should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .put('/users/profile')
                .send({})
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('GET /users/kyc/status should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/kyc/status')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Wallet Endpoints', () => {
        it('GET /wallets should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallets')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /wallets should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .post('/wallets')
                .send({})
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('GET /wallets/balance should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallets/balance')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Transaction Endpoints', () => {
        it('GET /transactions should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /transactions should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send({})
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('GET /transactions/history should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/history')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Contact Endpoints', () => {
        it('GET /contacts should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /contacts should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .post('/contacts')
                .send({})
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('OnRamp Endpoints', () => {
        it('POST /onramp/initiate should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .send({})
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('GET /onramp/status/:id should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/onramp/status/test-id')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Learning Endpoints', () => {
        it('GET /learning/modules should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/learning/modules')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /learning/modules/:id/start should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .post('/learning/modules/test-id/start')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Investment Endpoints', () => {
        it('GET /investments/options should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/investments/options')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('POST /investments/invest should require authentication', async () => {
            const response = await request(app.getHttpServer())
                .post('/investments/invest')
                .send({})
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent endpoints', async () => {
            const response = await request(app.getHttpServer())
                .get('/non-existent-endpoint')
                .expect(404);

            expect(response.body).toHaveProperty('message');
        });

        it('should return 405 for unsupported methods', async () => {
            const response = await request(app.getHttpServer())
                .patch('/health')
                .expect(405);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('CORS Headers', () => {
        it('should include CORS headers in responses', async () => {
            const response = await request(app.getHttpServer())
                .get('/health')
                .expect(200);

            expect(response.headers).toHaveProperty(
                'access-control-allow-origin',
            );
            expect(response.headers).toHaveProperty(
                'access-control-allow-methods',
            );
            expect(response.headers).toHaveProperty(
                'access-control-allow-headers',
            );
        });
    });

    describe('Rate Limiting', () => {
        it('should include rate limit headers', async () => {
            const response = await request(app.getHttpServer())
                .get('/health')
                .expect(200);

            expect(response.headers).toHaveProperty('x-ratelimit-limit');
            expect(response.headers).toHaveProperty('x-ratelimit-remaining');
            expect(response.headers).toHaveProperty('x-ratelimit-reset');
        });
    });

    describe('Request Validation', () => {
        it('should reject malformed JSON', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject requests with suspicious patterns', async () => {
            const response = await request(app.getHttpServer())
                .get('/health')
                .query({ test: '<script>alert("xss")</script>' })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });
});
