"use client";
import { useFormStatus } from "react-dom";
import { deleteTariffAction } from "../lib/admin-actions";
import { AdminLocale, getAdminDictionary } from "../lib/admin-i18n";
import { TariffSnapshot } from "../lib/backoffice";
function Submit({ locale }: { locale: AdminLocale }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="action-button action-button--soft"
      disabled={pending}
    >
      {pending
        ? getAdminDictionary(locale).tariffDeletion.removing
        : getAdminDictionary(locale).tariffDeletion.remove}
    </button>
  );
}
export function DeleteTariffButton({
  tariff,
  locale,
  returnPath,
}: {
  tariff: TariffSnapshot;
  locale: AdminLocale;
  returnPath: string;
}) {
  const name = locale === "kk" ? tariff.nameKk : tariff.nameRu;
  const message = getAdminDictionary(locale).tariffDeletion.confirm(name);
  return (
    <form
      action={deleteTariffAction}
      className="inline-form"
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="tariffId" value={tariff.id} />
      <Submit locale={locale} />
    </form>
  );
}
