import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserVerificationController } from './controllers/user-verification.controller';
import { UserVerificationService } from './services/user-verification.service';
import { User } from './entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UserController, UserVerificationController],
    providers: [UserService, UserVerificationService],
    exports: [UserService, UserVerificationService],
})
export class UserModule {}
