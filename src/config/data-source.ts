import { DataSource } from 'typeorm';
import { getMigrationConfig } from './database.config';

export default new DataSource(getMigrationConfig());
