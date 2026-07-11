import { Heading, Text } from "@lib/ui-compat";
import TransferActions from "@modules/order/components/transfer-actions";
import TransferImage from "@modules/order/components/transfer-image";

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string };
}) {
  const { id, token } = params;

  return (
    <div className="mx-auto mb-20 mt-10 flex w-2/5 flex-col items-start gap-y-4">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          Cerere de transfer pentru comanda {id}
        </Heading>
        <Text className="text-zinc-600">
          Ai primit o solicitare de transfer pentru comanda {id}. Dacă ești de
          acord, poți aproba transferul folosind butonul de mai jos.
        </Text>
        <div className="h-px w-full bg-zinc-200" />
        <Text className="text-zinc-600">
          Dacă accepți, noul proprietar va prelua toate responsabilitățile și
          permisiunile asociate acestei comenzi.
        </Text>
        <Text className="text-zinc-600">
          Dacă nu recunoști această solicitare sau vrei să păstrezi comanda în
          contul tău, nu este necesară nicio altă acțiune.
        </Text>
        <div className="h-px w-full bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  );
}
