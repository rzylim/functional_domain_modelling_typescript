// ==================================
// This file contains the definitions of PUBLIC types (exposed at the boundary of the bounded context)
// related to the PlaceOrder workflow
// ==================================

import * as TE from "fp-ts/TaskEither";

import {
  BillingAmount,
  EmailAddress,
  OrderId,
  ConstrainedTypeError,
  ProductCodeError,
  PdfAttachment,
  ProductCode,
  OrderQuantity,
  VipStatusError,
} from "./common.simple-types";
import { Address } from "./common.compound-types";

import { PricedOrder } from "./place-order.internal-types";

// ------------------------------------
// inputs to the workflow

// not using _tag to make it a 'concrete' type
// since any such construction will do
// for unvalidated data.
export type UnvalidatedCustomerInfo = {
  firstName: string;
  lastName: string;
  emailAddress: string;
  vipStatus: string;
};

export type UnvalidatedAddress = {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  city: string;
  zipCode: string;
  state: string;
  country: string;
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
  promotionCode: string;
};

// ------------------------------------
// outputs from the workflow (success case)

// Event will be created if the Acknowledgment was successfully posted
export type OrderAcknowledgmentSent = {
  _tag: "OrderAcknowledgementSent";
  orderId: OrderId;
  emailAddress: EmailAddress;
};

// Event to send to shipping context
export type OrderPlaced = PricedOrder;

export type ShippableOrderLine = {
  _tag: "ShippableOrderLine";
  productCode: ProductCode;
  quantity: OrderQuantity;
};

export type ShippableOrderPlaced = {
  _tag: "ShippableOrderPlaced";
  orderId: OrderId;
  shippingAddress: Address;
  shipmentLines: ShippableOrderLine[];
  pdf: PdfAttachment;
};

// Event to send to billing context
// Will only be created if the AmountToBill is not zero
export type BillableOrderPlaced = {
  _tag: "BillableOrderPlaced";
  orderId: OrderId;
  billingAddress: Address;
  amountToBill: BillingAmount;
};

// The possible events resulting from the PlaceOrder workflow
// Not all events will occur, depending on the logic of the workflow
export type PlaceOrderEvent =
  | ShippableOrderPlaced
  | BillableOrderPlaced
  | OrderAcknowledgmentSent;

// ------------------------------------
// error outputs

// All the things that can go wrong in this workflow
export class ValidationError extends Error {
  _tag = "ValidationError";
  name = "ValidationError";
  fieldName: string;

  constructor(fieldName: string, message: string) {
    super(message);
    this.fieldName = fieldName;
  }

  static fromOtherErrors({
    fieldName,
    message,
    stack,
  }: ConstrainedTypeError | ProductCodeError | VipStatusError) {
    const err = new ValidationError(fieldName, message);
    err.stack = stack;
    return err;
  }
}

export class PricingError extends Error {
  _tag = "PricingError";
  name = "PricingError";
  fieldName: string;

  constructor(fieldName: string, message: string) {
    super(message);
    this.fieldName = fieldName;
  }

  static fromOtherErrors({ fieldName, message, stack }: ConstrainedTypeError) {
    const err = new ValidationError(fieldName, message);
    err.stack = stack;
    return err;
  }
}

export type ServiceInfo = {
  _tag: "ServiceInfo";
  name: string;
  endpoint: string;
  // endpoint: System.Uri
};

export class RemoteServiceError extends Error {
  _tag = "RemoteServiceError";
  name = "RemoteServiceError";
  fieldName: string;
  service: ServiceInfo;
  exception: Error;
  // exception : System.Exception

  constructor(
    fieldName: string,
    message: string,
    service: ServiceInfo,
    exception: Error
  ) {
    super(message);
    this.fieldName = fieldName;
    this.service = service;
    this.exception = exception;
  }
}

export type PlaceOrderError =
  | ValidationError
  | PricingError
  | RemoteServiceError;

// ------------------------------------
// the workflow itself

export type PlaceOrder = (
  order: UnvalidatedOrder
) => TE.TaskEither<PlaceOrderError, PlaceOrderEvent[]>;
