interface RenderInvalidatorOptions {
  schedule(callback: () => void): number;
  cancel(handle: number): void;
  render(): void;
  isBusy(): boolean;
  isDisposed(): boolean;
}

export interface RenderInvalidator {
  request(): void;
  cancel(): void;
}

/** Coalesces idle-scene changes into one frame without extending active motion. */
export function createRenderInvalidator(options: RenderInvalidatorOptions): RenderInvalidator {
  let pending: number | null = null;

  return {
    request() {
      if (pending !== null || options.isDisposed() || options.isBusy()) return;
      pending = options.schedule(() => {
        pending = null;
        if (options.isDisposed() || options.isBusy()) return;
        options.render();
      });
    },
    cancel() {
      if (pending === null) return;
      options.cancel(pending);
      pending = null;
    },
  };
}
