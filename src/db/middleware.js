"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseMiddleware = exports.DatabaseWorker = void 0;
class DatabaseWorker {
    constructor(queryRunner) {
        this.queryRunner = queryRunner;
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.queryRunner.commitTransaction();
            yield this.queryRunner.startTransaction();
        });
    }
    rollback() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.queryRunner.rollbackTransaction();
        });
    }
}
exports.DatabaseWorker = DatabaseWorker;
class DatabaseMiddleware {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Get a `QueryRunner` from the `DataSource` and start a transaction
     * @returns A `QueryRunner` that is connected to the database and has a transaction started
     */
    getQueryRunner() {
        return __awaiter(this, void 0, void 0, function* () {
            const queryRunner = this.dataSource.createQueryRunner();
            yield queryRunner.connect();
            yield queryRunner.startTransaction();
            return queryRunner;
        });
    }
    handle(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryRunner = yield this.getQueryRunner();
            ctx.queryRunner = queryRunner;
            ctx.dbWorker = new DatabaseWorker(queryRunner);
            yield next().finally(() => {
                console.log('Release transaction');
                queryRunner
                    .release()
                    .catch((err) => console.error(`Failed to release the QueryRunner: ${err}`));
            });
        });
    }
}
exports.DatabaseMiddleware = DatabaseMiddleware;
