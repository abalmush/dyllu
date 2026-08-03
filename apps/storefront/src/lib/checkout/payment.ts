const PAY_ON_DELIVERY_PROVIDER_PREFIX = "pp_system_default";

export function isPayOnDeliveryProvider(providerId?: string): boolean {
  return providerId?.startsWith(PAY_ON_DELIVERY_PROVIDER_PREFIX) ?? false;
}

export function findPayOnDeliveryProviderId(
  providers: ReadonlyArray<{ id: string }>
): string | null {
  return (
    providers.find((provider) => isPayOnDeliveryProvider(provider.id))?.id ??
    null
  );
}
