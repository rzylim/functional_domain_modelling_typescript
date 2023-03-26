// ======================================================
// This file contains the JSON API interface to the PlaceOrder workflow
//
// 1) The HttpRequest is turned into a DTO, which is then turned into a Domain object
// 2) The main workflow function is called
// 3) The output is turned into a DTO which is turned into a HttpResponse
// ======================================================

import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";

import { Price } from "./common.simple-types";
import { PlaceOrderError, PlaceOrderEvent } from "./place-order.public-types";
import {
  CheckAddressExists,
  CheckProductCodeExists,
  CreateOrderAcknowledgmentLetter,
  GetProductPrice,
  placeOrder,
  SendOrderAcknowledgment,
} from "./place-order.implementation";
import {
  OrderFormDto,
  placeOrderErrorDtoFromDomain,
  placeOrderEventDtoFromDomain,
  toUnvalidatedOrder,
} from "./place-order.dto";

export type JsonString = string;

// Very simplified version!
export type HttpRequest = {
  action: string;
  uri: string;
  body: JsonString;
};

// Very simplified version!
export type HttpResponse = {
  httpStatusCode: number;
  body: JsonString;
};

// An API takes a HttpRequest as input and returns a async response
export type PlaceOrderApi = (req: HttpRequest) => T.Task<HttpResponse>;

// =============================
// JSON serialization
// =============================

export const serializeJson = JSON.stringify;
export const deserializeJson = JSON.parse;

// =============================
// Implementation
// =============================

// setup dummy dependencies

export const checkProductExists: CheckProductCodeExists = (_code) => true; // dummy implementation

export const checkAddressExists: CheckAddressExists = (unvalidatedAddress) =>
  TE.right({
    _tag: "CheckedAddress",
    value: unvalidatedAddress,
  }); // dummy implementation

export const getProductPrice: GetProductPrice = (_code) =>
  Price.unsafeCreate(1_000_000); // dummy implementation

export const createOrderAcknowledgmentLetter: CreateOrderAcknowledgmentLetter =
  (_pricedOrder) => ({ _tag: "HtmlString", value: "some text" }); // dummy implementation

export const sendOrderAcknowledgment: SendOrderAcknowledgment = (
  _orderAcknowledgemenht
) => "Sent"; // dummy implementation

// -------------------------------
// workflow
// -------------------------------

// This function converts the workflow output into a HttpResponse
export const workflowResultToHttpReponse = (
  result: E.Either<PlaceOrderError, PlaceOrderEvent[]>
): { httpStatusCode: number; body: JsonString } =>
  E.match(
    (placeOrderError: PlaceOrderError) => ({
      httpStatusCode: 401,
      body: JSON.stringify(placeOrderErrorDtoFromDomain(placeOrderError)),
    }),
    (events: PlaceOrderEvent[]) => ({
      httpStatusCode: 200,
      body: events.map(placeOrderEventDtoFromDomain).toString(),
    })
  )(result);

export const placeOrderApi: PlaceOrderApi = (request) => {
  // following the approach in "A Complete Serialization Pipeline" in chapter 11
  // start with a string
  const orderFormJson = request.body;
  const orderForm: OrderFormDto = JSON.parse(orderFormJson);
  // convert to domain object
  const unvalidatedOrder = toUnvalidatedOrder(orderForm);

  // setup the dependencies. See "Injecting Dependencies" in chapter 9
  const workflow = placeOrder(checkProductExists)(checkAddressExists)(
    getProductPrice
  )(createOrderAcknowledgmentLetter)(sendOrderAcknowledgment);

  // now we are in the pure domain
  const asyncResult = workflow(unvalidatedOrder);

  // now convert from the pure domain back to a HttpResponse
  return T.map(workflowResultToHttpReponse)(asyncResult);
};
