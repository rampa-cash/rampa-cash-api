import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Contacts GET (Contract)', () => {
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

    describe('GET /contacts', () => {
        it('should return user contacts with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('limit');
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('totalPages');
        });

        it('should support pagination parameters', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should support search by name', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts?search=John')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);
        });

        it('should support search by email', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts?search=john@example.com')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);
        });

        it('should support search by phone', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts?search=+1234567890')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);
        });

        it('should support filtering by contact type', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts?type=FAVORITE')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/contacts')
                .expect(401);
        });

        it('should return 400 for invalid pagination parameters', async () => {
            await request(app.getHttpServer())
                .get('/contacts?page=-1&limit=0')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 400 for invalid search parameters', async () => {
            await request(app.getHttpServer())
                .get('/contacts?search=')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });
    });

    describe('GET /contacts/{id}', () => {
        it('should return specific contact details', async () => {
            const contactId = 'test-contact-id';

            const response = await request(app.getHttpServer())
                .get(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', contactId);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('email');
            expect(response.body).toHaveProperty('phoneNumber');
            expect(response.body).toHaveProperty('walletAddress');
            expect(response.body).toHaveProperty('type');
            expect(response.body).toHaveProperty('isFavorite');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');
        });

        it('should return 404 for non-existent contact', async () => {
            const contactId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const contactId = 'test-contact-id';

            await request(app.getHttpServer())
                .get(`/contacts/${contactId}`)
                .expect(401);
        });

        it('should return 403 for contact belonging to another user', async () => {
            const contactId = 'other-user-contact-id';

            await request(app.getHttpServer())
                .get(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(403);
        });
    });

    describe('GET /contacts/search', () => {
        it('should search contacts by multiple criteria', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts/search?q=John&type=FAVORITE')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);
            expect(response.body).toHaveProperty('total');
        });

        it('should return 400 for empty search query', async () => {
            await request(app.getHttpServer())
                .get('/contacts/search?q=')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 400 for search query too short', async () => {
            await request(app.getHttpServer())
                .get('/contacts/search?q=a')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/contacts/search?q=John')
                .expect(401);
        });
    });

    describe('GET /contacts/favorites', () => {
        it('should return only favorite contacts', async () => {
            const response = await request(app.getHttpServer())
                .get('/contacts/favorites')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('contacts');
            expect(Array.isArray(response.body.contacts)).toBe(true);

            // All returned contacts should be favorites
            response.body.contacts.forEach((contact: any) => {
                expect(contact.isFavorite).toBe(true);
            });
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/contacts/favorites')
                .expect(401);
        });
    });
});
