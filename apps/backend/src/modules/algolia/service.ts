import { MedusaService } from "@medusajs/framework/utils";

import { AlgoliaSyncState } from "./models";

class AlgoliaModuleService extends MedusaService({
  AlgoliaSyncState,
}) {
  async getLastSyncedAt(): Promise<Date | null> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    return state?.last_synced_at ?? null;
  }

  async recordSyncCompleted(at: Date): Promise<void> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    if (state) {
      await this.updateAlgoliaSyncStates({
        id: state.id,
        last_synced_at: at,
      });
    } else {
      await this.createAlgoliaSyncStates({ last_synced_at: at });
    }
  }
}

export default AlgoliaModuleService;
