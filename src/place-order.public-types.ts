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
  OrderId: OrderId;
  EmailAddress: EmailAddress;
};

// priced state
export type PricedOrderLine = {
  OrderLineId: OrderLineId;
  ProductCode: ProductCode;
  Quantity: OrderQuantity;
  LinePrice: Price;
};

export type PricedOrder = {
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
export type ValidationError = string;

export type PricingError = string;

export type ServiceInfo = {
  Name: string;
  Endpoint: string;
  // Endpoint: System.Uri
};

export type RemoteServiceError = {
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
