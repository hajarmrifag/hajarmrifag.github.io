import assert from "node:assert/strict";
import test from "node:test";
import { createRenderInvalidator } from "../studio/src/scene/renderInvalidation.ts";

function harness() {
  let busy = false;
  let disposed = false;
  let renders = 0;
  let nextHandle = 0;
  const frames = new Map();
  const cancelled = [];
  const invalidator = createRenderInvalidator({
    schedule(callback) {
      const handle = ++nextHandle;
      frames.set(handle, callback);
      return handle;
    },
    cancel(handle) {
      cancelled.push(handle);
      frames.delete(handle);
    },
    render() {
      renders += 1;
    },
    isBusy: () => busy,
    isDisposed: () => disposed,
  });
  return {
    invalidator,
    frames,
    cancelled,
    get renders() { return renders; },
    set busy(value) { busy = value; },
    set disposed(value) { disposed = value; },
    flush() {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback();
    },
  };
}

test("coalesces repeated idle invalidations into one render", () => {
  const subject = harness();
  subject.invalidator.request();
  subject.invalidator.request();
  subject.invalidator.request();
  assert.equal(subject.frames.size, 1);
  subject.flush();
  assert.equal(subject.renders, 1);

  subject.invalidator.request();
  subject.flush();
  assert.equal(subject.renders, 2);
});

test("lets an active camera loop own rendering", () => {
  const subject = harness();
  subject.busy = true;
  subject.invalidator.request();
  assert.equal(subject.frames.size, 0);
  assert.equal(subject.renders, 0);
});

test("skips an invalidation frame when animation starts before it runs", () => {
  const subject = harness();
  subject.invalidator.request();
  subject.busy = true;
  subject.flush();
  assert.equal(subject.renders, 0);
});

test("cancels a pending frame during disposal", () => {
  const subject = harness();
  subject.invalidator.request();
  subject.disposed = true;
  subject.invalidator.cancel();
  assert.deepEqual(subject.cancelled, [1]);
  subject.flush();
  subject.invalidator.request();
  assert.equal(subject.frames.size, 0);
  assert.equal(subject.renders, 0);
});
