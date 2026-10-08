import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import {
  AdminErrorMessagesController,
  PublicErrorMessagesController,
} from "./error-messages.controller";
import { ErrorMessagesService } from "./error-messages.service";
@Module({
  imports: [AuthModule],
  controllers: [AdminErrorMessagesController, PublicErrorMessagesController],
  providers: [ErrorMessagesService],
  exports: [ErrorMessagesService],
})
export class ErrorMessagesModule {}
