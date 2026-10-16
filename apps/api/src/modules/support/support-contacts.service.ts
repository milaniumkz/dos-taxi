import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminActivityLogEntity } from "../admin/entities/admin-activity-log.entity";
import { UserEntity } from "../users/entities/user.entity";
import { SupportContactsDto } from "./dto/support-contacts.dto";
import {
  SUPPORT_CONTACTS_ID,
  SupportContactsEntity,
} from "./entities/support-contacts.entity";

@Injectable()
export class SupportContactsService {
  constructor(
    @InjectRepository(SupportContactsEntity)
    private readonly repository: Repository<SupportContactsEntity>,
  ) {}

  async get(): Promise<SupportContactsDto> {
    const contacts = await this.repository.findOneBy({
      id: SUPPORT_CONTACTS_ID,
    });
    return {
      phone: contacts?.phone ?? "",
      whatsapp: contacts?.whatsapp ?? "",
      email: contacts?.email ?? "",
      telegram: contacts?.telegram ?? "",
    };
  }

  async update(
    actorId: string,
    dto: SupportContactsDto,
  ): Promise<SupportContactsDto> {
    const contacts = {
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      email: dto.email,
      telegram: dto.telegram,
    };
    await this.repository.manager.transaction(async (manager) => {
      await manager.upsert(
        SupportContactsEntity,
        { id: SUPPORT_CONTACTS_ID, ...contacts },
        ["id"],
      );
      const actor = await manager.findOneBy(UserEntity, { id: actorId });
      await manager.save(AdminActivityLogEntity, {
        actorId: actor?.id ?? null,
        action: "support.contacts.updated",
        entityType: "settings",
        entityId: SUPPORT_CONTACTS_ID,
        metadata: contacts,
      });
    });
    return contacts;
  }
}
