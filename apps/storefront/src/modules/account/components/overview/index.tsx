import { Container } from "@lib/ui-compat";

import ChevronDown from "@modules/common/icons/chevron-down";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import { convertToLocale } from "@lib/util/money";
import { HttpTypes } from "@medusajs/types";

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null;
  orders: HttpTypes.StoreOrder[] | null;
};

const orderDateFormatter = new Intl.DateTimeFormat("ro-MD", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const Overview = ({ customer, orders }: OverviewProps) => {
  return (
    <div data-testid="overview-page-wrapper">
      <div className="hidden small:block">
        <div className="text-xl-semi mb-4 flex items-center justify-between">
          <span data-testid="welcome-message" data-value={customer?.first_name}>
            Salut, {customer?.first_name}
          </span>
          <span className="text-small-regular text-ui-fg-base">
            Autentificat ca:{" "}
            <span
              className="font-semibold"
              data-testid="customer-email"
              data-value={customer?.email}
            >
              {customer?.email}
            </span>
          </span>
        </div>
        <div className="flex flex-col border-t border-gray-200 py-8">
          <div className="col-span-1 row-span-2 flex h-full flex-1 flex-col gap-y-4">
            <div className="mb-6 flex items-start gap-x-16">
              <div className="flex flex-col gap-y-4">
                <h3 className="text-large-semi">Profil</h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="text-3xl-semi leading-none"
                    data-testid="customer-profile-completion"
                    data-value={getProfileCompletion(customer)}
                  >
                    {getProfileCompletion(customer)}%
                  </span>
                  <span className="text-base-regular uppercase text-ui-fg-subtle">
                    Completat
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-y-4">
                <h3 className="text-large-semi">Adrese</h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="text-3xl-semi leading-none"
                    data-testid="addresses-count"
                    data-value={customer?.addresses?.length || 0}
                  >
                    {customer?.addresses?.length || 0}
                  </span>
                  <span className="text-base-regular uppercase text-ui-fg-subtle">
                    Salvate
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              <div className="flex items-center gap-x-2">
                <h3 className="text-large-semi">Comenzi recente</h3>
              </div>
              <ul
                className="flex flex-col gap-y-4"
                data-testid="orders-wrapper"
              >
                {orders && orders.length > 0 ? (
                  orders.slice(0, 5).map((order) => {
                    return (
                      <li
                        key={order.id}
                        data-testid="order-wrapper"
                        data-value={order.id}
                      >
                        <LocalizedClientLink
                          href={`/account/orders/details/${order.id}`}
                          aria-label={`Vezi comanda #${order.display_id}`}
                        >
                          <Container className="flex items-center justify-between bg-gray-50 p-4">
                            <div className="text-small-regular grid flex-1 grid-cols-3 grid-rows-2 gap-x-4">
                              <span className="font-semibold">
                                Dată plasare
                              </span>
                              <span className="font-semibold">
                                Număr comandă
                              </span>
                              <span className="font-semibold">Total</span>
                              <span data-testid="order-created-date">
                                {orderDateFormatter.format(
                                  new Date(order.created_at)
                                )}
                              </span>
                              <span
                                data-testid="order-id"
                                data-value={order.display_id}
                              >
                                #{order.display_id}
                              </span>
                              <span data-testid="order-amount">
                                {convertToLocale({
                                  amount: order.total,
                                  currency_code: order.currency_code,
                                })}
                              </span>
                            </div>
                            <span
                              aria-hidden="true"
                              className="flex items-center justify-between"
                              data-testid="open-order-button"
                            >
                              <ChevronDown className="-rotate-90" />
                            </span>
                          </Container>
                        </LocalizedClientLink>
                      </li>
                    );
                  })
                ) : (
                  <span data-testid="no-orders-message">
                    Nu ai comenzi recente
                  </span>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0;

  if (!customer) {
    return 0;
  }

  if (customer.email) {
    count++;
  }

  if (customer.first_name && customer.last_name) {
    count++;
  }

  if (customer.phone) {
    count++;
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  );

  if (billingAddress) {
    count++;
  }

  return (count / 4) * 100;
};

export default Overview;
