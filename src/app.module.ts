import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ContactModule } from './contact/contact.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ContactModule, UserModule],
  controllers: [AppController],
})
export class AppModule {}
