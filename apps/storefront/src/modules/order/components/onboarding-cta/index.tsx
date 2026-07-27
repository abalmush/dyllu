"use client";

import { resetOnboardingState } from "@lib/data/onboarding";
import { Button, Container, Text } from "@lib/ui-compat";

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  return (
    <Container className="bg-ui-bg-subtle h-full w-full max-w-4xl">
      <div className="center flex flex-col gap-y-4 p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">
          Comanda de test a fost creată cu succes! 🎉
        </Text>
        <Text className="text-small-regular text-ui-fg-subtle">
          Acum poți finaliza configurarea magazinului din panoul de
          administrare.
        </Text>
        <Button
          className="w-fit"
          size="xlarge"
          onClick={() => resetOnboardingState(orderId)}
        >
          Finalizează configurarea
        </Button>
      </div>
    </Container>
  );
};

export default OnboardingCta;
