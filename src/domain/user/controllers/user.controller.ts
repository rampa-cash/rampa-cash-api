import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ParaSdkSessionData } from '../services/user-creation.service';
import { KycService, KycUpdateData } from '../services/kyc.service';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';

@ApiTags('User')
@Controller('user')
@UseGuards(SessionValidationGuard)
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly kycService: KycService,
    ) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userService.remove(id);
    }

    // Para SDK Authentication Endpoints
    @Post('create-from-session')
    @ApiOperation({ summary: 'Create user from Para SDK session' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    @ApiBody({ description: 'Para SDK session data' })
    createFromSession(@Body() sessionData: ParaSdkSessionData) {
        return this.userService.createUserFromParaSdkSession(sessionData);
    }

    @Patch(':id/update-from-session')
    @ApiOperation({ summary: 'Update user from Para SDK session' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({ description: 'Para SDK session data' })
    updateFromSession(@Param('id') id: string, @Body() sessionData: ParaSdkSessionData) {
        return this.userService.updateUserFromParaSdkSession(id, sessionData);
    }

    @Get('email/:email')
    @ApiOperation({ summary: 'Get user by email' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'email', description: 'User email' })
    findByEmail(@Param('email') email: string) {
        return this.userService.getUserByEmail(email);
    }

    @Get(':id/kyc-status')
    @ApiOperation({ summary: 'Get user KYC status' })
    @ApiResponse({ status: 200, description: 'KYC status retrieved' })
    @ApiParam({ name: 'id', description: 'User ID' })
    getKycStatus(@Param('id') id: string) {
        return this.userService.validateKycStatus(id);
    }

    // KYC Management Endpoints
    @Patch(':id/kyc')
    @ApiOperation({ summary: 'Update user KYC data' })
    @ApiResponse({ status: 200, description: 'KYC data updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({ description: 'KYC update data' })
    updateKycData(@Param('id') id: string, @Body() kycData: KycUpdateData) {
        return this.kycService.updateKycData(id, kycData);
    }

    @Get(':id/kyc-details')
    @ApiOperation({ summary: 'Get detailed KYC status' })
    @ApiResponse({ status: 200, description: 'KYC details retrieved' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'id', description: 'User ID' })
    getKycDetails(@Param('id') id: string) {
        return this.kycService.getKycStatus(id);
    }

    @Get(':id/kyc-progress')
    @ApiOperation({ summary: 'Get KYC completion progress' })
    @ApiResponse({ status: 200, description: 'KYC progress retrieved' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'id', description: 'User ID' })
    getKycProgress(@Param('id') id: string) {
        return this.kycService.getKycCompletionProgress(id);
    }
}
