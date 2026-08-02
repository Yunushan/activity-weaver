import type { ActivityEnvelope, PresenceActivity } from "@activityweaver/protocol";
import type { Logger } from "./logger.js";

type ActivityChange = (activity: PresenceActivity | undefined) => Promise<void> | void;

export class ActivityRouter {
  private readonly entries = new Map<string, ActivityEnvelope>();
  private flushTimer: NodeJS.Timeout | undefined;
  private flushInProgress = false;
  private flushAgain = false;
  private currentKey: string | undefined;
  private currentObservedAt = 0;

  public constructor(
    private readonly onChange: ActivityChange,
    private readonly logger: Logger
  ) {}

  public upsert(envelope: ActivityEnvelope): void {
    this.entries.set(envelope.source.id, envelope);
    this.scheduleFlush();
  }

  public clear(sourceId: string): void {
    this.entries.delete(sourceId);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, 150);
  }

  private flush(): void {
    if (this.flushInProgress) {
      this.flushAgain = true;
      return;
    }
    this.flushInProgress = true;
    void this.applyCurrent().catch((error: unknown) => {
      this.logger.error("Failed to update Discord presence", error instanceof Error ? error.message : error);
    }).finally(() => {
      this.flushInProgress = false;
      if (this.flushAgain) {
        this.flushAgain = false;
        this.scheduleFlush();
      }
    });
  }

  private async applyCurrent(): Promise<void> {
    const latest = [...this.entries.entries()]
      .sort((left, right) => right[1].observedAt - left[1].observedAt)[0];
    const nextKey = latest?.[0];
    if (nextKey === this.currentKey && latest && latest[1].observedAt <= this.currentObservedAt) return;

    this.currentKey = nextKey;
    if (!latest) {
      this.currentObservedAt = 0;
      this.logger.debug("Clearing Discord presence because no tabs are active");
      await this.onChange(undefined);
      return;
    }

    this.currentObservedAt = latest[1].observedAt;
    this.logger.debug("Selected tab activity", {
      sourceId: latest[1].source.id,
      hostname: latest[1].source.hostname
    });
    await this.onChange(latest[1].activity);
  }
}
