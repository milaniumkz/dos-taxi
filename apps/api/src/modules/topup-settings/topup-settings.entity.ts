import { Column, Entity, PrimaryColumn } from "typeorm";

export const TOPUP_SETTINGS_ID = "00000000-0000-4000-8000-000000000100";
export const TOPUP_MODES = ["manual", "kaspi_link", "disabled"] as const;
export type TopUpMode = (typeof TOPUP_MODES)[number];

@Entity({ name: "driver_topup_settings" })
export class TopUpSettingsEntity {
  @PrimaryColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 20, default: "manual" }) mode!: TopUpMode;
  @Column({ name: "kaspi_url", type: "varchar", length: 2048, default: "" })
  kaspiUrl!: string;
}
