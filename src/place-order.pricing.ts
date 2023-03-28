// Move all procing logic into its own module,
// as it will likely get complicated!

import { ProductCode } from "./common.simple-types";

import {
  GetPricingFunction,
  GetProductPrice,
  GetPromotionPrices,
  GetStandardPrices,
  PricingMethod,
  PromotionCode,
} from "./place-order.internal-types";

// Create a pricing method given a promotionCode on the unvalidated order form
// If null -> Standard otherwise wrap in PromotionCode
export const createPricingMethod = (promotionCode: string): PricingMethod =>
  promotionCode.trim()
    ? "Standard"
    : { _tag: "PromotionCode", value: promotionCode };

export const getPricingFunction =
  (standardPrices: GetStandardPrices) =>
  (promoPrices: GetPromotionPrices): GetPricingFunction => {
    // the original pricing function
    // cache the standard prices
    // return the lookup function
    const getStandardPrice: GetProductPrice = standardPrices();

    // the promotional pricing function
    const getPromotionPrice = (
      promotionCode: PromotionCode
    ): GetProductPrice => {
      // cache the promotional prices
      const getPromotionPrice = promoPrices(promotionCode);
      // return the lookup function
      return (productCode: ProductCode) => {
        const price = getPromotionPrice(productCode);
        switch (price._tag) {
          case "Some":
            // found in promotional prices
            return price.value;
          case "None":
            // not found in promotional prices
            // so use standard price
            return getStandardPrice(productCode);
        }
      };
    };

    // return a function that conforms to GetPricingFunction
    return (pricingMethod: PricingMethod) => {
      switch (pricingMethod) {
        case "Standard":
          return getStandardPrice;
        default:
          return getPromotionPrice(pricingMethod);
      }
    };
  };
