import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface BackupOptions {
    includeData?: boolean;
    includeSchema?: boolean;
    compression?: boolean;
    tables?: string[];
    excludeTables?: string[];
}

export interface BackupResult {
    success: boolean;
    backupPath?: string;
    size?: number;
    duration?: number;
    error?: string;
    timestamp: Date;
}

export interface RestoreOptions {
    backupPath: string;
    dropExisting?: boolean;
    createDatabase?: boolean;
}

export interface RestoreResult {
    success: boolean;
    duration?: number;
    error?: string;
    timestamp: Date;
}

@Injectable()
export class DataBackupService {
    private readonly logger = new Logger(DataBackupService.name);
    private readonly backupDir: string;
    private readonly dbConfig: any;

    constructor(
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) {
        this.backupDir = this.configService.get<string>('BACKUP_DIR') || './backups';
        this.dbConfig = this.dataSource.options;
    }

    async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
        const startTime = Date.now();
        const timestamp = new Date();

        try {
            // Ensure backup directory exists
            await this.ensureBackupDirectory();

            // Generate backup filename
            const filename = this.generateBackupFilename(timestamp, options);
            const backupPath = path.join(this.backupDir, filename);

            // Build pg_dump command
            const command = this.buildPgDumpCommand(backupPath, options);

            this.logger.log(`Starting database backup to: ${backupPath}`);

            // Execute backup
            const { stdout, stderr } = await execAsync(command);

            if (stderr && !stderr.includes('WARNING')) {
                throw new Error(`pg_dump stderr: ${stderr}`);
            }

            // Get backup file size
            const stats = await fs.stat(backupPath);
            const size = stats.size;

            const duration = Date.now() - startTime;

            this.logger.log(`Backup completed successfully: ${backupPath} (${this.formatBytes(size)})`);

            return {
                success: true,
                backupPath,
                size,
                duration,
                timestamp,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Backup failed: ${error.message}`);

            return {
                success: false,
                duration,
                error: error.message,
                timestamp,
            };
        }
    }

    async restoreBackup(options: RestoreOptions): Promise<RestoreResult> {
        const startTime = Date.now();
        const timestamp = new Date();

        try {
            // Check if backup file exists
            await fs.access(options.backupPath);

            // Build psql command
            const command = this.buildPsqlCommand(options);

            this.logger.log(`Starting database restore from: ${options.backupPath}`);

            // Execute restore
            const { stdout, stderr } = await execAsync(command);

            if (stderr && !stderr.includes('WARNING')) {
                throw new Error(`psql stderr: ${stderr}`);
            }

            const duration = Date.now() - startTime;

            this.logger.log(`Restore completed successfully`);

            return {
                success: true,
                duration,
                timestamp,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Restore failed: ${error.message}`);

            return {
                success: false,
                duration,
                error: error.message,
                timestamp,
            };
        }
    }

    async listBackups(): Promise<Array<{ filename: string; path: string; size: number; created: Date }>> {
        try {
            await this.ensureBackupDirectory();

            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
                .map(async file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    return {
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                    };
                });

            return Promise.all(backupFiles);
        } catch (error) {
            this.logger.error(`Failed to list backups: ${error.message}`);
            return [];
        }
    }

    async deleteBackup(backupPath: string): Promise<boolean> {
        try {
            await fs.unlink(backupPath);
            this.logger.log(`Backup deleted: ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete backup: ${error.message}`);
            return false;
        }
    }

    async cleanupOldBackups(keepDays: number = 30): Promise<number> {
        try {
            const backups = await this.listBackups();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - keepDays);

            const oldBackups = backups.filter(backup => backup.created < cutoffDate);
            let deletedCount = 0;

            for (const backup of oldBackups) {
                if (await this.deleteBackup(backup.path)) {
                    deletedCount++;
                }
            }

            this.logger.log(`Cleaned up ${deletedCount} old backups`);
            return deletedCount;
        } catch (error) {
            this.logger.error(`Failed to cleanup old backups: ${error.message}`);
            return 0;
        }
    }

    async getBackupInfo(backupPath: string): Promise<{
        exists: boolean;
        size?: number;
        created?: Date;
        modified?: Date;
    }> {
        try {
            const stats = await fs.stat(backupPath);
            return {
                exists: true,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
            };
        } catch (error) {
            return { exists: false };
        }
    }

    private async ensureBackupDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create backup directory: ${error.message}`);
        }
    }

    private generateBackupFilename(timestamp: Date, options: BackupOptions): string {
        const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const suffix = options.compression ? '.sql.gz' : '.sql';
        return `backup_${dateStr}${suffix}`;
    }

    private buildPgDumpCommand(backupPath: string, options: BackupOptions): string {
        const {
            host = 'localhost',
            port = 5432,
            username,
            password,
            database,
        } = this.dbConfig;

        let command = `pg_dump`;

        // Connection parameters
        command += ` -h ${host}`;
        command += ` -p ${port}`;
        command += ` -U ${username}`;
        command += ` -d ${database}`;

        // Options
        if (options.includeSchema !== false) {
            command += ` --schema-only`;
        }
        if (options.includeData !== false) {
            command += ` --data-only`;
        }
        if (options.compression) {
            command += ` | gzip > ${backupPath}`;
        } else {
            command += ` -f ${backupPath}`;
        }

        // Table filtering
        if (options.tables && options.tables.length > 0) {
            options.tables.forEach(table => {
                command += ` -t ${table}`;
            });
        }

        if (options.excludeTables && options.excludeTables.length > 0) {
            options.excludeTables.forEach(table => {
                command += ` -T ${table}`;
            });
        }

        // Set password via environment variable
        if (password) {
            command = `PGPASSWORD="${password}" ${command}`;
        }

        return command;
    }

    private buildPsqlCommand(options: RestoreOptions): string {
        const {
            host = 'localhost',
            port = 5432,
            username,
            password,
            database,
        } = this.dbConfig;

        let command = `psql`;

        // Connection parameters
        command += ` -h ${host}`;
        command += ` -p ${port}`;
        command += ` -U ${username}`;
        command += ` -d ${database}`;

        // Options
        if (options.dropExisting) {
            command += ` --set ON_ERROR_STOP=1`;
        }

        // Input file
        if (options.backupPath.endsWith('.gz')) {
            command = `gunzip -c ${options.backupPath} | ${command}`;
        } else {
            command += ` -f ${options.backupPath}`;
        }

        // Set password via environment variable
        if (password) {
            command = `PGPASSWORD="${password}" ${command}`;
        }

        return command;
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}