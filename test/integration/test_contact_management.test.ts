import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('Contact Management Flow (Integration)', () => {
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

    describe('Complete Contact Management Flow', () => {
        let contactId: string;

        it('should complete full contact lifecycle', async () => {
            // Step 1: Create a new contact
            const contactData = {
                name: 'John Doe',
                email: 'john@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            const createResponse = await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            expect(createResponse.body).toHaveProperty('id');
            expect(createResponse.body).toHaveProperty(
                'name',
                contactData.name,
            );
            expect(createResponse.body).toHaveProperty(
                'email',
                contactData.email,
            );
            expect(createResponse.body).toHaveProperty(
                'phoneNumber',
                contactData.phoneNumber,
            );
            expect(createResponse.body).toHaveProperty(
                'walletAddress',
                contactData.walletAddress,
            );
            expect(createResponse.body).toHaveProperty(
                'type',
                contactData.type,
            );
            expect(createResponse.body).toHaveProperty(
                'isFavorite',
                contactData.isFavorite,
            );

            contactId = createResponse.body.id;

            // Step 2: Get all contacts
            const getAllResponse = await request(app.getHttpServer())
                .get('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getAllResponse.body).toHaveProperty('contacts');
            expect(Array.isArray(getAllResponse.body.contacts)).toBe(true);
            expect(getAllResponse.body).toHaveProperty('pagination');

            // Step 3: Get specific contact
            const getContactResponse = await request(app.getHttpServer())
                .get(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getContactResponse.body).toHaveProperty('id', contactId);
            expect(getContactResponse.body).toHaveProperty(
                'name',
                contactData.name,
            );

            // Step 4: Search contacts by name
            const searchByNameResponse = await request(app.getHttpServer())
                .get('/contacts/search?q=John')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(searchByNameResponse.body).toHaveProperty('contacts');
            expect(Array.isArray(searchByNameResponse.body.contacts)).toBe(
                true,
            );
            expect(searchByNameResponse.body).toHaveProperty('total');

            // Step 5: Search contacts by email
            const searchByEmailResponse = await request(app.getHttpServer())
                .get('/contacts/search?q=john@example.com')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(searchByEmailResponse.body).toHaveProperty('contacts');
            expect(Array.isArray(searchByEmailResponse.body.contacts)).toBe(
                true,
            );

            // Step 6: Search contacts by phone
            const searchByPhoneResponse = await request(app.getHttpServer())
                .get('/contacts/search?q=+1234567890')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(searchByPhoneResponse.body).toHaveProperty('contacts');
            expect(Array.isArray(searchByPhoneResponse.body.contacts)).toBe(
                true,
            );

            // Step 7: Filter contacts by type
            const filterByTypeResponse = await request(app.getHttpServer())
                .get('/contacts?type=REGULAR')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(filterByTypeResponse.body).toHaveProperty('contacts');
            expect(Array.isArray(filterByTypeResponse.body.contacts)).toBe(
                true,
            );

            // Step 8: Update contact
            const updateData = {
                name: 'John Updated',
                email: 'john.updated@example.com',
                phoneNumber: '+1111111111',
                walletAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'FAVORITE',
                isFavorite: true,
            };

            const updateResponse = await request(app.getHttpServer())
                .put(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(updateResponse.body).toHaveProperty('id', contactId);
            expect(updateResponse.body).toHaveProperty('name', updateData.name);
            expect(updateResponse.body).toHaveProperty(
                'email',
                updateData.email,
            );
            expect(updateResponse.body).toHaveProperty('isFavorite', true);

            // Step 9: Get favorite contacts
            const favoritesResponse = await request(app.getHttpServer())
                .get('/contacts/favorites')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(favoritesResponse.body).toHaveProperty('contacts');
            expect(Array.isArray(favoritesResponse.body.contacts)).toBe(true);

            // Verify the updated contact is in favorites
            const favoriteContact = favoritesResponse.body.contacts.find(
                (contact: any) => contact.id === contactId,
            );
            expect(favoriteContact).toBeDefined();
            expect(favoriteContact.isFavorite).toBe(true);

            // Step 10: Delete contact
            const deleteResponse = await request(app.getHttpServer())
                .delete(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(deleteResponse.body).toHaveProperty(
                'message',
                'Contact deleted successfully',
            );

            // Step 11: Verify contact is deleted
            await request(app.getHttpServer())
                .get(`/contacts/${contactId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should handle contact creation with invalid data', async () => {
            const invalidContactData = {
                name: '',
                email: 'invalid-email',
                phoneNumber: 'invalid-phone',
                walletAddress: 'invalid-address',
                type: 'INVALID_TYPE',
                isFavorite: false,
            };

            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidContactData)
                .expect(400);
        });

        it('should handle duplicate contact creation', async () => {
            const contactData = {
                name: 'Duplicate Contact',
                email: 'duplicate@example.com',
                phoneNumber: '+1234567890',
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            // First creation should succeed
            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            // Second creation with same email should fail
            await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(409);
        });

        it('should handle contact operations without authentication', async () => {
            await request(app.getHttpServer()).get('/contacts').expect(401);

            await request(app.getHttpServer())
                .post('/contacts')
                .send({})
                .expect(401);

            await request(app.getHttpServer())
                .get('/contacts/test-id')
                .expect(401);

            await request(app.getHttpServer())
                .put('/contacts/test-id')
                .send({})
                .expect(401);

            await request(app.getHttpServer())
                .delete('/contacts/test-id')
                .expect(401);
        });

        it('should handle non-existent contact operations', async () => {
            const nonExistentId = 'non-existent-contact-id';

            await request(app.getHttpServer())
                .get(`/contacts/${nonExistentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            await request(app.getHttpServer())
                .put(`/contacts/${nonExistentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ name: 'Updated' })
                .expect(404);

            await request(app.getHttpServer())
                .delete(`/contacts/${nonExistentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should handle contact search with invalid parameters', async () => {
            await request(app.getHttpServer())
                .get('/contacts/search?q=')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);

            await request(app.getHttpServer())
                .get('/contacts/search?q=a')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should handle contact pagination', async () => {
            // Create multiple contacts for pagination testing
            const contacts = [];
            for (let i = 0; i < 5; i++) {
                const contactData = {
                    name: `Contact ${i}`,
                    email: `contact${i}@example.com`,
                    phoneNumber: `+123456789${i}`,
                    walletAddress: `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW${i}`,
                    type: 'REGULAR',
                    isFavorite: false,
                };

                const response = await request(app.getHttpServer())
                    .post('/contacts')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send(contactData)
                    .expect(201);

                contacts.push(response.body.id);
            }

            // Test pagination
            const page1Response = await request(app.getHttpServer())
                .get('/contacts?page=1&limit=2')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(page1Response.body.pagination.page).toBe(1);
            expect(page1Response.body.pagination.limit).toBe(2);
            expect(page1Response.body.contacts.length).toBeLessThanOrEqual(2);

            // Clean up created contacts
            for (const contactId of contacts) {
                await request(app.getHttpServer())
                    .delete(`/contacts/${contactId}`)
                    .set('Authorization', `Bearer ${accessToken}`)
                    .expect(200);
            }
        });
    });
});
