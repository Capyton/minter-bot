import { DataSource, QueryRunner } from 'typeorm';
import { NextFunction } from 'grammy';
import { Context } from '@/types';

export class DatabaseWorker {
  constructor(private readonly queryRunner: QueryRunner) {}

  async commit(): Promise<void> {
    await this.queryRunner.commitTransaction();
    await this.queryRunner.startTransaction();
  }

  async rollback(): Promise<void> {
    await this.queryRunner.rollbackTransaction();
  }
}

export class DatabaseMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Get a `QueryRunner` from the `DataSource` and start a transaction
   * @returns A `QueryRunner` that is connected to the database and has a transaction started
   */
  async getQueryRunner(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    return queryRunner;
  }

  async handle(ctx: Context, next: NextFunction) {
    const queryRunner = await this.getQueryRunner();

    ctx.queryRunner = queryRunner;
    ctx.dbWorker = new DatabaseWorker(queryRunner);

    await next().finally(() => {
      console.log('Release transaction');

      queryRunner
        .release()
        .catch((err) =>
          console.error(`Failed to release the QueryRunner: ${err}`)
        );
    });
  }
}
