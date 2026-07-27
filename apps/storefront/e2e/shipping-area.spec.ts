import { expect, test } from "@playwright/test";

import {
  canonicalizeShippingAddress,
  DELIVERY_AREAS,
  getDeliveryArea,
  isChisinauCityName,
  isShippingOptionAllowedForAddress,
} from "../src/lib/shipping/delivery-area";

test.describe("shipping delivery-area rules", () => {
  test("recognizes Chișinău and all five city sectors", () => {
    for (const city of [
      "Chișinău",
      "Chisinau",
      "mun. Chisinau",
      "Botanica",
      "sector Buiucani",
      "Centru",
      "Ciocana, Chișinău",
      "Sectorul Rîșcani",
    ]) {
      expect(isChisinauCityName(city), city).toBe(true);
    }
  });

  test("does not classify municipality suburbs or nearby cities as city delivery", () => {
    for (const city of [
      "Durlești",
      "Codru",
      "Cricova",
      "Ialoveni",
      "Stăuceni",
      "Rîșcani",
    ]) {
      expect(getDeliveryArea({ country_code: "md", city }), city).toBe(
        DELIVERY_AREAS.OUTSIDE_CHISINAU
      );
    }
  });

  test("canonicalizes only recognized Moldovan city addresses", () => {
    expect(
      canonicalizeShippingAddress({
        country_code: "MD",
        city: "Botanica",
        province: "",
      })
    ).toEqual({
      country_code: "MD",
      city: "Chișinău",
      province: "cu",
    });

    expect(
      canonicalizeShippingAddress({
        country_code: "md",
        city: "Durlești",
        province: "Chișinău",
      })
    ).toEqual({
      country_code: "md",
      city: "Durlești",
      province: "Chișinău",
    });
  });

  test("allows only the delivery option tagged for the address area", () => {
    const cityOption = { data: { delivery_area: "chisinau" } };
    const outsideOption = { data: { delivery_area: "outside_chisinau" } };
    const pickupOption = { data: {} };
    const cityAddress = { country_code: "md", city: "Chișinău" };

    expect(isShippingOptionAllowedForAddress(cityOption, cityAddress)).toBe(
      true
    );
    expect(isShippingOptionAllowedForAddress(outsideOption, cityAddress)).toBe(
      false
    );
    expect(isShippingOptionAllowedForAddress(pickupOption, cityAddress)).toBe(
      true
    );
  });
});
