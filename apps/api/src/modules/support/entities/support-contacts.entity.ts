import { Column, Entity, PrimaryColumn } from "typeorm";

export const SUPPORT_CONTACTS_ID = "00000000-0000-4000-8000-000000000099";

@Entity({ name: "support_contacts" })
export class SupportContactsEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32, default: "" })
  phone!: string;

  @Column({ type: "varchar", length: 32, default: "" })
  whatsapp!: string;

  @Column({ type: "varchar", length: 254, default: "" })
  email!: string;

  @Column({ type: "varchar", length: 200, default: "" })
  telegram!: string;
}
