"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApiRequest } from "./admin-api";
import { getCreationLabels } from "./creation-i18n";
import { formatAdminApiError } from "./admin-http";

export type CreationState = { error: string };
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export async function saveTariff(
  _state: CreationState,
  form: FormData,
): Promise<CreationState> {
  const locale = text(form, "locale") === "kk" ? "kk" : "ru";
  let id: string;
  try {
    const payload: Record<string, unknown> = Object.fromEntries(
      [
        "cityId",
        "serviceType",
        "vehicleClass",
        "nameRu",
        "nameKk",
        "currency",
      ].map((key) => [key, text(form, key)]),
    );
    if (payload.serviceType !== "taxi") payload.vehicleClass = null;
    for (const key of [
      "basePrice",
      "pricePerKm",
      "pricePerMinute",
      "minimumPrice",
      "paidWaitingPerMinute",
      "commissionPercent",
      "commissionFixed",
    ]) {
      const value = text(form, key);
      if (
        !value ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        (key === "commissionPercent" && Number(value) > 100)
      )
        throw new Error(getCreationLabels(locale).required);
      payload[key] = Number(value);
    }
    payload.freeWaitingSeconds = Math.round(
      Number(text(form, "freeWaitingMinutes")) * 60,
    );
    if (
      !Number.isFinite(payload.freeWaitingSeconds) ||
      Number(payload.freeWaitingSeconds) < 0
    )
      throw new Error(getCreationLabels(locale).required);
    payload.isActive = form.get("isActive") === "on";
    const tariff = await adminApiRequest<{ id: string }>("admin/tariffs", {
      method: "POST",
      headers: { "X-Idempotency-Key": text(form, "requestKey") },
      body: JSON.stringify(payload),
    });
    id = tariff.id;
  } catch (error) {
    return {
      error: `${getCreationLabels(locale).failed} ${formatAdminApiError(error)}`,
    };
  }
  revalidatePath("/tariffs");
  revalidatePath("/cities");
  redirect(`/tariffs/${id}?lang=${locale}`);
}

export async function findAddresses(
  query: string,
  cityId: string,
): Promise<
  Array<{ title: string; subtitle: string; lat: number; lng: number }>
> {
  if (query.trim().length < 3 || query.length > 200) return [];
  return adminApiRequest(
    `geo/autocomplete?${new URLSearchParams({ q: query, cityId })}`,
  );
}

function phone(value: string): string {
  let digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length === 11 && digits.startsWith("8"))
    digits = `7${digits.slice(1)}`;
  if (!/^[1-9][0-9]{9,14}$/.test(digits)) throw new Error("PHONE_INVALID");
  return `+${digits}`;
}
export async function saveOrder(
  _state: CreationState,
  form: FormData,
): Promise<CreationState> {
  const locale = text(form, "locale") === "kk" ? "kk" : "ru";
  let id: string;
  try {
    const routePoints = ["pickup", "destination"].map((key, index) => {
      const lat = text(form, `${key}Lat`),
        lng = text(form, `${key}Lng`);
      if (
        !lat ||
        !lng ||
        !text(form, key) ||
        !Number.isFinite(Number(lat)) ||
        !Number.isFinite(Number(lng))
      )
        throw new Error(getCreationLabels(locale).required);
      return {
        sequenceIndex: index,
        lat: Number(lat),
        lng: Number(lng),
        address: text(form, key),
        notes: index === 0 ? text(form, "notes") : undefined,
        contactPhone:
          index === 0
            ? phone(text(form, "clientPhone"))
            : text(form, "recipientPhone")
              ? phone(text(form, "recipientPhone"))
              : undefined,
      };
    });
    const payload = {
      clientPhone: phone(text(form, "clientPhone")),
      clientName: text(form, "clientName") || undefined,
      cityId: text(form, "cityId"),
      serviceType: text(form, "serviceType"),
      carClass: text(form, "carClass") || undefined,
      paymentMethod: text(form, "paymentMethod") || "cash",
      routePoints,
      ...(text(form, "serviceType") === "delivery"
        ? {
            courierVehicleType: text(form, "courierVehicleType"),
            isFragile: false,
            requiresReturn: false,
            packageDescription: text(form, "packageDescription"),
          }
        : {}),
    };
    const order = await adminApiRequest<{ id: string }>("admin/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": text(form, "requestKey") },
      body: JSON.stringify(payload),
    });
    id = order.id;
  } catch (error) {
    return {
      error: `${getCreationLabels(locale).failed} ${formatAdminApiError(error)}`,
    };
  }
  revalidatePath("/orders");
  revalidatePath("/users");
  revalidatePath("/activity");
  redirect(`/orders/${id}?lang=${locale}`);
}
