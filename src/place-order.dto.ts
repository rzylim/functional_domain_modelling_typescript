// ======================================================
// This file contains the logic for working with data transfer objects (DTOs)
//
// This represents the code in chapter 11, "Serialization"
//
// Each type of DTO is defined using primitive, serializable types
// and then there are `toDomain` and `fromDomain` functions defined for each DTO.
//
// ======================================================

import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import { JsonRecord } from "fp-ts/lib/Json";

import {
  EmailAddress,
  PdfAttachment,
  String50,
  UsStateCode,
  VipStatus,
  ZipCode,
} from "./common.simple-types";
import { Address, CustomerInfo } from "./common.compound-types";

import { PricedOrderLine } from "./place-order.internal-types";
import {
  BillableOrderPlaced,
  OrderAcknowledgmentSent,
  PlaceOrderError,
  PlaceOrderEvent,
  PricingError,
  RemoteServiceError,
  ShippableOrderLine,
  ShippableOrderPlaced,
  UnvalidatedAddress,
  UnvalidatedCustomerInfo,
  UnvalidatedOrder,
  UnvalidatedOrderLine,
  ValidationError,
} from "./place-order.public-types";

// ==================================
// DTOs for PlaceOrder workflow
// ==================================

// Helper function to get the value from an Option, and if None, use the defaultValue
// Note that the defaultValue is the first parameter, unlike the similar `defaultArg`
export const defaultIfNone =
  <T>(defaultValue: T) =>
  (opt: O.Option<T>) =>
    O.match(
      () => defaultValue, // none
      (val: T) => val // some
    )(opt);

//===============================================
// DTO for CustomerInfo
//===============================================

export type CustomerInfoDto = {
  firstName: string;
  lastName: string;
  emailAddress: string;
  vipStatus: string;
};

// Functions for converting between the DTO and corresponding domain object

// Convert the DTO into a UnvalidatedCustomerInfo object.
// This always succeeds because there is no validation.
// Used when importing an OrderForm from the outside world into the domain.
export const toUnvalidatedCustomerInfo = ({
  firstName,
  lastName,
  emailAddress,
  vipStatus,
}: CustomerInfoDto): UnvalidatedCustomerInfo => ({
  // sometimes it's helpful to use an explicit type annotation
  // to avoid ambiguity between records with the same field names.
  firstName,
  lastName,
  emailAddress,
  vipStatus,
});

// Convert the DTO into a CustomerInfo object
// Used when importing from the outside world into the domain, eg loading from a database
export const toCustomerInfo = (
  dto: CustomerInfoDto
): E.Either<ValidationError, CustomerInfo> =>
  pipe(
    E.Do,
    E.bind("firstName", () =>
      pipe(
        String50.create("FirstName", dto.firstName),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("lastName", () =>
      pipe(
        String50.create("LastName", dto.lastName),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("emailAddress", () =>
      pipe(
        EmailAddress.create("EmailAddress", dto.emailAddress),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("vipStatus", () =>
      pipe(
        VipStatus.create("VipStatus", dto.vipStatus),
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

/// Convert a CustomerInfo object into the corresponding DTO.
/// Used when exporting from the domain to the outside world.
export const fromCustomerInfo = (domainObj: CustomerInfo): CustomerInfoDto => ({
  firstName: domainObj.name.firstName.value,
  lastName: domainObj.name.lastName.value,
  emailAddress: domainObj.emailAddress.value,
  vipStatus: domainObj.vipStatus,
});

//===============================================
// DTO for Address
//===============================================

export type AddressDto = {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  city: string;
  zipCode: string;
  state: string;
  country: string;
};

/// Functions for converting between the DTO and corresponding domain object

// Convert the DTO into a UnvalidatedAddress
// This always succeeds because there is no validation.
// Used when importing an OrderForm from the outside world into the domain.
export const toUnvalidatedAddress = ({
  addressLine1,
  addressLine2,
  addressLine3,
  addressLine4,
  city,
  zipCode,
  state,
  country,
}: AddressDto): UnvalidatedAddress => ({
  // this is a simple 1:1 copy
  addressLine1,
  addressLine2,
  addressLine3,
  addressLine4,
  city,
  zipCode,
  state,
  country,
});

// Convert the DTO into a Address object
// Used when importing from the outside world into the domain, eg loading from a database.
export const toAddress = (
  dto: AddressDto
): E.Either<ValidationError, Address> =>
  pipe(
    E.Do,
    E.bind("addressLine1", () =>
      pipe(
        String50.create("AddressLine1", dto.addressLine1),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("addressLine2", () =>
      pipe(
        String50.createOption("AddressLine2", dto.addressLine2),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("addressLine3", () =>
      pipe(
        String50.createOption("AddressLine3", dto.addressLine3),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("addressLine4", () =>
      pipe(
        String50.createOption("AddressLine4", dto.addressLine4),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("city", () =>
      pipe(
        String50.create("city", dto.city),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("zipCode", () =>
      pipe(
        ZipCode.create("ZipCode", dto.zipCode),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("state", () =>
      pipe(
        UsStateCode.create("UsStateCode", dto.state),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.bind("country", () =>
      pipe(
        String50.create("Country", dto.country),
        E.mapLeft(ValidationError.fromOtherErrors)
      )
    ),
    E.map((data) => ({
      _tag: "Address",
      ...data,
    }))
  );

// Convert a Address object into the corresponding DTO.
// Used when exporting from the domain to the outside world.
export const fromAddress = (domainObj: Address): AddressDto => ({
  addressLine1: domainObj.addressLine1.value,
  addressLine2: O.match(
    () => "",
    (data: String50) => data.value
  )(domainObj.addressLine2),
  addressLine3: O.match(
    () => "",
    (data: String50) => data.value
  )(domainObj.addressLine2),
  addressLine4: O.match(
    () => "",
    (data: String50) => data.value
  )(domainObj.addressLine2),
  city: domainObj.city.value,
  zipCode: domainObj.zipCode.value,
  state: domainObj.state.value,
  country: domainObj.country.value,
});

//===============================================
// DTOs for OrderLines
//===============================================

// From the order form used as input
export type OrderFormLineDto = {
  orderLineId: string;
  productCode: string;
  quantity: number;
};

// Functions relating to the OrderLine DTOs

// Convert the OrderFormLine into a UnvalidatedOrderLine
// This always succeeds because there is no validation.
// Used when importing an OrderForm from the outside world into the domain.
export const toUnvalidatedOrderLine = ({
  orderLineId,
  productCode,
  quantity,
}: OrderFormLineDto): UnvalidatedOrderLine => ({
  // this is a simple 1:1 copy
  orderLineId,
  productCode,
  quantity,
});

//===============================================
// DTOs for PricedOrderLines
//===============================================

// Used in the output of the workflow
export type PricedOrderLineDto =
  | {
      orderLineId: string;
      productCode: string;
      quantity: number;
      linePrice: number;
      comment: string;
    }
  | {
      orderLineId: null;
      productCode: null;
      quantity: number;
      linePrice: number;
      comment: string;
    };

// Convert a PricedOrderLine object into the corresponding DTO.
// Used when exporting from the domain to the outside world.
export const pricedOrderLineDtoFromDomain = (
  domainObj: PricedOrderLine
): PricedOrderLineDto => {
  // handle the comment line
  switch (domainObj._tag) {
    case "PricedOrderProductLine":
      return {
        orderLineId: domainObj.orderLineId.value,
        productCode: domainObj.productCode.value,
        quantity: domainObj.quantity.value,
        linePrice: domainObj.linePrice.value,
        comment: "",
      };
    case "CommentLine":
      return {
        orderLineId: null,
        productCode: null,
        quantity: 0,
        linePrice: 0,
        comment: domainObj.value,
      };
    default:
      // should not reach here
      throw new Error(
        "invalid object type: unable to convert to data transfer object"
      );
  }
};

//===============================================
// DTO for OrderForm
//===============================================

export type OrderFormDto = {
  orderId: string;
  customerInfoDto: CustomerInfoDto;
  shippingAddress: AddressDto;
  billingAddress: AddressDto;
  lines: OrderFormLineDto[];
  promotionCode: string;
};

// Functions relating to the Order DTOs

// Convert the OrderForm into a UnvalidatedOrder
// This always succeeds because there is no validation.
export const toUnvalidatedOrder = (dto: OrderFormDto): UnvalidatedOrder => ({
  orderId: dto.orderId,
  customerInfo: toUnvalidatedCustomerInfo(dto.customerInfoDto),
  shippingAddress: toUnvalidatedAddress(dto.shippingAddress),
  billingAddress: toUnvalidatedAddress(dto.billingAddress),
  lines: dto.lines.map(toUnvalidatedOrderLine),
  promotionCode: dto.promotionCode,
});

//===============================================
// DTO for ShippableOrderPlaced event
//===============================================

export type ShippableOrderLineDto = {
  productCode: string;
  quantity: number;
};

// Event to send to shipping context
export type ShippableOrderPlacedDto = {
  orderId: string;
  shippingAddress: AddressDto;
  shipmentLines: ShippableOrderLineDto[];
  pdf: PdfAttachment;
};

export const shippableOrderPlacedDtoFromShippableOrderLine = (
  domainObj: ShippableOrderLine
): ShippableOrderLineDto => ({
  productCode: domainObj.productCode.value,
  quantity: domainObj.quantity.value,
});

export const shippableOrderPlacedDtoFromDomain = (
  domainObj: ShippableOrderPlaced
): ShippableOrderPlacedDto => ({
  orderId: domainObj.orderId.value,
  shippingAddress: fromAddress(domainObj.shippingAddress),
  shipmentLines: domainObj.shipmentLines.map(
    shippableOrderPlacedDtoFromShippableOrderLine
  ),
  pdf: domainObj.pdf,
});

//===============================================
// DTO for BillableOrderPlaced event
//===============================================

// Event to send to billing context
export type BillableOrderPlacedDto = {
  orderId: string;
  billingAddress: AddressDto;
  amountToBill: number;
};

// Convert a BillableOrderPlaced object into the corresponding DTO.
// Used when exporting from the domain to the outside world.
export const billableOrderPlacedDtoFromDomain = (
  domainObj: BillableOrderPlaced
): BillableOrderPlacedDto => ({
  orderId: domainObj.orderId.value,
  billingAddress: fromAddress(domainObj.billingAddress),
  amountToBill: domainObj.amountToBill.value,
});

//===============================================
// DTO for OrderAcknowledgmentSent event
//===============================================

// Event to send to other bounded contexts
export type OrderAcknowledgementSentDto = {
  orderId: string;
  emailAddress: string;
};

// Convert a OrderAcknowledgmentSent object into the corresponding DTO.
// Used when exporting from the domain to the outside world.
export const orderAcknowledgementSentDtoFromDomain = (
  domainObj: OrderAcknowledgmentSent
): OrderAcknowledgementSentDto => ({
  orderId: domainObj.orderId.value,
  emailAddress: domainObj.emailAddress.value,
});

//===============================================
// DTO for PlaceOrderEvent
//===============================================

// Use a dictionary representation of a PlaceOrderEvent, suitable for JSON
// See "Serializing Records and Choice Types Using Maps" in chapter 11
export type PlaceOrderEventDto = JsonRecord;

// Convert a PlaceOrderEvent into the corresponding DTO.
// Used when exporting from the domain to the outside world.
export const placeOrderEventDtoFromDomain = (
  domainObj: PlaceOrderEvent
): PlaceOrderEventDto => {
  switch (domainObj._tag) {
    case "ShippableOrderPlaced":
      return {
        shippableOrderPlaced: shippableOrderPlacedDtoFromDomain(domainObj),
      };
    case "BillableOrderPlaced":
      return {
        billableOrderPlaced: billableOrderPlacedDtoFromDomain(domainObj),
      };
    case "OrderAcknowledgementSent":
      return {
        orderAcknowledgementSent:
          orderAcknowledgementSentDtoFromDomain(domainObj),
      };
  }
};

//===============================================
// DTO for PlaceOrderError
//===============================================

export type PlaceOrderErrorDto = {
  code: string;
  message: string;
};

export const placeOrderErrorDtoFromDomain = (
  domainObj: PlaceOrderError
): PlaceOrderErrorDto => {
  if (domainObj instanceof ValidationError) {
    return {
      code: "ValidationError",
      message: domainObj.message,
    };
  }
  if (domainObj instanceof PricingError) {
    return {
      code: "PricingError",
      message: domainObj.message,
    };
  }
  if (domainObj instanceof RemoteServiceError) {
    return {
      code: "RemoteServiceError",
      message: `${domainObj.service.name}: ${domainObj.exception.message} `,
    };
  }
  // should not get here. Typescript not checking guards properly?
  throw new Error("unknown error: unable to convert to data transfer object");
};
