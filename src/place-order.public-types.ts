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
  FirstName: string;
  LastName: string;
  EmailAddress: string;
};

export type UnvalidatedAddress = {
  AddressLine1: string;
  AddressLine2: string;
  AddressLine3: string;
  AddressLine4: string;
  City: string;
  ZipCode: string;
};

export type UnvalidatedOrderLine = {
  OrderLineId: string;
  ProductCode: string;
  Quantity: number;
};

export type UnvalidatedOrder = {
  OrderId: string;
  CustomerInfo: UnvalidatedCustomerInfo;
  ShippingAddress: UnvalidatedAddress;
  BillingAddress: UnvalidatedAddress;
  Lines: UnvalidatedOrderLine[];
};

// ------------------------------------
// outputs from the workflow (success case)

// Event will be created if the Acknowledgment was successfully posted
export type OrderAcknowledgmentSent = {
  _tag: "OrderAcknowledgementSent";
  OrderId: OrderId;
  EmailAddress: EmailAddress;
};

// priced state
export type PricedOrderLine = {
  _tag: "PricedOrderLine";
  OrderLineId: OrderLineId;
  ProductCode: ProductCode;
  Quantity: OrderQuantity;
  LinePrice: Price;
};

export type PricedOrder = {
  _tag: "PricedOrder";
  OrderId: OrderId;
  CustomerInfo: CustomerInfo;
  ShippingAddress: Address;
  BillingAddress: Address;
  AmountToBill: BillingAmount;
  Lines: PricedOrderLine[];
};

/// Event to send to shipping context
export type OrderPlaced = PricedOrder;

/// Event to send to billing context
/// Will only be created if the AmountToBill is not zero
export type BillableOrderPlaced = {
  _tag: "BillableOrderPlaced";
  OrderId: OrderId;
  BillingAddress: Address;
  AmountToBill: BillingAmount;
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
  Name: string;
  Endpoint: string;
  // Endpoint: System.Uri
};

export type RemoteServiceError = {
  _tag: "RemoteServiceError";
  Service: ServiceInfo;
  Exception: Error;
  // Exception : System.Exception
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
