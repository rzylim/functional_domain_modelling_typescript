// ==================================
// This file contains the definitions of PUBLIC types (exposed at the boundary of the bounded context)
// related to the PlaceOrder workflow
// ==================================

import * as TE from "fp-ts/TaskEither";

import { Address, CustomerInfo } from "./common.compound-types";
import {
  BillingAmount,
  EmailAddress,
  OrderId,
  OrderLineId,
  OrderQuantity,
  Price,
  ProductCode,
} from "./common.simple-types";

// ------------------------------------
// inputs to the workflow

// not using _tag to make it a 'concrete' type
// since any such construction will do
// for unvalidated data.
export type UnvalidatedCustomerInfo = {
  firstName: string;
  lastName: string;
  emailAddress: string;
};

export type UnvalidatedAddress = {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  city: string;
  zipCode: string;
};

export type UnvalidatedOrderLine = {
  orderLineId: string;
  productCode: string;
  quantity: number;
};

export type UnvalidatedOrder = {
  orderId: string;
  customerInfo: UnvalidatedCustomerInfo;
  shippingAddress: UnvalidatedAddress;
  billingAddress: UnvalidatedAddress;
  lines: UnvalidatedOrderLine[];
};

// ------------------------------------
// outputs from the workflow (success case)

// Event will be created if the Acknowledgment was successfully posted
export type OrderAcknowledgmentSent = {
  _tag: "OrderAcknowledgementSent";
  orderId: OrderId;
  emailAddress: EmailAddress;
};

// priced state
export type PricedOrderLine = {
  _tag: "PricedOrderLine";
  orderLineId: OrderLineId;
  productCode: ProductCode;
  quantity: OrderQuantity;
  linePrice: Price;
};

export type PricedOrder = {
  _tag: "PricedOrder";
  orderId: OrderId;
  customerInfo: CustomerInfo;
  shippingAddress: Address;
  billingAddress: Address;
  amountToBill: BillingAmount;
  lines: PricedOrderLine[];
};

/// Event to send to shipping context
export type OrderPlaced = PricedOrder;

/// Event to send to billing context
/// Will only be created if the AmountToBill is not zero
export type BillableOrderPlaced = {
  _tag: "BillableOrderPlaced";
  orderId: OrderId;
  billingAddress: Address;
  amountToBill: BillingAmount;
};

/// The possible events resulting from the PlaceOrder workflow
/// Not all events will occur, depending on the logic of the workflow
export type PlaceOrderEvent =
  | OrderPlaced
  | BillableOrderPlaced
  | OrderAcknowledgmentSent;

// ------------------------------------
// error outputs

/// All the things that can go wrong in this workflow
export type ValidationError = { _tag: "ValidationError"; value: string };

export type PricingError = { _tag: "PricingError"; value: string };

export type ServiceInfo = {
  _tag: "ServiceInfo";
  name: string;
  endpoint: string;
  // endpoint: System.Uri
};

export type RemoteServiceError = {
  _tag: "RemoteServiceError";
  service: ServiceInfo;
  exception: Error;
  // exception : System.Exception
};

export type PlaceOrderError =
  | ValidationError
  | PricingError
  | RemoteServiceError;

// ------------------------------------
// the workflow itself

export type PlaceOrder = (
  order: UnvalidatedOrder
) => TE.TaskEither<PlaceOrderEvent[], PlaceOrderError>;
