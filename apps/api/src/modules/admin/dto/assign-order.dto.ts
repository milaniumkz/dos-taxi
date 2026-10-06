import { IsUUID } from "class-validator";

export class AssignOrderDto {
  @IsUUID()
  executorId!: string;
}
