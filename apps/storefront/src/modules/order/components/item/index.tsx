import { HttpTypes } from "@medusajs/types";
import { Table, Text } from "@lib/ui-compat";

import LineItemOptions from "@modules/common/components/line-item-options";
import LineItemPrice from "@modules/common/components/line-item-price";
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price";
import Thumbnail from "@modules/products/components/thumbnail";

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem;
  currencyCode: string;
};

const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="w-24 p-4 pl-0!">
        <div className="flex w-16">
          <Thumbnail thumbnail={item.thumbnail} size="square" />
        </div>
      </Table.Cell>

      <Table.Cell className="min-w-0 text-left">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-name"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
      </Table.Cell>

      <Table.Cell className="w-48 min-w-48 pr-0! text-right whitespace-nowrap">
        <div className="flex h-full min-w-max flex-col items-end justify-center whitespace-nowrap tabular-nums">
          <div className="inline-flex items-center justify-end gap-x-1 whitespace-nowrap">
            <Text as="span" className="text-ui-fg-muted whitespace-nowrap">
              <span data-testid="product-quantity">{item.quantity}</span>×
            </Text>
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </div>

          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </div>
      </Table.Cell>
    </Table.Row>
  );
};

export default Item;
