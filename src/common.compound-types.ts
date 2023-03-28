// ==================================
// Common compound types used throughout the OrderTaking domain
//
// Includes: customers, addresses, etc.
// Plus common errors.
//
// ==================================

import * as O from "fp-ts/Option";

import {
  EmailAddress,
  String50,
  UsStateCode,
  VipStatus,
  ZipCode,
} from "./common.simple-types";

// ==================================
// Customer-related types
// ==================================

export type PersonalName = {
  _tag: "PersonalName";
  firstName: String50;
  lastName: String50;
};

export type CustomerInfo = {
  _tag: "CustomerInfo";
  name: PersonalName;
  emailAddress: EmailAddress;
  vipStatus: VipStatus;
};

// ==================================
// Address-related
// ==================================

export type Address = {
  _tag: "Address";
  addressLine1: String50;
  addressLine2: O.Option<String50>;
  addressLine3: O.Option<String50>;
  addressLine4: O.Option<String50>;
  city: String50;
  zipCode: ZipCode;
  state: UsStateCode;
  country: String50;
};

// ==================================
// Product-related types
// ==================================

// Note that the definition of a Product is in a different bounded
// context, and in this context, products are only represented by a ProductCode
// (see the SimpleTypes module).
