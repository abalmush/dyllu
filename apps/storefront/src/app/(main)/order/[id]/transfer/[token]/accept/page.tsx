import { acceptTransferRequest } from "@lib/data/orders";
import { Heading, Text } from "@lib/ui-compat";
import TransferImage from "@modules/order/components/transfer-image";

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string };
}) {
  const { id, token } = params;

  const { success, error } = await acceptTransferRequest(id, token);

  return (
    <div className="mx-auto mb-20 mt-10 flex w-2/5 flex-col items-start gap-y-4">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        {success && (
          <>
            <Heading level="h1" className="text-xl text-zinc-900">
              Transfer realizat
            </Heading>
            <Text className="text-zinc-600">
              Comanda {id} a fost transferată cu succes către noul proprietar.
            </Text>
          </>
        )}
        {!success && (
          <>
            <Text className="text-zinc-600">
              A apărut o eroare la acceptarea transferului. Te rugăm să încerci
              din nou.
            </Text>
            {error && (
              <Text className="text-red-500">Mesaj eroare: {error}</Text>
            )}
          </>
        )}
      </div>
    </div>
  );
}
