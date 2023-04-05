import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import {
  BillingAmount,
  EmailAddress,
  OrderId,
  OrderLineId,
  OrderQuantity,
  Price,
  ProductCode,
} from "./common.simple-types";
import { Address, CustomerInfo } from "./common.compound-types";

import {
  OrderAcknowledgmentSent,
  PlaceOrderEvent,
  PricingError,
  UnvalidatedAddress,
  UnvalidatedOrder,
  ValidationError,
} from "./place-order.public-types";

// ======================================================
// Section 1 : Define each step in the workflow using types
// ======================================================

// ---------------------------
// Validation step
// ---------------------------

// Product validation

export type CheckProductCodeExists = (code: ProductCode) => boolean;

// Address validation
export type InvalidFormat = { _tag: "InvalidFormat"; value: string };
export type AddressNotFound = { _tag: "AddressNotFound"; value: string };
export type AddressValidationError = InvalidFormat | AddressNotFound;

// KIV, supposed to be wrapped version of UnvalidatedAddress, see page 140.
export type CheckedAddress = {
  _tag: "CheckedAddress";
  value: UnvalidatedAddress;
};

export type CheckAddressExists = (
  address: UnvalidatedAddress
) => TE.TaskEither<AddressValidationError, CheckedAddress>;

// ---------------------------
// Validated Order
// ---------------------------

export type PromotionCode = { _tag: "PromotionCode"; value: string };

export type PricingMethod = "Standard" | PromotionCode;

export type ValidatedOrderLine = {
  _tag: "ValidatedOrderLine";
  orderLineId: OrderLineId;
  productCode: ProductCode;
  quantity: OrderQuantity;
};

export type ValidatedOrder = {
  _tag: "ValidatedOrder";
  orderId: OrderId;
  customerInfo: CustomerInfo;
  shippingAddress: Address;
  billingAddress: Address;
  lines: ValidatedOrderLine[];
  pricingMethod: PricingMethod;
};

export type ValidateOrder = (
  checkProductCodeExists: CheckProductCodeExists // dependency
) => (
  checkAddressExists: CheckAddressExists // dependency
) => (
  order: UnvalidatedOrder // input
) => TE.TaskEither<ValidationError, ValidatedOrder>; // output

// ---------------------------
// Pricing step
// ---------------------------

export type GetProductPrice = (productCode: ProductCode) => Price;

export type TryGetProductPrice = (productCode: ProductCode) => O.Option<Price>;

export type GetPricingFunction = (
  pricingMethod: PricingMethod
) => GetProductPrice;

// no input -> return standard prices
export type GetStandardPrices = () => GetProductPrice;

export type GetPromotionPrices = (
  promotionCode: PromotionCode
) => TryGetProductPrice;

// priced state
export type PricedOrderProductLine = {
  _tag: "PricedOrderProductLine";
  orderLineId: OrderLineId;
  productCode: ProductCode;
  quantity: OrderQuantity;
  linePrice: Price;
};

export type PricedOrderLine =
  | PricedOrderProductLine
  | { _tag: "CommentLine"; value: string };

export type PricedOrder = {
  _tag: "PricedOrder";
  orderId: OrderId;
  customerInfo: CustomerInfo;
  shippingAddress: Address;
  billingAddress: Address;
  amountToBill: BillingAmount;
  lines: PricedOrderLine[];
  pricingMethod: PricingMethod;
};

export type PriceOrder = (
  getPricingFunction: GetPricingFunction // dependency
) => (
  order: ValidatedOrder // input
) => E.Either<PricingError, PricedOrder>; // output

// ---------------------------
// Shipping
// ---------------------------

export type ShippingMethod = "PostalService" | "Fedex24" | "Fedex48" | "Ups48";

export type ShippingInfo = {
  _tag: "ShippingInfo";
  shippingMethod: ShippingMethod;
  shippingCost: Price;
};

export type PricedOrderWithShippingMethod = {
  _tag: "PricedOrderWithShippingMethod";
  shippingInfo: ShippingInfo;
  pricedOrder: PricedOrder;
};

export type CalculateShippingCost = (pricedOrder: PricedOrder) => Price;

export type AddShippingInfoToOrder = (
  calculateShippingCost: CalculateShippingCost // dependency
) => (pricedOrder: PricedOrder) => PricedOrderWithShippingMethod;

// ---------------------------
// VIP shipping
// ---------------------------

export type FreeVipShipping = (
  order: PricedOrderWithShippingMethod
) => PricedOrderWithShippingMethod;

// ---------------------------
// Send OrderAcknowledgment
// ---------------------------

export type HtmlString = { _tag: "HtmlString"; value: string };

export type OrderAcknowledgment = {
  _tag: "OrderAcknowledgement";
  emailAddress: EmailAddress;
  letter: HtmlString;
};

export type CreateOrderAcknowledgmentLetter = (
  order: PricedOrderWithShippingMethod
) => HtmlString;

// Send the order acknowledgement to the customer
// Note that this does NOT generate an Result-type error (at least not in this workflow)
// because on failure we will continue anyway.
// On success, we will generate a OrderAcknowledgmentSent event,
// but on failure we won't.

// concrete types not wrapping any value.
export type SendResult = "Sent" | "NotSent";

export type SendOrderAcknowledgment = (
  orderAcknowledgement: OrderAcknowledgment
) => SendResult;

export type AcknowledgeOrder = (
  createOrderAcknowledgementLetter: CreateOrderAcknowledgmentLetter // dependency
) => (
  sendOrderAcknowledgement: SendOrderAcknowledgment // dependency
) => (
  order: PricedOrderWithShippingMethod // input
) => O.Option<OrderAcknowledgmentSent>; // output

// ---------------------------
// Create events
// ---------------------------

export type CreateEvents = (
  order: PricedOrder // input
) => (
  orderAcknowledgementSent: O.Option<OrderAcknowledgmentSent> // input (event from previous step)
) => PlaceOrderEvent[]; // output
