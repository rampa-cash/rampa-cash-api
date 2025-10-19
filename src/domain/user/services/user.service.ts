import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User, UserStatus } from '../entities/user.entity';
import { IUserService } from '../interfaces/user-service.interface';

@Injectable()
export class UserService implements IUserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        // Check if user with email already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Check if user with phone already exists (if provided)
        if (createUserDto.phone) {
            const existingPhoneUser = await this.userRepository.findOne({
                where: { phone: createUserDto.phone },
            });

            if (existingPhoneUser) {
                throw new ConflictException(
                    'User with this phone number already exists',
                );
            }
        }

        const user = this.userRepository.create({
            ...createUserDto,
            isActive: createUserDto.isActive ?? true,
            status: UserStatus.ACTIVE,
        });

        return await this.userRepository.save(user);
    }

    async findAll(): Promise<User[]> {
        return await this.userRepository.find({
            where: { isActive: true },
            relations: ['wallets', 'visaCard'],
        });
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id, isActive: true },
            relations: [
                'wallets',
                'visaCard',
                'ownedContacts',
                'sentTransactions',
                'receivedTransactions',
            ],
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { email, isActive: true },
            relations: ['wallets'],
        });
    }

    async findByPhone(phone: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { phone, isActive: true },
            relations: ['wallets'],
        });
    }

    async findByAuthProvider(
        authProvider: string,
        authProviderId: string,
    ): Promise<User | null> {
        return await this.userRepository.findOne({
            where: {
                authProvider: authProvider as any,
                authProviderId,
                isActive: true,
            },
            relations: ['wallets'],
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);

        // Check for email conflicts if email is being updated
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.userRepository.findOne({
                where: { email: updateUserDto.email },
            });

            if (existingUser) {
                throw new ConflictException(
                    'User with this email already exists',
                );
            }
        }

        // Check for phone conflicts if phone is being updated
        if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
            const existingPhoneUser = await this.userRepository.findOne({
                where: { phone: updateUserDto.phone },
            });

            if (existingPhoneUser) {
                throw new ConflictException(
                    'User with this phone number already exists',
                );
            }
        }

        Object.assign(user, updateUserDto);
        return await this.userRepository.save(user);
    }

    async remove(id: string): Promise<void> {
        const user = await this.findOne(id);

        // Soft delete - set isActive to false
        user.isActive = false;
        await this.userRepository.save(user);
    }

    async suspend(id: string): Promise<User> {
        const user = await this.findOne(id);
        user.status = UserStatus.SUSPENDED;
        return await this.userRepository.save(user);
    }

    async activate(id: string): Promise<User> {
        const user = await this.findOne(id);
        user.status = UserStatus.ACTIVE;
        return await this.userRepository.save(user);
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.userRepository.update(id, {
            lastLoginAt: new Date(),
        });
    }

    async getUsersByStatus(status: UserStatus): Promise<User[]> {
        return await this.userRepository.find({
            where: { status, isActive: true },
            relations: ['wallets'],
        });
    }
}
