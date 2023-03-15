// ==================================
// Common compound types used throughout the OrderTaking domain
//
// Includes: customers, addresses, etc.
// Plus common errors.
//
// ==================================

import * as O from "fp-ts/lib/Option";

import { EmailAddress, String50, ZipCode } from "./common.simple-types";

// ==================================
// Customer-related types
// ==================================

export type PersonalName = {
  FirstName: String50;
  LastName: String50;
};

export type CustomerInfo = {
  Name: PersonalName;
  EmailAddress: EmailAddress;
};

// ==================================
// Address-related
// ==================================

export type Address = {
  AddressLine1: String50;
  AddressLine2: O.Option<String50>;
  AddressLine3: O.Option<String50>;
  AddressLine4: O.Option<String50>;
  City: String50;
  ZipCode: ZipCode;
};

// ==================================
// Product-related types
// ==================================

// Note that the definition of a Product is in a different bounded
// context, and in this context, products are only represented by a ProductCode
// (see the SimpleTypes module).
