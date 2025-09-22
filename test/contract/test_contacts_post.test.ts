import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Contacts POST (Contract)', () => {
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

    describe('POST /contacts', () => {
        it('should create a new contact', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            const response = await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', contactData.name);
            expect(response.body).toHaveProperty('email', contactData.email);
            expect(response.body).toHaveProperty(
                'phoneNumber',
                contactData.phoneNumber,
            );
            expect(response.body).toHaveProperty(
                'walletAddress',
                contactData.walletAddress,
            );
            expect(response.body).toHaveProperty('type', contactData.type);
            expect(response.body).toHaveProperty(
                'isFavorite',
                contactData.isFavorite,
            );
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');
        });

        it('should create a favorite contact', async () => {
            const contactData = {
                name: 'Jane Smith',
                email: 'jane@example.com',
                phoneNumber: '+0987654321',
                walletAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'FAVORITE',
                isFavorite: true,
            };

            const response = await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('name', contactData.name);
            expect(response.body).toHaveProperty('isFavorite', true);
        });

        it('should return 400 for invalid email format', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'invalid-email',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(400);
        });

        it('should return 400 for invalid phone number format', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: 'invalid-phone',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(400);
        });

        it('should return 400 for invalid wallet address format', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: 'invalid-address-format',
                type: 'REGULAR',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(400);
        });

        it('should return 400 for invalid contact type', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'INVALID_TYPE',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const contactData = {
                name: 'John Doe',
                // Missing email, phoneNumber, walletAddress
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(400);
        });

        it('should return 400 for empty name', async () => {
            const contactData = {
                name: '',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(400);
        });

        it('should return 409 for duplicate email', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'duplicate@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            // First contact should succeed
            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            // Second contact with same email should fail
            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(409);
        });

        it('should return 409 for duplicate wallet address', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            // First contact should succeed
            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            // Second contact with same wallet address should fail
            const duplicateContactData = {
                ...contactData,
                email: 'different@example.com',
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(duplicateContactData)
                .expect(409);
        });

        it('should return 401 for unauthenticated request', async () => {
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .send(contactData)
                .expect(401);
        });
    });

    describe('PUT /contacts/{id}', () => {
        it('should update existing contact', async () => {
            const contactId = 'test-contact-id';
            const updateData = {
                name: 'John Updated',
                email: 'john.updated@example.com',
                phoneNumber: '+1111111111',
                walletAddress: '7XzBXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'FAVORITE',
                isFavorite: true,
            };

            const response = await request(app.getHttpServer())
                .put(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('id', contactId);
            expect(response.body).toHaveProperty('name', updateData.name);
            expect(response.body).toHaveProperty('email', updateData.email);
            expect(response.body).toHaveProperty(
                'phoneNumber',
                updateData.phoneNumber,
            );
            expect(response.body).toHaveProperty(
                'walletAddress',
                updateData.walletAddress,
            );
            expect(response.body).toHaveProperty('type', updateData.type);
            expect(response.body).toHaveProperty(
                'isFavorite',
                updateData.isFavorite,
            );
            expect(response.body).toHaveProperty('updatedAt');
        });

        it('should return 404 for non-existent contact', async () => {
            const contactId = 'non-existent-id';
            const updateData = {
                name: 'John Updated',
            };

            await request(app.getHttpServer())
                .put(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const contactId = 'test-contact-id';
            const updateData = {
                name: 'John Updated',
            };

            await request(app.getHttpServer())
                .put(`/contacts/${contactId}`)
                .send(updateData)
                .expect(401);
        });
    });

    describe('DELETE /contacts/{id}', () => {
        it('should delete existing contact', async () => {
            const contactId = 'test-contact-id';

            const response = await request(app.getHttpServer())
                .delete(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty(
                'message',
                'Contact deleted successfully',
            );
        });

        it('should return 404 for non-existent contact', async () => {
            const contactId = 'non-existent-id';

            await request(app.getHttpServer())
                .delete(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const contactId = 'test-contact-id';

            await request(app.getHttpServer())
                .delete(`/contacts/${contactId}`)
                .expect(401);
        });
    });
});
