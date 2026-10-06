"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminLocale, getAdminDictionary } from "./admin-i18n";
import { adminApiRequest } from "./admin-api";
import { formatAdminApiError } from "./admin-http";

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = getString(formData, key);
  return value ? value : null;
}

function getNumber(formData: FormData, key: string): number {
  return Number(getString(formData, key) || 0);
}

function getOptionalNumber(formData: FormData, key: string): number | null {
  const value = getOptionalString(formData, key);
  return value === null ? null : Number(value);
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || getString(formData, key) === "true";
}

function getLocale(formData: FormData): AdminLocale {
  return getString(formData, "locale") === "kk" ? "kk" : "ru";
}

function withOptionalString(
  payload: Record<string, unknown>,
  key: string,
  value: string | null,
): Record<string, unknown> {
  if (value) {
    payload[key] = value;
  }
  return payload;
}

function normalizeReturnPath(value: string): string {
  return value || "/";
}

function revalidateReturnPath(returnPath: string): void {
  const [pathname] = normalizeReturnPath(returnPath).split("?");
  revalidatePath(pathname || "/");
}

function redirectWithFlash(
  returnPath: string,
  kind: "notice" | "error",
  message: string,
): never {
  const url = new URL(normalizeReturnPath(returnPath), "http://localhost");
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}${url.search}`);
}

function successMessage(
  locale: AdminLocale,
  key:
    | "cityCreated"
    | "cityUpdated"
    | "tariffCreated"
    | "tariffUpdated"
    | "promoCreated"
    | "promoUpdated"
    | "orderAssigned"
    | "dispatchRestarted"
    | "orderStatusUpdated"
    | "paymentCancelled"
    | "paymentRefunded"
    | "userUpdated"
    | "executorVerified"
    | "executorBlocked"
    | "executorBalanceTopUpUpdated"
    | "executorPayoutCreated"
    | "executorPayoutUpdated"
    | "dispatchSettingsUpdated"
    | "driverBonusSettingsUpdated"
    | "noteCreated"
    | "noteUpdated",
): string {
  const dictionary = getAdminDictionary(locale);
  return dictionary.feedback[key];
}

function failureMessage(locale: AdminLocale, error: unknown): string {
  const dictionary = getAdminDictionary(locale);
  const detail = formatAdminApiError(error);
  return dictionary.feedback.actionFailed(detail);
}

export async function createCityAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/cities", {
      method: "POST",
      body: JSON.stringify({
        nameRu: getString(formData, "nameRu"),
        nameKk: getString(formData, "nameKk"),
        countryCode: getString(formData, "countryCode"),
        currency: getString(formData, "currency"),
        timezone: getString(formData, "timezone"),
        isActive: getBoolean(formData, "isActive"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "cityCreated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function toggleCityActiveAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const cityId = getString(formData, "cityId");

  try {
    await adminApiRequest(`admin/cities/${cityId}`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: getString(formData, "isActive") === "true",
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "cityUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateCityAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const cityId = getString(formData, "cityId");

  try {
    await adminApiRequest(`admin/cities/${cityId}`, {
      method: "PATCH",
      body: JSON.stringify({
        nameRu: getString(formData, "nameRu"),
        nameKk: getString(formData, "nameKk"),
        countryCode: getString(formData, "countryCode"),
        currency: getString(formData, "currency"),
        timezone: getString(formData, "timezone"),
        isActive: getBoolean(formData, "isActive"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "cityUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function createTariffAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/tariffs", {
      method: "POST",
      body: JSON.stringify({
        cityId: getString(formData, "cityId"),
        serviceType: getString(formData, "serviceType"),
        vehicleClass: getOptionalString(formData, "vehicleClass"),
        nameRu: getString(formData, "nameRu"),
        nameKk: getString(formData, "nameKk"),
        basePrice: getNumber(formData, "basePrice"),
        pricePerKm: getNumber(formData, "pricePerKm"),
        pricePerMinute: getNumber(formData, "pricePerMinute"),
        minimumPrice: getNumber(formData, "minimumPrice"),
        freeWaitingSeconds: getNumber(formData, "freeWaitingSeconds"),
        paidWaitingPerMinute: getNumber(formData, "paidWaitingPerMinute"),
        commissionPercent: getNumber(formData, "commissionPercent"),
        commissionFixed: getNumber(formData, "commissionFixed"),
        currency: getString(formData, "currency"),
        validFrom: getOptionalString(formData, "validFrom"),
        validTo: getOptionalString(formData, "validTo"),
        isActive: getBoolean(formData, "isActive"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "tariffCreated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function toggleTariffActiveAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const tariffId = getString(formData, "tariffId");

  try {
    await adminApiRequest(`admin/tariffs/${tariffId}`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: getString(formData, "isActive") === "true",
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "tariffUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateTariffAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const tariffId = getString(formData, "tariffId");
  const payload: Record<string, unknown> = {};

  const stringFields = ["currency"] as const;
  for (const field of stringFields) {
    const value = getString(formData, field);
    const originalValue = getString(
      formData,
      `original${field[0].toUpperCase()}${field.slice(1)}`,
    );
    if (value !== originalValue) {
      payload[field] = value;
    }
  }

  const numberFields = [
    "basePrice",
    "pricePerKm",
    "pricePerMinute",
    "minimumPrice",
    "freeWaitingSeconds",
    "paidWaitingPerMinute",
    "commissionPercent",
    "commissionFixed",
  ] as const;
  for (const field of numberFields) {
    const value = getNumber(formData, field);
    const originalValue = Number(
      getString(formData, `original${field[0].toUpperCase()}${field.slice(1)}`),
    );
    if (value !== originalValue) {
      payload[field] = value;
    }
  }

  try {
    await adminApiRequest(`admin/tariffs/${tariffId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "tariffUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function createPromoCodeAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/promo-codes", {
      method: "POST",
      body: JSON.stringify({
        code: getString(formData, "code"),
        discountType: getString(formData, "discountType"),
        discountValue: getNumber(formData, "discountValue"),
        maxUses: getOptionalString(formData, "maxUses")
          ? getNumber(formData, "maxUses")
          : null,
        validTo: getOptionalString(formData, "validTo"),
        isActive: getBoolean(formData, "isActive"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "promoCreated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function togglePromoCodeActiveAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const promoCodeId = getString(formData, "promoCodeId");

  try {
    await adminApiRequest(`admin/promo-codes/${promoCodeId}`, {
      method: "PATCH",
      body: JSON.stringify({
        isActive: getString(formData, "isActive") === "true",
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "promoUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updatePromoCodeAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const promoCodeId = getString(formData, "promoCodeId");

  try {
    await adminApiRequest(`admin/promo-codes/${promoCodeId}`, {
      method: "PATCH",
      body: JSON.stringify({
        code: getString(formData, "code"),
        discountType: getString(formData, "discountType"),
        discountValue: getNumber(formData, "discountValue"),
        maxUses: getOptionalNumber(formData, "maxUses"),
        validTo: getOptionalString(formData, "validTo"),
        isActive: getBoolean(formData, "isActive"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "promoUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function assignOrderAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const orderId = getString(formData, "orderId");

  try {
    await adminApiRequest(`admin/orders/${orderId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({
        executorId: getString(formData, "executorId"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "orderAssigned"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function restartOrderDispatchAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const orderId = getString(formData, "orderId");

  try {
    await adminApiRequest(`admin/orders/${orderId}/dispatch/retry`, {
      method: "POST",
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "dispatchRestarted"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateOrderStatusAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const orderId = getString(formData, "orderId");

  try {
    await adminApiRequest(`admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: getString(formData, "status"),
        reason: getOptionalString(formData, "reason") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "orderStatusUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function refundPaymentAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const paymentId = getString(formData, "paymentId");
  const rawRefundAmount = getOptionalString(formData, "amount");

  try {
    await adminApiRequest(`admin/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify({
        amount: rawRefundAmount ? Number(rawRefundAmount) : undefined,
        reason: getOptionalString(formData, "reason") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "paymentRefunded"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function cancelPaymentAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const paymentId = getString(formData, "paymentId");

  try {
    await adminApiRequest(`admin/payments/${paymentId}/cancel`, {
      method: "POST",
      body: JSON.stringify({
        reason: getOptionalString(formData, "reason") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "paymentCancelled"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateUserAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const userId = getString(formData, "userId");
  const payload: Record<string, unknown> = {};

  const preferredLanguage = getOptionalString(formData, "preferredLanguage");
  const preferredCurrency = getOptionalString(formData, "preferredCurrency");
  const blockedValue = getOptionalString(formData, "isBlocked");

  if (preferredLanguage) {
    payload.preferredLanguage = preferredLanguage;
  }
  if (preferredCurrency) {
    payload.preferredCurrency = preferredCurrency;
  }
  if (blockedValue) {
    payload.isBlocked = blockedValue === "true";
  }

  withOptionalString(payload, "name", getOptionalString(formData, "name"));

  try {
    await adminApiRequest(`admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "userUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function createAdminNoteAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/notes", {
      method: "POST",
      body: JSON.stringify({
        entityType: getString(formData, "entityType"),
        entityId: getString(formData, "entityId"),
        body: getString(formData, "body"),
        kind: getOptionalString(formData, "kind") ?? "context",
        isPinned: getBoolean(formData, "isPinned"),
        assignedToId: getOptionalString(formData, "assignedToId"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "noteCreated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateAdminNoteAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const noteId = getString(formData, "noteId");

  try {
    await adminApiRequest(`admin/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify({
        kind: getOptionalString(formData, "kind"),
        state: getOptionalString(formData, "state"),
        isPinned: getBoolean(formData, "isPinned"),
        assignedToId: getOptionalString(formData, "assignedToId"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "noteUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function verifyExecutorAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const executorId = getString(formData, "executorId");

  try {
    await adminApiRequest(`admin/executors/${executorId}/verify`, {
      method: "POST",
      body: JSON.stringify({
        verificationStatus:
          getString(formData, "verificationStatus") || "verified",
        carClass: getOptionalString(formData, "carClass") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "executorVerified"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateDispatchSettingsAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/settings/dispatch", {
      method: "PATCH",
      body: JSON.stringify({
        maxRadiusKm: getNumber(formData, "maxRadiusKm"),
        distanceWeight: getNumber(formData, "distanceWeight"),
        ratingWeight: getNumber(formData, "ratingWeight"),
        activityWeight: getNumber(formData, "activityWeight"),
        priorityWeight: getNumber(formData, "priorityWeight"),
        maxCandidates: getNumber(formData, "maxCandidates"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "dispatchSettingsUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateDriverBonusSettingsAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/settings/driver-bonus", {
      method: "PATCH",
      body: JSON.stringify({
        isEnabled: getBoolean(formData, "isEnabled"),
        ordersRequired: getNumber(formData, "ordersRequired"),
        bonusAmount: getNumber(formData, "bonusAmount"),
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "driverBonusSettingsUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function blockExecutorAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const executorId = getString(formData, "executorId");

  try {
    await adminApiRequest(`admin/executors/${executorId}/block`, {
      method: "POST",
      body: JSON.stringify({
        isBlocked: getString(formData, "isBlocked") === "true",
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "executorBlocked"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateExecutorBalanceTopUpAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const topUpId = getString(formData, "topUpId");

  try {
    await adminApiRequest(`admin/executor-balance-topups/${topUpId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: getString(formData, "status"),
        amount: getOptionalNumber(formData, "amount") ?? undefined,
        adminComment: getOptionalString(formData, "adminComment") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "executorBalanceTopUpUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function createExecutorPayoutAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));

  try {
    await adminApiRequest("admin/executor-payouts", {
      method: "POST",
      body: JSON.stringify({
        executorId: getString(formData, "executorId"),
        amount: getNumber(formData, "amount"),
        method: getString(formData, "method"),
        adminComment: getOptionalString(formData, "adminComment") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "executorPayoutCreated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}

export async function updateExecutorPayoutAction(formData: FormData) {
  const locale = getLocale(formData);
  const returnPath = normalizeReturnPath(getString(formData, "returnPath"));
  const payoutId = getString(formData, "payoutId");

  try {
    await adminApiRequest(`admin/executor-payouts/${payoutId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: getString(formData, "status"),
        amount: getOptionalNumber(formData, "amount") ?? undefined,
        method: getOptionalString(formData, "method") ?? undefined,
        adminComment: getOptionalString(formData, "adminComment") ?? undefined,
      }),
    });
    revalidateReturnPath(returnPath);
    redirectWithFlash(
      returnPath,
      "notice",
      successMessage(locale, "executorPayoutUpdated"),
    );
  } catch (error) {
    redirectWithFlash(returnPath, "error", failureMessage(locale, error));
  }
}
