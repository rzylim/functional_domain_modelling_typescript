// ======================================================
// This file contains the final implementation for the PlaceOrder workflow
//
// This represents the code in chapter 10, "Working with Errors"
//
// There are two parts:
// * the first section contains the (type-only) definitions for each step
// * the second section contains the implementations for each step
//   and the implementation of the overall workflow
// ======================================================

import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as A from "fp-ts/Array";

import {
  BillingAmount,
  EmailAddress,
  OrderId,
  OrderLineId,
  OrderQuantity,
  Price,
  ProductCode,
  String50,
  UsStateCode,
  VipStatus,
  ZipCode,
} from "./common.simple-types";
import { Address, CustomerInfo } from "./common.compound-types";

import {
  AcknowledgeOrder,
  AddShippingInfoToOrder,
  CalculateShippingCost,
  CheckAddressExists,
  CheckedAddress,
  CheckProductCodeExists,
  CreateEvents,
  CreateOrderAcknowledgmentLetter,
  FreeVipShipping,
  GetPricingFunction,
  GetProductPrice,
  OrderAcknowledgment,
  PricedOrder,
  PricedOrderLine,
  PricedOrderProductLine,
  PriceOrder,
  PricingMethod,
  SendOrderAcknowledgment,
  ValidatedOrderLine,
  ValidateOrder,
} from "./place-order.internal-types";
import {
  BillableOrderPlaced,
  PlaceOrder,
  PricingError,
  ShippableOrderLine,
  ShippableOrderPlaced,
  UnvalidatedAddress,
  UnvalidatedCustomerInfo,
  UnvalidatedOrderLine,
  ValidationError,
} from "./place-order.public-types";
import { createPricingMethod } from "./place-order.pricing";

// ======================================================
// Section 2 : Implementation
// ======================================================

// ---------------------------
// ValidateOrder step
// ---------------------------

export const toCustomerInfo = (
  unvalidatedCustomerInfo: UnvalidatedCustomerInfo
): E.Either<ValidationError, CustomerInfo> =>
  pipe(
    E.Do,
    E.bind("firstName", () =>
      pipe(
        String50.create("firstName", unvalidatedCustomerInfo.firstName),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("lastName", () =>
      pipe(
        String50.create("lastName", unvalidatedCustomerInfo.lastName),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("emailAddress", () =>
      pipe(
        EmailAddress.create(
          "emailAddress",
          unvalidatedCustomerInfo.emailAddress
        ),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("vipStatus", () =>
      pipe(
        VipStatus.create("vipStatus", unvalidatedCustomerInfo.vipStatus),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.map(({ firstName, lastName, emailAddress, vipStatus }) => ({
      _tag: "CustomerInfo",
      name: { _tag: "PersonalName", firstName, lastName },
      emailAddress,
      vipStatus,
    }))
  );

export const toAddress = (
  checkedAddress: CheckedAddress
): E.Either<ValidationError, Address> =>
  pipe(
    E.Do,
    E.bind("addressLine1", () =>
      pipe(
        String50.create("AddressLine1", checkedAddress.value.addressLine1),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("addressLine2", () =>
      pipe(
        String50.createOption(
          "AddressLine2",
          checkedAddress.value.addressLine2
        ),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("addressLine3", () =>
      pipe(
        String50.createOption(
          "AddressLine3",
          checkedAddress.value.addressLine3
        ),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("addressLine4", () =>
      pipe(
        String50.createOption(
          "AddressLine4",
          checkedAddress.value.addressLine4
        ),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("city", () =>
      pipe(
        String50.create("City", checkedAddress.value.city),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("zipCode", () =>
      pipe(
        ZipCode.create("ZipCode", checkedAddress.value.zipCode),
        E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
      )
    ),
    E.bind("state", () =>
      pipe(
        UsStateCode.create("State", checkedAddress.value.state),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("country", () =>
      pipe(
        String50.create("Country", checkedAddress.value.country),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.map((data) => ({
      _tag: "Address",
      ...data,
    }))
  );

// Call the checkAddressExists and convert the error to a ValidationError
export const toCheckedAddress =
  (checkAddress: CheckAddressExists) => (address: UnvalidatedAddress) =>
    pipe(
      address,
      checkAddress,
      TE.mapLeft((addrError) => {
        switch (addrError._tag) {
          case "AddressNotFound":
            return new ValidationError("", "Address not found");
          case "InvalidFormat":
            return new ValidationError("", "Address has bad format");
        }
      })
    );

export const toOrderId = (orderId: string) =>
  pipe(
    OrderId.create("OrderId", orderId),
    E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
  );

// Helper function for validateOrder
export const toOrderLineId = (orderLineId: string) =>
  pipe(
    OrderLineId.create("OrderLineId", orderLineId),
    E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
  );

// Helper function for validateOrder
export const toProductCode =
  (checkProductCodeExists: CheckProductCodeExists) => (productCode: string) =>
    pipe(
      ProductCode.create("ProductCode", productCode),
      E.mapLeft(ValidationError.fromOtherErrors), // convert creation error into ValidationError
      E.chain((code) =>
        checkProductCodeExists(code)
          ? E.right(code)
          : E.left(new ValidationError("", `Invalid: ${productCode}`))
      )
    );

// Helper function for validateOrder
export const toOrderQuantity = (productCode: ProductCode, quantity: number) =>
  pipe(
    OrderQuantity.create("OrderQuantity", productCode, quantity),
    E.mapLeft(ValidationError.fromOtherErrors) // convert creation error into ValidationError
  );

// Helper function for validateOrder
export const toValidatedOrderLine =
  (checkProductCodeExists: CheckProductCodeExists) =>
  (
    unvalidatedOrderLine: UnvalidatedOrderLine
  ): E.Either<ValidationError, ValidatedOrderLine> =>
    pipe(
      E.Do,
      E.bind("orderLineId", () =>
        toOrderLineId(unvalidatedOrderLine.orderLineId)
      ),
      E.bind("productCode", () =>
        toProductCode(checkProductCodeExists)(unvalidatedOrderLine.productCode)
      ),
      E.bind("quantity", ({ productCode }) =>
        toOrderQuantity(productCode, unvalidatedOrderLine.quantity)
      )
    );

export const validateOrder: ValidateOrder =
  (checkProductCodeExists) => (checkAddressExists) => (unvalidatedOrder) =>
    pipe(
      TE.Do,
      TE.bind("orderId", () =>
        pipe(unvalidatedOrder.orderId, toOrderId, TE.fromEither)
      ),
      TE.bind("customerInfo", () =>
        pipe(unvalidatedOrder.customerInfo, toCustomerInfo, TE.fromEither)
      ),
      TE.bind("checkedShippingAddress", () =>
        toCheckedAddress(checkAddressExists)(unvalidatedOrder.shippingAddress)
      ),
      TE.bind("shippingAddress", ({ checkedShippingAddress }) =>
        pipe(checkedShippingAddress, toAddress, TE.fromEither)
      ),
      TE.bind("checkedBillingAddress", () =>
        toCheckedAddress(checkAddressExists)(unvalidatedOrder.billingAddress)
      ),
      TE.bind("billingAddress", ({ checkedBillingAddress }) =>
        pipe(checkedBillingAddress, toAddress, TE.fromEither)
      ),
      TE.bind("lines", () =>
        pipe(
          unvalidatedOrder.lines.map(
            toValidatedOrderLine(checkProductCodeExists)
          ),
          A.sequence(E.Applicative), // convert list of Results to a single Result
          TE.fromEither
        )
      ),
      TE.bind("pricingMethod", () =>
        TE.of(pipe(createPricingMethod(unvalidatedOrder.promotionCode)))
      ),
      TE.map(
        ({
          checkedShippingAddress,
          checkedBillingAddress,
          ...validatedOrder
        }) => validatedOrder
      )
    );

// ---------------------------
// PriceOrder step
// ---------------------------

export const toPricedOrderLine =
  (getProductPrice: GetProductPrice) =>
  (
    validatedOrderLine: ValidatedOrderLine
  ): E.Either<ValidationError, PricedOrderProductLine> => {
    const price = getProductPrice(validatedOrderLine.productCode);
    return pipe(
      Price.multiply(validatedOrderLine.quantity.value, price),
      E.mapLeft(ValidationError.fromOtherErrors),
      E.map((linePrice) => ({
        ...validatedOrderLine,
        _tag: "PricedOrderProductLine",
        linePrice,
      }))
    );
  };

// add the special comment line if needed
export const addCommentLine =
  (pricingMethod: PricingMethod) =>
  (lines: PricedOrderLine[]): PricedOrderLine[] => {
    switch (pricingMethod) {
      case "Standard":
        // unchanged
        return lines;
      default:
        const commentLine: PricedOrderLine = {
          _tag: "CommentLine",
          value: `Applied promotion ${pricingMethod.value}`,
        };
        return lines.concat([commentLine]);
    }
  };

export const getLinePrice = (line: PricedOrderLine): Price => {
  switch (line._tag) {
    case "PricedOrderProductLine":
      return line.linePrice;
    case "CommentLine":
      return Price.unsafeCreate(0);
  }
};

export const priceOrder: PriceOrder = (getProductPrice) => (validatedOrder) =>
  pipe(
    E.Do,
    E.bind("lines", () =>
      pipe(
        validatedOrder.lines.map(
          toPricedOrderLine(getProductPrice(validatedOrder.pricingMethod))
        ),
        A.sequence(E.Applicative), // convert list of Results to a single Result
        E.map((lines) => addCommentLine(validatedOrder.pricingMethod)(lines))
      )
    ),
    E.bind("amountToBill", ({ lines }) =>
      pipe(
        lines.map(getLinePrice), // get each line price
        BillingAmount.sumPrices, // add them together as a BillingAmount
        E.mapLeft(PricingError.fromOtherErrors) // convert to PlaceOrderError
      )
    ),
    E.map(({ lines, amountToBill }) => ({
      _tag: "PricedOrder",
      ...validatedOrder,
      lines,
      amountToBill,
    }))
  );

// ---------------------------
// Shipping step
// ---------------------------

export const calculateShippingCost: CalculateShippingCost = (pricedOrder) => {
  type UsStateClassification =
    | "UsLocalState"
    | "UsRemoteState"
    | "International";

  const getUsStateClassification = (
    address: Address
  ): UsStateClassification => {
    if (address.country.value === "US") {
      if (["CA", "OR", "AZ", "NV"].includes(address.state.value))
        return "UsLocalState";
      return "UsRemoteState";
    }
    return "International";
  };

  switch (getUsStateClassification(pricedOrder.shippingAddress)) {
    case "UsLocalState":
      return Price.unsafeCreate(5);
    case "UsRemoteState":
      return Price.unsafeCreate(10);
    case "International":
      return Price.unsafeCreate(20);
  }
};

export const addShippingInfoToOrder: AddShippingInfoToOrder =
  (calculateShippingCost) => (pricedOrder) => ({
    pricedOrder,
    // create the shipping info
    // add it to the order
    shippingInfo: {
      shippingMethod: "Fedex24",
      shippingCost: calculateShippingCost(pricedOrder),
    },
  });

// ---------------------------
// VIP shipping step
// ---------------------------

// Update the shipping cost if customer is VIP
export const freeVipShipping: FreeVipShipping = (order) => {
  switch (order.pricedOrder.customerInfo.vipStatus) {
    case "Normal":
      return order;
    case "Vip":
      return {
        ...order,
        shippingInfo: {
          shippingMethod: "Fedex24",
          shippingCost: Price.unsafeCreate(0),
        },
      };
  }
};

// ---------------------------
// AcknowledgeOrder step
// ---------------------------

export const acknowledgeOrder: AcknowledgeOrder =
  (createOrderAcknowledgmentLetter) =>
  (sendOrderAcknowledgement) =>
  (pricedOrderWithShipping) => {
    const letter = createOrderAcknowledgmentLetter(pricedOrderWithShipping);
    const acknowledgement: OrderAcknowledgment = {
      _tag: "OrderAcknowledgement",
      emailAddress:
        pricedOrderWithShipping.pricedOrder.customerInfo.emailAddress,
      letter,
    };

    // if the acknowledgement was successfully sent,
    // return the corresponding event, else return None
    switch (sendOrderAcknowledgement(acknowledgement)) {
      case "Sent":
        return O.some({
          _tag: "OrderAcknowledgementSent",
          orderId: pricedOrderWithShipping.pricedOrder.orderId,
          emailAddress:
            pricedOrderWithShipping.pricedOrder.customerInfo.emailAddress,
        });
      case "NotSent":
        return O.none;
    }
  };

// ---------------------------
// Create events
// ---------------------------

export const makeShipmentLine = (
  line: PricedOrderLine
): O.Option<ShippableOrderLine> => {
  switch (line._tag) {
    case "PricedOrderProductLine":
      return O.some({ ...line, _tag: "ShippableOrderLine" });
    case "CommentLine":
      return O.none;
  }
};

export const createShippingEvent = ({
  orderId,
  shippingAddress,
  lines,
}: PricedOrder): ShippableOrderPlaced => ({
  _tag: "ShippableOrderPlaced",
  orderId,
  shippingAddress,
  shipmentLines:
    pipe(
      lines,
      A.map(makeShipmentLine),
      A.filter((opt) => O.isSome(opt)),
      A.sequence(O.Applicative),
      O.toNullable
    ) || [],
  pdf: {
    name: `Order${orderId.value}.pdf`,
    bytes: "",
  },
});

export const createBillingEvent = ({
  amountToBill,
  orderId,
  billingAddress,
}: PricedOrder): O.Option<BillableOrderPlaced> =>
  amountToBill.value > 0
    ? O.some({
        _tag: "BillableOrderPlaced",
        orderId,
        amountToBill,
        billingAddress,
      })
    : O.none;

// helper to convert an Option into a List
export const listOfOption = <T>(opt: O.Option<T>) =>
  O.match(
    () => [], // none
    (val: T) => [val] // some
  )(opt);

export const createEvents: CreateEvents =
  (pricedOrder) => (acknowledgemententEventOpt) => {
    const acknowledgemententEvents = listOfOption(acknowledgemententEventOpt);
    const orderPlacedEvent = createShippingEvent(pricedOrder);
    const billingEvents = listOfOption(createBillingEvent(pricedOrder));

    return [...acknowledgemententEvents, orderPlacedEvent, ...billingEvents];
  };

// ---------------------------
// overall workflow
// ---------------------------

export const placeOrder =
  (checkProductExists: CheckProductCodeExists) =>
  (checkAddressExists: CheckAddressExists) =>
  (getProductPrice: GetPricingFunction) =>
  (createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter) =>
  (sendOrderAcknowledgment: SendOrderAcknowledgment): PlaceOrder =>
  (unvalidatedOrder) =>
    pipe(
      TE.Do,
      TE.bind("validatedOrder", () =>
        validateOrder(checkProductExists)(checkAddressExists)(unvalidatedOrder)
      ),
      TE.bind("pricedOrder", ({ validatedOrder }) =>
        TE.fromEither(priceOrder(getProductPrice)(validatedOrder))
      ),
      TE.bind("pricedOrderWithShipping", ({ pricedOrder }) =>
        TE.of(
          pipe(
            pricedOrder,
            addShippingInfoToOrder(calculateShippingCost),
            freeVipShipping
          )
        )
      ),
      TE.bind("acknowledgementOption", ({ pricedOrderWithShipping }) =>
        TE.of(
          acknowledgeOrder(createOrderAcknowledgmentLetter)(
            sendOrderAcknowledgment
          )(pricedOrderWithShipping)
        )
      ),
      TE.map(({ pricedOrder, acknowledgementOption }) =>
        createEvents(pricedOrder)(acknowledgementOption)
      )
    );
