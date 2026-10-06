import {
  FinancialSnapshot,
  OperationsSnapshot,
  OrderStatus,
  ServiceType,
} from '../lib/backoffice';
import {
  AdminDictionary,
  AdminLocale,
  translateOrderStatus,
  translateServiceType,
} from '../lib/admin-i18n';
import { formatMoney } from '../lib/backoffice-view';

type ReportsPanelProps = {
  financial: FinancialSnapshot;
  operations: OperationsSnapshot;
  locale: AdminLocale;
  dictionary: AdminDictionary;
};

export function ReportsPanel({
  financial,
  operations,
  locale,
  dictionary,
}: ReportsPanelProps) {
  const capturedKzt = financial.capturedAmountByCurrency.KZT ?? 0;
  const refundedKzt = financial.refundedAmountByCurrency.KZT ?? 0;

  return (
    <div className="report-grid">
      <div className="report-card">
        <h3>{dictionary.reportsPanel.paymentFlow}</h3>
        <ul className="number-list">
          <li>
            <span>{dictionary.reportsPanel.captured}</span>
            <strong>{formatMoney(capturedKzt, 'KZT', locale)}</strong>
          </li>
          <li>
            <span>{dictionary.reportsPanel.refunded}</span>
            <strong>{formatMoney(refundedKzt, 'KZT', locale)}</strong>
          </li>
          <li>
            <span>{dictionary.reportsPanel.paymentsCount}</span>
            <strong>{financial.paymentsCount}</strong>
          </li>
          <li>
            <span>{dictionary.reportsPanel.completedOrders}</span>
            <strong>{financial.completedOrdersCount}</strong>
          </li>
        </ul>
      </div>
      <div className="report-card">
        <h3>{dictionary.reportsPanel.serviceMix}</h3>
        <div className="bar-stack">
          {Object.entries(operations.ordersByServiceType).map(
            ([serviceType, count]) => (
              <div key={serviceType} className="bar-row">
                <span>
                  {translateServiceType(
                    serviceType as ServiceType,
                    dictionary,
                  )}
                </span>
                <div className="bar-row__track">
                  <div
                    className="bar-row__fill"
                    style={{
                      width: `${Math.max(
                        14,
                        (count / Math.max(operations.totalOrders, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ),
          )}
        </div>
      </div>
      <div className="report-card">
        <h3>{dictionary.reportsPanel.statusHeat}</h3>
        <div className="bar-stack">
          {Object.entries(operations.ordersByStatus).map(
            ([status, count]) => (
              <div key={status} className="bar-row">
                <span>
                  {translateOrderStatus(
                    status as OrderStatus,
                    dictionary,
                  )}
                </span>
                <div className="bar-row__track">
                  <div
                    className="bar-row__fill bar-row__fill--dark"
                    style={{
                      width: `${Math.max(
                        10,
                        (count / Math.max(operations.totalOrders, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
