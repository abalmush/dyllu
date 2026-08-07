import { defineRouteConfig } from "@medusajs/admin-sdk";
import { MagnifyingGlass } from "@medusajs/icons";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";

async function triggerSync(): Promise<{ success: boolean }> {
  const response = await fetch("/admin/algolia/sync", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Sync request failed");
  return response.json();
}

const AlgoliaSettingsPage = () => {
  const mutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => toast.success("Algolia sync complete"),
    onError: () => toast.error("Algolia sync failed — check backend logs"),
  });

  return (
    <Container>
      <Heading level="h1">Algolia search</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Reindexes only products changed since the last sync (runs automatically
        once a day). Use this to force an immediate sync after an urgent catalog
        change.
      </Text>
      <Button
        className="mt-4"
        onClick={() => mutation.mutate()}
        isLoading={mutation.isPending}
      >
        Sync now
      </Button>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Algolia",
  icon: MagnifyingGlass,
});

export default AlgoliaSettingsPage;
