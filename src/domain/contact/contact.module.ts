import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from './controllers/contact.controller';
import { ContactService } from './services/contact.service';
import { CONTACT_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { Contact } from './entities/contact.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contact]),
        UserModule,
        forwardRef(() => AuthModule),
    ],
    controllers: [ContactController],
    providers: [
        {
            provide: CONTACT_SERVICE_TOKEN,
            useClass: ContactService,
        },
        ContactService,
    ],
    exports: [CONTACT_SERVICE_TOKEN, ContactService],
})
export class ContactModule {}
