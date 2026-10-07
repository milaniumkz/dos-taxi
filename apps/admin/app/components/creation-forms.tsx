"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { CitySnapshot, TariffSnapshot } from "../lib/backoffice";
import type { CreationLabels } from "../lib/creation-i18n";
import { findAddresses, saveOrder, saveTariff } from "../lib/creation-actions";

type Props = {
  cities: CitySnapshot[];
  tariffs: TariffSnapshot[];
  labels: CreationLabels;
  locale: "ru" | "kk";
  initialCityId: string;
  canSave: boolean;
  requestKey?: string;
};
const classes = ["economy", "comfort", "comfort_plus", "business", "together", "child"] as const;

function usePreservedForm() {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    // Prevent the native reset before it clears uncontrolled fields. React
    // also requests a reset when a server action returns a validation error.
    const preserve = (event: Event) => event.preventDefault();
    form.addEventListener("reset", preserve);
    return () => form.removeEventListener("reset", preserve);
  }, []);
  return ref;
}

function CitySelect({
  cities,
  labels,
  locale,
  value,
  onChange,
}: {
  cities: CitySnapshot[];
  labels: CreationLabels;
  locale: "ru" | "kk";
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="field">
      <span>{labels.city}</span>
      <select
        name="cityId"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{labels.chooseCity}</option>
        {cities
          .filter((c) => c.isActive)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {locale === "kk" ? c.nameKk : c.nameRu}
            </option>
          ))}
      </select>
    </label>
  );
}
function ServiceSelect({
  labels,
  value,
  onChange,
}: {
  labels: CreationLabels;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{labels.service}</span>
      <select
        name="serviceType"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {(["taxi", "delivery", "intercity"] as const).map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
export function TariffCreationForm({
  cities,
  tariffs,
  labels,
  locale,
  initialCityId,
  canSave,
  requestKey,
}: Props) {
  const formRef = usePreservedForm();
  const [cityId, setCity] = useState(initialCityId);
  const [service, setService] = useState("taxi");
  const [vehicle, setVehicle] = useState("economy");
  const [state, action, pending] = useActionState(saveTariff, { error: "" });
  const city = cities.find((c) => c.id === cityId);
  const template = tariffs
    .filter(
      (t) =>
        t.cityId === cityId &&
        t.serviceType === service &&
        (service !== "taxi" || t.vehicleClass === vehicle) &&
        t.isActive,
    )
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
  return (
    <form
      ref={formRef}
      action={action}
      onReset={(event) => event.preventDefault()}
      className="admin-form creation-form"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="currency" value={city?.currency ?? ""} />
      <fieldset disabled={pending}>
        <legend>
          {labels.city} · {labels.service}
        </legend>
        <div className="admin-form__grid">
          <CitySelect
            {...{ cities, labels, locale }}
            value={cityId}
            onChange={setCity}
          />
          <ServiceSelect
            labels={labels}
            value={service}
            onChange={setService}
          />
          {service === "taxi" ? (
            <label className="field">
              <span>{labels.class}</span>
              <select
                name="vehicleClass"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {labels[c]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </fieldset>
      <fieldset key={`${cityId}:${service}:${vehicle}`} disabled={pending}>
        <legend>
          {labels.rates} {city?.currency}
        </legend>
        <div className="admin-form__grid">
          <label className="field">
            <span>{labels.nameRu}</span>
            <input
              name="nameRu"
              maxLength={100}
              required
              defaultValue={template?.nameRu}
            />
          </label>
          <label className="field">
            <span>{labels.nameKk}</span>
            <input
              name="nameKk"
              maxLength={100}
              required
              defaultValue={template?.nameKk}
            />
          </label>
          {(
            [
              "basePrice",
              "pricePerKm",
              "pricePerMinute",
              "minimumPrice",
            ] as const
          ).map((key) => (
            <label className="field" key={key}>
              <span>
                {labels[key]} {city?.currency}
              </span>
              <input
                name={key}
                type="number"
                min="0"
                step="0.01"
                max="99999999.99"
                required
                defaultValue={template?.[key]}
              />
            </label>
          ))}
        </div>
        <details className="creation-extra">
          <summary>{labels.extra}</summary>
          <div className="admin-form__grid">
            <label className="field">
              <span>{labels.freeWaitingMinutes}</span>
              <input
                name="freeWaitingMinutes"
                type="number"
                min="0"
                step="0.1"
                defaultValue={template ? template.freeWaitingSeconds / 60 : 0}
                required
              />
            </label>
            {(
              [
                "paidWaitingPerMinute",
                "commissionPercent",
                "commissionFixed",
              ] as const
            ).map((key) => (
              <label className="field" key={key}>
                <span>{labels[key]}</span>
                <input
                  name={key}
                  type="number"
                  min="0"
                  max={key === "commissionPercent" ? 100 : 99999999.99}
                  step="0.01"
                  defaultValue={template?.[key] ?? 0}
                  required
                />
              </label>
            ))}
          </div>
        </details>
      </fieldset>
      <aside className="creation-summary">
        <strong>{labels.summary}</strong>
        <p>
          {city
            ? locale === "kk"
              ? city.nameKk
              : city.nameRu
            : labels.chooseCity}{" "}
          · {labels[service as "taxi"]} · {city?.currency}
        </p>
        <p>{labels.replace}</p>
        <label className="field--checkbox">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked
            disabled={pending}
          />
          {labels.active}
        </label>
      </aside>
      {state.error ? (
        <p role="alert" className="creation-error">
          {state.error}
        </p>
      ) : null}
      {!canSave ? <p className="creation-error">{labels.demo}</p> : null}
      <button
        className="action-button"
        type="submit"
        disabled={!city || !canSave || pending}
      >
        {pending ? labels.saving : labels.newTariff}
      </button>
    </form>
  );
}

function AddressField({
  name,
  label,
  labels,
  cityId,
}: {
  name: string;
  label: string;
  labels: CreationLabels;
  cityId: string;
}) {
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [choices, setChoices] = useState<
    Array<{ title: string; subtitle: string; lat: number; lng: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  async function search() {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await findAddresses(address, cityId);
      if (current === generation.current) {
        setChoices(result);
        if (!result.length) setError(labels.noAddresses);
      }
    } catch {
      if (current === generation.current) setError(labels.noAddresses);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  return (
    <div className="creation-address">
      <label className="field">
        <span>{label}</span>
        <input
          name={name}
          value={address}
          maxLength={500}
          required
          onChange={(e) => {
            generation.current++;
            setLoading(false);
            setAddress(e.target.value);
            setLat("");
            setLng("");
            setChoices([]);
            setError("");
          }}
        />
      </label>
      <button
        type="button"
        className="action-button action-button--soft"
        disabled={address.trim().length < 3 || loading || !cityId}
        onClick={search}
      >
        {loading ? labels.searching : labels.search}
      </button>
      {choices.length ? (
        <ul aria-label={labels.chooseAddress} className="creation-choices">
          {choices.map((point, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  generation.current++;
                  setAddress(
                    `${point.title}${point.subtitle ? `, ${point.subtitle}` : ""}`,
                  );
                  setLat(String(point.lat));
                  setLng(String(point.lng));
                  setChoices([]);
                  setError("");
                }}
              >
                {point.title}
                <small>{point.subtitle}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="status">{error}</p> : null}
      <details className="creation-extra" open={Boolean(error)}>
        <summary>
          {labels.coordinates}
          {lat && lng ? " ✓" : ""}
        </summary>
        <div className="admin-form__grid">
          <label className="field">
            <span>{labels.lat}</span>
            <input
              name={`${name}Lat`}
              type="number"
              min="-90"
              max="90"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{labels.lng}</span>
            <input
              name={`${name}Lng`}
              type="number"
              min="-180"
              max="180"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </label>
        </div>
      </details>
    </div>
  );
}
export function OrderCreationForm({
  cities,
  tariffs,
  labels,
  locale,
  initialCityId,
  canSave,
  requestKey,
}: Props) {
  const formRef = usePreservedForm();
  const [cityId, setCity] = useState(initialCityId);
  const [service, setService] = useState("taxi");
  const [vehicle, setVehicle] = useState("economy");
  const [state, action, pending] = useActionState(saveOrder, { error: "" });
  const available = tariffs.filter(
    (t) =>
      t.cityId === cityId &&
      t.serviceType === service &&
      t.isActive &&
      new Date(t.validFrom) <= new Date() &&
      (!t.validTo || new Date(t.validTo) > new Date()),
  );
  const selected = available.find(
    (t) => service !== "taxi" || t.vehicleClass === vehicle,
  );
  return (
    <form
      ref={formRef}
      action={action}
      onReset={(event) => event.preventDefault()}
      className="admin-form creation-form"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <fieldset disabled={pending}>
        <legend>{labels.client}</legend>
        <div className="admin-form__grid">
          <label className="field">
            <span>{labels.phone}</span>
            <input
              name="clientPhone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={22}
              aria-describedby="phone-hint"
            />
            <small id="phone-hint">{labels.phoneHint}</small>
          </label>
          <label className="field">
            <span>{labels.clientName}</span>
            <input name="clientName" maxLength={100} />
          </label>
          <CitySelect
            {...{ cities, labels, locale }}
            value={cityId}
            onChange={setCity}
          />
        </div>
      </fieldset>
      <fieldset disabled={pending}>
        <legend>{labels.service}</legend>
        <div className="admin-form__grid">
          <ServiceSelect
            labels={labels}
            value={service}
            onChange={setService}
          />
          {service === "taxi" ? (
            <label className="field">
              <span>{labels.selectTariff}</span>
              <select
                name="carClass"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                {classes.map((c) => (
                  <option
                    key={c}
                    value={c}
                    disabled={!available.some((t) => t.vehicleClass === c)}
                  >
                    {labels[c]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {service === "delivery" ? (
            <>
              <label className="field">
                <span>{labels.courier}</span>
                <select name="courierVehicleType">
                  {(["car", "bicycle", "moped", "scooter"] as const).map(
                    (c) => (
                      <option key={c} value={c}>
                        {labels[c]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="field">
                <span>{labels.package}</span>
                <input name="packageDescription" required maxLength={1000} />
              </label>
              <label className="field">
                <span>{labels.recipient}</span>
                <input name="recipientPhone" type="tel" required />
              </label>
            </>
          ) : null}
        </div>
        {cityId && !selected ? (
          <p className="creation-error">
            {labels.noTariff}{" "}
            <a href={`/tariffs/new?cityId=${cityId}&lang=${locale}`}>
              {labels.newTariff}
            </a>
          </p>
        ) : null}
      </fieldset>
      <fieldset disabled={pending} key={cityId}>
        <legend>{labels.route}</legend>
        <div className="creation-route">
          <AddressField
            name="pickup"
            label={labels.pickup}
            {...{ labels, cityId }}
          />
          <AddressField
            name="destination"
            label={labels.destination}
            {...{ labels, cityId }}
          />
        </div>
        <label className="field">
          <span>{labels.notes}</span>
          <textarea
            name="notes"
            maxLength={1000}
            placeholder={labels.noteHint}
          />
        </label>
      </fieldset>
      <aside className="creation-summary">
        <strong>{labels.summary}</strong>
        <label className="field">
          <span>{labels.payment}</span>
          <select name="paymentMethod" defaultValue="cash" disabled={pending}>
            <option value="cash">{labels.cash}</option>
            <option value="transfer_kaspi">Kaspi</option>
            <option value="transfer_halyk">Halyk</option>
          </select>
        </label>
        <p>{labels.prices}</p>
        <p>{labels.dispatchHint}</p>
      </aside>
      {state.error ? (
        <p role="alert" className="creation-error">
          {state.error}
        </p>
      ) : null}
      {!canSave ? <p className="creation-error">{labels.demo}</p> : null}
      <button
        type="submit"
        disabled={pending || !cityId || !selected || !canSave}
        className="action-button"
      >
        {pending ? labels.saving : labels.createAndDispatch}
      </button>
    </form>
  );
}
