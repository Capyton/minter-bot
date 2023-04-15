import {
  BaseEntity,
  Column,
  DataSource,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DatabaseConfig } from '@/types';

export const getDataSource = (config: DatabaseConfig): DataSource => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database: config.database,
    synchronize: true,
    logging: true,
    subscribers: [],
    migrations: [],
    entities: [User],
  });

  return dataSource;
};

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;
}
