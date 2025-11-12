import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentController } from './controllers/investment.controller';
import { InvestmentService } from './services/investment.service';
import { InvestmentOption } from './entities/investment-option.entity';
import { UserInvestment } from './entities/user-investment.entity';
import { InvestmentTransaction } from './entities/investment-transaction.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            InvestmentOption,
            UserInvestment,
            InvestmentTransaction,
        ]),
        AuthModule,
        UserModule, // Required for SessionValidationGuard which needs UserService
    ],
    controllers: [InvestmentController],
    providers: [InvestmentService],
    exports: [InvestmentService],
})
export class InvestmentModule {}
