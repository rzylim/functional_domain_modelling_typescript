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
  ZipCode,
} from "./common.simple-types";
import { Address, CustomerInfo } from "./common.compound-types";

import {
  OrderAcknowledgmentSent,
  PlaceOrderEvent,
  PricedOrder,
  PricedOrderLine,
  PricingError,
  UnvalidatedAddress,
  UnvalidatedCustomerInfo,
  UnvalidatedOrder,
  UnvalidatedOrderLine,
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

export type ValidatedOrderLine = {
  orderLineId: OrderLineId;
  productCode: ProductCode;
  quantity: OrderQuantity;
};

export type ValidatedOrder = {
  orderId: OrderId;
  customerInfo: CustomerInfo;
  shippingAddress: Address;
  billingAddress: Address;
  lines: ValidatedOrderLine[];
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

// priced state is defined Domain.WorkflowTypes

export type PriceOrder = (
  getProductPrice: GetProductPrice // dependency
) => (
  order: ValidatedOrder // input
) => E.Either<PricingError, PricedOrder>; // output

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
  order: PricedOrder
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
  order: PricedOrder // input
) => O.Option<OrderAcknowledgmentSent>; // output

// ---------------------------
// Create events
// ---------------------------

export type CreateEvents = (
  order: PricedOrder // input
) => (
  orderAcknowledgementSent: O.Option<OrderAcknowledgmentSent> // input (event from previous step)
) => PlaceOrderEvent[]; // output

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
    E.map(({ firstName, lastName, emailAddress }) => ({
      _tag: "CustomerInfo",
      name: { _tag: "PersonalName", firstName, lastName },
      emailAddress,
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
          (x) => x,
          A.sequence(E.Applicative),
          TE.fromEither
        )
      )
    );

// ---------------------------
// PriceOrder step
// ---------------------------

export const toPricedOrderLine =
  (getProductPrice: GetProductPrice) =>
  (
    validatedOrderLine: ValidatedOrderLine
  ): E.Either<ValidationError, PricedOrderLine> => {
    const price = getProductPrice(validatedOrderLine.productCode);
    return pipe(
      Price.multiply(validatedOrderLine.quantity.value, price),
      E.mapLeft(ValidationError.fromOtherErrors),
      E.map((linePrice) => ({
        ...validatedOrderLine,
        _tag: "PricedOrderLine",
        linePrice,
      }))
    );
  };

export const priceOrder: PriceOrder = (getProductPrice) => (validatedOrder) =>
  pipe(
    E.Do,
    E.bind("lines", () =>
      pipe(
        validatedOrder.lines.map(toPricedOrderLine(getProductPrice)),
        A.sequence(E.Applicative) // convert list of Results to a single Result
      )
    ),
    E.bind("amountToBill", ({ lines }) =>
      pipe(
        lines.map(({ linePrice }) => linePrice), // get each line price
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

// // ---------------------------
// // AcknowledgeOrder step
// // ---------------------------

// let acknowledgeOrder : AcknowledgeOrder =
//     fun createAcknowledgmentLetter sendAcknowledgment pricedOrder ->
//         let letter = createAcknowledgmentLetter pricedOrder
//         let acknowledgment = {
//             EmailAddress = pricedOrder.CustomerInfo.EmailAddress
//             Letter = letter
//             }

//         // if the acknowledgement was successfully sent,
//         // return the corresponding event, else return None
//         match sendAcknowledgment acknowledgment with
//         | Sent ->
//             let event = {
//                 OrderId = pricedOrder.OrderId
//                 EmailAddress = pricedOrder.CustomerInfo.EmailAddress
//                 }
//             Some event
//         | NotSent ->
//             None

// // ---------------------------
// // Create events
// // ---------------------------

// let createOrderPlacedEvent (placedOrder:PricedOrder) : OrderPlaced =
//     placedOrder

// let createBillingEvent (placedOrder:PricedOrder) : BillableOrderPlaced option =
//     let billingAmount = placedOrder.AmountToBill |> BillingAmount.value
//     if billingAmount > 0M then
//         {
//         OrderId = placedOrder.OrderId
//         BillingAddress = placedOrder.BillingAddress
//         AmountToBill = placedOrder.AmountToBill
//         } |> Some
//     else
//         None

// /// helper to convert an Option into a List
// let listOfOption opt =
//     match opt with
//     | Some x -> [x]
//     | None -> []

// let createEvents : CreateEvents =
//     fun pricedOrder acknowledgmentEventOpt ->
//         let acknowledgmentEvents =
//             acknowledgmentEventOpt
//             |> Option.map PlaceOrderEvent.AcknowledgmentSent
//             |> listOfOption
//         let orderPlacedEvents =
//             pricedOrder
//             |> createOrderPlacedEvent
//             |> PlaceOrderEvent.OrderPlaced
//             |> List.singleton
//         let billingEvents =
//             pricedOrder
//             |> createBillingEvent
//             |> Option.map PlaceOrderEvent.BillableOrderPlaced
//             |> listOfOption

//         // return all the events
//         [
//         yield! acknowledgmentEvents
//         yield! orderPlacedEvents
//         yield! billingEvents
//         ]

// // ---------------------------
// // overall workflow
// // ---------------------------

// let placeOrder
//     checkProductExists // dependency
//     checkAddressExists // dependency
//     getProductPrice    // dependency
//     createOrderAcknowledgmentLetter  // dependency
//     sendOrderAcknowledgment // dependency
//     : PlaceOrder =       // definition of function

//     fun unvalidatedOrder ->
//         asyncResult {
//             let! validatedOrder =
//                 validateOrder checkProductExists checkAddressExists unvalidatedOrder
//                 |> AsyncResult.mapError PlaceOrderError.Validation
//             let! pricedOrder =
//                 priceOrder getProductPrice validatedOrder
//                 |> AsyncResult.ofResult
//                 |> AsyncResult.mapError PlaceOrderError.Pricing
//             let acknowledgementOption =
//                 acknowledgeOrder createOrderAcknowledgmentLetter sendOrderAcknowledgment pricedOrder
//             let events =
//                 createEvents pricedOrder acknowledgementOption
//             return events
//         }
