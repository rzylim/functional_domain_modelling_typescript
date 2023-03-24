// ======================================================
// This file contains the JSON API interface to the PlaceOrder workflow
//
// 1) The HttpRequest is turned into a DTO, which is then turned into a Domain object
// 2) The main workflow function is called
// 3) The output is turned into a DTO which is turned into a HttpResponse
// ======================================================

import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";

import { Price } from "./common.simple-types";
import {
  CheckAddressExists,
  CheckProductCodeExists,
  CreateOrderAcknowledgmentLetter,
  GetProductPrice,
  SendOrderAcknowledgment,
} from "./place-order.implementation";

export type JsonString = string;

// Very simplified version!
export type HttpRequest = {
  Action: string;
  Uri: string;
  Body: JsonString;
};

// Very simplified version!
export type HttpResponse = {
  HttpStatusCode: number;
  Body: JsonString;
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

/// This function converts the workflow output into a HttpResponse
// let workflowResultToHttpReponse result =
//     match result with
//     | Ok events ->
//         // turn domain events into dtos
//         let dtos =
//             events
//             |> List.map PlaceOrderEventDto.fromDomain
//             |> List.toArray // arrays are json friendly
//         // and serialize to JSON
//         let json = serializeJson(dtos)
//         let response =
//             {
//             HttpStatusCode = 200
//             Body = json
//             }
//         response
//     | Error err ->
//         // turn domain errors into a dto
//         let dto = err |> PlaceOrderErrorDto.fromDomain
//         // and serialize to JSON
//         let json = serializeJson(dto )
//         let response =
//             {
//             HttpStatusCode = 401
//             Body = json
//             }
//         response

// let placeOrderApi : PlaceOrderApi =
//     fun request ->
//         // following the approach in "A Complete Serialization Pipeline" in chapter 11

//         // start with a string
//         let orderFormJson = request.Body
//         let orderForm = deserializeJson<OrderFormDto>(orderFormJson)
//         // convert to domain object
//         let unvalidatedOrder = orderForm |> OrderFormDto.toUnvalidatedOrder

//         // setup the dependencies. See "Injecting Dependencies" in chapter 9
//         let workflow =
//             Implementation.placeOrder
//                 checkProductExists // dependency
//                 checkAddressExists // dependency
//                 getProductPrice    // dependency
//                 createOrderAcknowledgmentLetter  // dependency
//                 sendOrderAcknowledgment // dependency

//         // now we are in the pure domain
//         let asyncResult = workflow unvalidatedOrder

//         // now convert from the pure domain back to a HttpResponse
//         asyncResult
//         |> Async.map (workflowResultToHttpReponse)
