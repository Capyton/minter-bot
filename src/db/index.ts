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
    synchronize: false,
    logging: true,
    subscribers: [],
    migrations: [],
    entities: [User, Template],
  });

  return dataSource;
};

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'bigint' })
  user_id: string;

  @Column({ nullable: true, type: 'varchar', default: null })
  username: string | null;
}

@Entity()
export class Template extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  collectionAddress: string;

  @Column({ type: 'varchar' })
  itemName: string;

  @Column({ type: 'varchar' })
  itemDescription: string;

  @Column({ type: 'varchar' })
  itemContentURL: string;

  @Column({ array: true, type: 'bigint' })
  userIds: string[];

  @Column('bool', { nullable: true })
  has_parameters: boolean;
}
