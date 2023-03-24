import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";

/// Constrained to be 50 chars or less, not null
declare const validString50: unique symbol; // do not export! keep private so that instances have to be created via the provided create function that enforces checks.
export type String50 = {
  [validString50]: true; // restricts construction to via constructor provided.
  readonly _tag: "String50"; // for matching in discriminated unions.
  readonly value: string;
};
const constructString50 = (value: string): String50 => ({
  [validString50]: true,
  _tag: "String50",
  value,
});
export const String50 = {
  // Create an String50 from a string
  // Return Error if input is null, empty, or length > 50
  create: (fieldName: string, str: string) =>
    ConstrainedType.createString(fieldName, constructString50, 50, str),
  // Create an String50 from a string
  // Return None if input is null, empty.
  // Return error if length > maxLen
  // Return Some if the input is valid
  createOption: (fieldName: string, str: string) =>
    ConstrainedType.createStringOption(fieldName, constructString50, 50, str),
};
// not using class as constructor cannot be protected
// while still using generic utilities like ConstrainedType.
// constructor also can't return E.Either.
// export class String50 {
//   [validString50]: true;
//   readonly _tag: "String50";
//   readonly _value: string;

//   private constructor(value: string) {
//     this._value = value;
//   }

//   value() {
//     return this._value;
//   }
//   static create(fieldName: string, str: string) {
//     return pipe(
//       ConstrainedType.createStringClass(fieldName, 50, str),
//       map(new String50()) // how to pipe into constructor?
//     );
//   }
// }

// An email address
declare const validEmailAddress: unique symbol;
export type EmailAddress = {
  [validEmailAddress]: true;
  readonly _tag: "EmailAddress";
  readonly value: string;
};
const constructEmailAddress = (value: string): EmailAddress => ({
  [validEmailAddress]: true,
  _tag: "EmailAddress",
  value,
});
export const EmailAddress = {
  // Create an EmailAddress from a string
  // Return Error if input is null, empty, or doesn't have an "@" in it
  create: (fieldName: string, str: string) =>
    ConstrainedType.createLike(fieldName, constructEmailAddress, /.+@.+/, str),
};

// A zip code
declare const validZipCode: unique symbol;
export type ZipCode = {
  [validZipCode]: true;
  readonly _tag: "ZipCode";
  readonly value: string;
};
const constructZipCode = (value: string): ZipCode => ({
  [validZipCode]: true,
  _tag: "ZipCode",
  value,
});
export const ZipCode = {
  // Create a ZipCode from a string
  // Return Error if input is null, empty, or doesn't have 5 digits
  create: (fieldName: string, str: string) =>
    ConstrainedType.createLike(fieldName, constructZipCode, /\d{5}/, str),
};

// An Id for Orders. Constrained to be a non-empty string < 10 chars
declare const validOrderId: unique symbol;
export type OrderId = {
  [validOrderId]: true;
  readonly _tag: "OrderId";
  readonly value: string;
};
const constructOrderId = (value: string): OrderId => ({
  [validOrderId]: true,
  _tag: "OrderId",
  value,
});
export const OrderId = {
  // Create an OrderId from a string
  // Return Error if input is null, empty, or length > 50
  create: (fieldName: string, str: string) =>
    ConstrainedType.createString(fieldName, constructOrderId, 50, str),
};

// An Id for OrderLines. Constrained to be a non-empty string < 10 chars
declare const validOrderLineId: unique symbol;
export type OrderLineId = {
  [validOrderLineId]: true;
  readonly _tag: "OrderLineId";
  readonly value: string;
};
const constructOrderLineId = (value: string): OrderLineId => ({
  [validOrderLineId]: true,
  _tag: "OrderLineId",
  value,
});
export const OrderLineId = {
  // Create an OrderLineId from a string
  // Return Error if input is null, empty, or length > 50
  create: (fieldName: string, str: string) =>
    ConstrainedType.createString(fieldName, constructOrderLineId, 50, str),
};

// The codes for Widgets start with a "W" and then four digits
declare const validWidgetCode: unique symbol;
export type WidgetCode = {
  [validWidgetCode]: true;
  readonly _tag: "WidgetCode";
  readonly value: string;
};
const constructWidgetCode = (value: string): WidgetCode => ({
  [validWidgetCode]: true,
  _tag: "WidgetCode",
  value,
});
export const WidgetCode = {
  // Create an WidgetCode from a string
  // Return Error if input is null. empty, or not matching pattern
  create: (fieldName: string, code: string) =>
    ConstrainedType.createLike(
      fieldName,
      constructWidgetCode,
      /^W\d{4}$/,
      code
    ),
};

// The codes for Gizmos start with a "G" and then three digits.
declare const validGizmoCode: unique symbol;
export type GizmoCode = {
  [validGizmoCode]: true;
  readonly _tag: "GizmoCode";
  readonly value: string;
};
const constructGizmoCode = (value: string): GizmoCode => ({
  [validGizmoCode]: true,
  _tag: "GizmoCode",
  value,
});
export const GizmoCode = {
  // Create an GizmoCode from a string
  // Return Error if input is null, empty, or not matching pattern
  create: (fieldName: string, code: string) =>
    ConstrainedType.createLike(fieldName, constructGizmoCode, /^G\d{3}$/, code),
};

export class ProductCodeError extends Error {
  _tag = "ProductCodeError";
  name = "ProductCodeError";
  fieldName: string;

  constructor(fieldName: string, message: string) {
    super(message);
    this.fieldName = fieldName;
  }
}

// A ProductCode is E.either a Widget or a Gizmo
export type ProductCode = WidgetCode | GizmoCode;
export const ProductCode = {
  // Return the string value inside a ProductCode
  value: (code: ProductCode) => {
    switch (code._tag) {
      case "WidgetCode":
        return code.value;
      case "GizmoCode":
        return code.value;
    }
  },
  // Create an ProductCode from a string
  // Return Error if input is null, empty, or not matching pattern
  create: (
    fieldName: string,
    code: string
  ): E.Either<ConstrainedTypeError | ProductCodeError, ProductCode> => {
    if (!code)
      return E.left(
        new ProductCodeError(
          fieldName,
          `${fieldName} must not be null or empty`
        )
      );
    if (code.startsWith("W")) return WidgetCode.create(fieldName, code);
    if (code.startsWith("G")) return GizmoCode.create(fieldName, code);
    return E.left(
      new ProductCodeError(
        fieldName,
        `${fieldName}: format not regonised '${code}'`
      )
    );
  },
};

// Constrained to be a integer between 1 and 1000
declare const validUnitQuantity: unique symbol;
export type UnitQuantity = {
  [validUnitQuantity]: true;
  readonly _tag: "UnitQuantity";
  readonly value: number;
};
const constructUnitQuantity = (value: number): UnitQuantity => ({
  [validUnitQuantity]: true,
  _tag: "UnitQuantity",
  value,
});
export const UnitQuantity = {
  // Create a UnitQuantity from a int
  // Return Error if input is not an integer between 1 and 1000
  create: (fieldName: string, v: number) =>
    ConstrainedType.createInt(fieldName, constructUnitQuantity, 1, 1000, v),
};

// Constrained to be a decimal between 0.05 and 100.00
declare const validKilogramQuantity: unique symbol;
export type KilogramQuantity = {
  [validKilogramQuantity]: true;
  readonly _tag: "KilogramQuantity";
  readonly value: number;
};
const constructKilogramQuantity = (value: number): KilogramQuantity => ({
  [validKilogramQuantity]: true,
  _tag: "KilogramQuantity",
  value,
});
export const KilogramQuantity = {
  // Create a KilogramQuantity from a decimal.
  // Return Error if input is not a decimal between 0.05 and 100.00
  create: (fieldName: string, v: number) =>
    ConstrainedType.createDecimal(
      fieldName,
      constructKilogramQuantity,
      0.05,
      100,
      v
    ),
};

// A Quantity is E.either a Unit or a Kilogram
export type OrderQuantity = UnitQuantity | KilogramQuantity;
export const OrderQuantity = {
  // Return the value inside a OrderQuantity
  value: (qty: OrderQuantity) => {
    switch (qty._tag) {
      case "UnitQuantity":
        return qty.value;
      case "KilogramQuantity":
        return qty.value;
    }
  },
  // Create a OrderQuantity from a productCode and quantity
  create: (
    fieldName: string,
    productCode: ProductCode,
    quantity: number
  ): E.Either<ConstrainedTypeError, OrderQuantity> => {
    switch (productCode._tag) {
      case "WidgetCode":
        return UnitQuantity.create(fieldName, quantity);
      case "GizmoCode":
        return KilogramQuantity.create(fieldName, quantity);
    }
  },
};

// Constrained to be a decimal between 0.0 and 1000.00
declare const validPrice: unique symbol;
export type Price = {
  [validPrice]: true;
  _tag: "Price";
  value: number;
};
const constructPrice = (value: number): Price => ({
  [validPrice]: true,
  _tag: "Price",
  value,
});
export const Price = {
  // Create a Price from a decimal.
  // Return Error if input is not a decimal between 0.0 and 1000.00
  create: (v: number) =>
    ConstrainedType.createDecimal("Price", constructPrice, 0, 1000, v),
  // Create a Price from a decimal.
  // Throw an exception if out of bounds. This should only be used if you know the value is valid.
  unsafeCreate: (v: number) => {
    const result = Price.create(v);
    switch (result._tag) {
      case "Right":
        return result.right;
      case "Left":
        throw new Error(
          `Not expecting Price to be out of bounds: ${result.left}`
        );
    }
  },
  // Multiply a Price by a decimal qty.
  // Return Error if new price is out of bounds.
  multiply: (qty: number, p: Price) => Price.create(qty * p.value),
};

// Constrained to be a decimal between 0.0 and 10000.00
declare const validBillingAmount: unique symbol;
export type BillingAmount = {
  [validBillingAmount]: true;
  _tag: "BillingAmount";
  value: number;
};
const constructBillingAmount = (value: number): BillingAmount => ({
  [validBillingAmount]: true,
  _tag: "BillingAmount",
  value,
});
export const BillingAmount = {
  // Create a BillingAmount from a decimal.
  // Return Error if input is not a decimal between 0.0 and 10000.00
  create: (v: number) =>
    ConstrainedType.createDecimal(
      "BillingAmount",
      constructBillingAmount,
      0,
      10000,
      v
    ),
  // Sum a list of prices to make a billing amount
  // Return Error if total is out of bounds
  sumPrices: (prices: Price[]) =>
    BillingAmount.create(prices.reduce((acc, p) => acc + p.value, 0)),
};

// Represents a PDF attachment
export type PdfAttachment = {
  name: string;
  Bytes: ArrayBuffer;
};

// ===============================
// Reusable constructors and getters for constrained types
// ===============================

// export type ConstrainedTypeError = {
//   _tag: "ConstrainedTypeError";
//   fieldName: string;
//   errorDescription: string;
// };

export class ConstrainedTypeError extends Error {
  _tag = "ConstrainedTypeError";
  name = "ConstrainedTypeError";
  fieldName: string;

  constructor(fieldName: string, message: string) {
    super(message);
    this.fieldName = fieldName;
  }
}

/// Useful functions for constrained types
const ConstrainedType = {
  // Create a constrained string using the constructor provided
  // Return Error if input is null, empty, or length > maxLen
  createString: <T>(
    fieldName: string,
    constructor: (...args: any) => T,
    maxLen: number,
    str: string
  ): E.Either<ConstrainedTypeError, T> => {
    if (!str)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be null or empty`
        )
      );
    if (str.length > maxLen)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be more than ${maxLen} chars`
        )
      );
    return E.right(constructor(str));
  },
  // createString, for use with classes. testing.
  createStringClass: (
    fieldName: string,
    maxLen: number,
    str: string
  ): E.Either<ConstrainedTypeError, string> => {
    if (!str)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be null or empty`
        )
      );
    if (str.length > maxLen)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be more than ${maxLen} chars`
        )
      );
    return E.right(str);
  },
  // Create a optional constrained string using the constructor provided
  // Return None if input is null, empty.
  // Return error if length > maxLen
  // Return Some if the input is valid
  createStringOption: <T>(
    fieldName: string,
    constructor: (...args: any) => T,
    maxLen: number,
    str: string
  ): E.Either<ConstrainedTypeError, O.Option<T>> => {
    if (!str) return E.right(O.none);
    if (str.length > maxLen)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be more than ${maxLen} chars`
        )
      );
    return E.right(O.some(constructor(str)));
  },
  /// Create a constrained integer using the constructor provided
  /// Return Error if input is less than minVal or more than maxVal
  createInt: <T>(
    fieldName: string,
    constructor: (...args: any) => T,
    minVal: number,
    maxVal: number,
    i: number
  ): E.Either<ConstrainedTypeError, T> => {
    if (!Number.isInteger(i))
      return E.left(
        new ConstrainedTypeError(fieldName, `${fieldName} must be an integer`)
      );
    if (i < minVal)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be less than ${minVal}`
        )
      );
    if (i > minVal)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be more than ${maxVal}`
        )
      );
    return E.right(constructor(i));
  },
  // Create a constrained decimal using the constructor provided
  // Return Error if input is less than minVal or more than maxVal
  createDecimal: <T>(
    fieldName: string,
    constructor: (...args: any) => T,
    minVal: number,
    maxVal: number,
    i: number
  ): E.Either<ConstrainedTypeError, T> => {
    if (i < minVal)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be less than ${minVal}`
        )
      );
    if (i > minVal)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be more than ${maxVal}`
        )
      );
    return E.right(constructor(i));
  },
  // Create a constrained string using the constructor provided
  // Return Error if input is null. empty, or does not match the regex pattern
  createLike: <T>(
    fieldName: string,
    constructor: (...args: any) => T,
    pattern: RegExp,
    str: string
  ): E.Either<ConstrainedTypeError, T> => {
    if (!str)
      return E.left(
        new ConstrainedTypeError(
          fieldName,
          `${fieldName} must not be null or empty`
        )
      );
    if (pattern.test(str)) return E.right(constructor(str));
    return E.left(
      new ConstrainedTypeError(
        fieldName,
        `${fieldName}: '${str}' must match the pattern '${pattern}'`
      )
    );
  },
};
