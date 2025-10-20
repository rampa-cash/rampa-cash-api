import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as jose from 'jose';

describe('JWKS Endpoint (Contract)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        // Generate a runtime RSA keypair and configure envs
        const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
        const publicPem = await jose.exportSPKI(publicKey);
        const privatePem = await jose.exportPKCS8(privateKey);

        process.env.WEB3AUTH_CUSTOM_JWT_ALG = 'RS256';
        process.env.WEB3AUTH_CUSTOM_JWT_KID = 'test-key-v1';
        process.env.WEB3AUTH_CUSTOM_JWT_PUBLIC_KEY_PEM = publicPem;
        process.env.WEB3AUTH_CUSTOM_JWT_PRIVATE_KEY_PEM = privatePem;
        process.env.WEB3AUTH_CUSTOM_ISSUER = 'https://auth.test.local';
        process.env.WEB3AUTH_CUSTOM_AUDIENCE = 'urn:test-audience';
        process.env.JWKS_CACHE_TTL = '120';

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /.well-known/jwks.json returns active JWK with expected fields and cache header', async () => {
        const res = await request(app.getHttpServer())
            .get('/.well-known/jwks.json')
            .expect(200)
            .expect('Content-Type', /application\/json/);

        expect(res.headers['cache-control']).toMatch(/max-age=120/);
        expect(res.body).toHaveProperty('keys');
        expect(Array.isArray(res.body.keys)).toBe(true);
        expect(res.body.keys.length).toBeGreaterThanOrEqual(1);

        const jwk = res.body.keys[0];
        expect(jwk).toHaveProperty('kty');
        expect(jwk).toHaveProperty('alg', 'RS256');
        expect(jwk).toHaveProperty('use', 'sig');
        expect(jwk).toHaveProperty('kid', 'test-key-v1');
        // RSA should have n/e
        expect(jwk).toHaveProperty('n');
        expect(jwk).toHaveProperty('e');
    });
});
