import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('VISA Card GET (Contract)', () => {
    let app: INestApplication;
    let accessToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Login to get access token for authenticated requests
        const loginData = {
            email: 'test@example.com',
            password: 'SecurePassword123!',
        };

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send(loginData);

        accessToken = loginResponse.body.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /visa-card', () => {
        it('should return user VISA cards with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('cards');
            expect(Array.isArray(response.body.cards)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('limit');
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('totalPages');
        });

        it('should support pagination parameters', async () => {
            const response = await request(app.getHttpServer())
                .get('/visa-card?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should support filtering by card status', async () => {
            const response = await request(app.getHttpServer())
                .get('/visa-card?status=ACTIVE')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('cards');
            expect(Array.isArray(response.body.cards)).toBe(true);
        });

        it('should support filtering by card type', async () => {
            const response = await request(app.getHttpServer())
                .get('/visa-card?type=VIRTUAL')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('cards');
            expect(Array.isArray(response.body.cards)).toBe(true);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/visa-card')
                .expect(401);
        });

        it('should return 400 for invalid pagination parameters', async () => {
            await request(app.getHttpServer())
                .get('/visa-card?page=-1&limit=0')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 400 for invalid status filter', async () => {
            await request(app.getHttpServer())
                .get('/visa-card?status=INVALID_STATUS')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 400 for invalid type filter', async () => {
            await request(app.getHttpServer())
                .get('/visa-card?type=INVALID_TYPE')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });
    });

    describe('GET /visa-card/{id}', () => {
        it('should return specific VISA card details', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', cardId);
            expect(response.body).toHaveProperty('cardNumber');
            expect(response.body).toHaveProperty('lastFourDigits');
            expect(response.body).toHaveProperty('expiryMonth');
            expect(response.body).toHaveProperty('expiryYear');
            expect(response.body).toHaveProperty('cardholderName');
            expect(response.body).toHaveProperty('type');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('balance');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}`)
                .expect(401);
        });

        it('should return 403 for card belonging to another user', async () => {
            const cardId = 'other-user-card-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(403);
        });
    });

    describe('GET /visa-card/{id}/transactions', () => {
        it('should return VISA card transactions', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/transactions`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('limit');
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('totalPages');
        });

        it('should support pagination parameters', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/transactions?page=1&limit=10`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should support date range filtering', async () => {
            const cardId = 'test-card-id';
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/transactions?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/transactions`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/transactions`)
                .expect(401);
        });
    });

    describe('GET /visa-card/{id}/balance', () => {
        it('should return VISA card balance', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/balance`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('cardId', cardId);
            expect(response.body).toHaveProperty('balance');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('availableBalance');
            expect(response.body).toHaveProperty('pendingBalance');
            expect(response.body).toHaveProperty('lastUpdated');
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/balance`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/balance`)
                .expect(401);
        });
    });

    describe('GET /visa-card/{id}/statements', () => {
        it('should return VISA card statements', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/statements`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('statements');
            expect(Array.isArray(response.body.statements)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('limit');
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('totalPages');
        });

        it('should support pagination parameters', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/statements?page=1&limit=10`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/statements`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';

            await request(app.getHttpServer())
                .get(`/visa-card/${cardId}/statements`)
                .expect(401);
        });
    });
});
