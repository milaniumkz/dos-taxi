import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AdminNoteEntity } from "../admin/entities/admin-note.entity";
import { AuthModule } from "../auth/auth.module";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { UserEntity } from "../users/entities/user.entity";

import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AdminNoteEntity, ExecutorEntity, UserEntity]),
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
