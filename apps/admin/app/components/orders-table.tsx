import Link from 'next/link';

import { AdminOrderSnapshot } from '../lib/backoffice';
import {
  AdminDictionary,
  AdminLocale,
  translateDeliveryStatus,
  translateOrderStatus,
  translatePaymentMethod,
  translateServiceType,
} from '../lib/admin-i18n';
import {
  formatDate,
  formatMoney,
  orderTone,
  routeLabel,
} from '../lib/backoffice-view';
import { StatusPill } from './status-pill';

type OrdersTableProps = {
  orders: AdminOrderSnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  emptyMessage?: string;
};

export function OrdersTable({
  orders,
  locale,
  dictionary,
  emptyMessage,
}: OrdersTableProps) {
  if (orders.length === 0) {
    return <p className="empty-state">{emptyMessage ?? dictionary.table.emptyOrders}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{dictionary.table.id}</th>
            <th>{dictionary.table.service}</th>
            <th>{dictionary.table.route}</th>
            <th>{dictionary.table.status}</th>
            <th>{dictionary.table.payment}</th>
            <th>{dictionary.table.amount}</th>
            <th>{dictionary.table.createdAt}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link href={`/orders/${order.id}?lang=${locale}`} className="table-link">
                  {order.id}
                </Link>
              </td>
              <td>{translateServiceType(order.serviceType, dictionary)}</td>
              <td>{routeLabel(order) || dictionary.table.routePending}</td>
              <td>
                <div className="status-stack">
                  <StatusPill tone={orderTone(order.status)}>
                    {translateOrderStatus(order.status, dictionary)}
                  </StatusPill>
                  {order.deliveryStatus ? (
                    <small>
                      {translateDeliveryStatus(order.deliveryStatus, dictionary)}
                    </small>
                  ) : null}
                </div>
              </td>
              <td>{translatePaymentMethod(order.paymentMethod, dictionary)}</td>
              <td>
                {formatMoney(
                  order.finalPrice ?? order.estimatedPrice ?? 0,
                  order.currency,
                  locale,
                )}
              </td>
              <td>{formatDate(order.createdAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
