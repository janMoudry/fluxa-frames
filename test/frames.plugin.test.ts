// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { framesPlugin } from "../src";

type Events = {
	"test:event": { value: number };
};

const baseMeta = {
	id: "meta-1",
	timestamp: 1,
	path: [] as string[],
};

describe("framesPlugin", () => {
	let emitLocal: ReturnType<typeof vi.fn>;
	let cleanup: Array<() => void>;

	beforeEach(() => {
		emitLocal = vi.fn();
		cleanup = [];
	});

	afterEach(() => {
		for (const run of cleanup) run();
		cleanup = [];
		emitLocal.mockClear();
	});

	it("posts outbound messages to targets", () => {
		const postMessage = vi.fn();
		const target = { postMessage } as unknown as Window;

		const plugin = framesPlugin<Events>({
			channel: "chan",
			targets: [target],
			targetOrigin: "https://target.test",
		});

		plugin.setup?.({ contextId: "ctx", emitLocal });
		cleanup.push(() => plugin.onDestroy?.());

		plugin.onEmit?.("test:event", { value: 42 }, baseMeta, emitLocal);

		expect(postMessage).toHaveBeenCalledTimes(1);
		const [payload, origin] = postMessage.mock.calls[0];
		expect(origin).toBe("https://target.test");
		expect(payload).toMatchObject({
			type: "fluxa",
			v: 1,
			channel: "chan",
			event: "test:event",
			meta: baseMeta,
			sourceContextId: "ctx",
		});
	});

	it("accepts inbound messages only from allowed origins", () => {
		const plugin = framesPlugin<Events>({
			channel: "chan",
			allowedOrigins: ["https://allowed.test"],
		});

		plugin.setup?.({ contextId: "ctx", emitLocal });
		cleanup.push(() => plugin.onDestroy?.());

		const envelope = {
			type: "fluxa",
			v: 1,
			channel: "chan",
			event: "test:event",
			data: { value: 1 },
			meta: { id: "m1", timestamp: 1, path: [] },
			sourceContextId: "remote",
			messageId: "msg-1",
		};

		window.dispatchEvent(
			new MessageEvent("message", {
				data: envelope,
				origin: "https://blocked.test",
			}),
		);

		window.dispatchEvent(
			new MessageEvent("message", {
				data: envelope,
				origin: "https://allowed.test",
			}),
		);

		expect(emitLocal).toHaveBeenCalledTimes(1);
	});

	it("deduplicates inbound messages by messageId", () => {
		const plugin = framesPlugin<Events>({
			channel: "chan",
		});

		plugin.setup?.({ contextId: "ctx", emitLocal });
		cleanup.push(() => plugin.onDestroy?.());

		const envelope = {
			type: "fluxa",
			v: 1,
			channel: "chan",
			event: "test:event",
			data: { value: 2 },
			meta: { id: "m2", timestamp: 2, path: [] },
			sourceContextId: "remote",
			messageId: "msg-dup",
		};

		window.dispatchEvent(
			new MessageEvent("message", {
				data: envelope,
				origin: "https://x.test",
			}),
		);
		window.dispatchEvent(
			new MessageEvent("message", {
				data: envelope,
				origin: "https://x.test",
			}),
		);

		expect(emitLocal).toHaveBeenCalledTimes(1);
	});

	it("blocks inbound messages that exceed maxHops or include current contextId", () => {
		const plugin = framesPlugin<Events>({
			channel: "chan",
			maxHops: 1,
		});

		plugin.setup?.({ contextId: "ctx", emitLocal });
		cleanup.push(() => plugin.onDestroy?.());

		const withPath = {
			type: "fluxa",
			v: 1,
			channel: "chan",
			event: "test:event",
			data: { value: 3 },
			meta: { id: "m3", timestamp: 3, path: ["ctx"] },
			sourceContextId: "remote",
			messageId: "msg-path",
		};

		const tooDeep = {
			type: "fluxa",
			v: 1,
			channel: "chan",
			event: "test:event",
			data: { value: 4 },
			meta: { id: "m4", timestamp: 4, path: ["a"] },
			sourceContextId: "remote",
			messageId: "msg-deep",
		};

		window.dispatchEvent(
			new MessageEvent("message", {
				data: withPath,
				origin: "https://x.test",
			}),
		);
		window.dispatchEvent(
			new MessageEvent("message", {
				data: tooDeep,
				origin: "https://x.test",
			}),
		);

		expect(emitLocal).toHaveBeenCalledTimes(0);
	});

	it("respects filter for inbound and outbound", () => {
		const postMessage = vi.fn();
		const target = { postMessage } as unknown as Window;
		const filter = vi.fn(() => false);

		const plugin = framesPlugin<Events>({
			channel: "chan",
			targets: [target],
			filter,
		});

		plugin.setup?.({ contextId: "ctx", emitLocal });
		cleanup.push(() => plugin.onDestroy?.());

		plugin.onEmit?.("test:event", { value: 5 }, baseMeta, emitLocal);

		const envelope = {
			type: "fluxa",
			v: 1,
			channel: "chan",
			event: "test:event",
			data: { value: 5 },
			meta: { id: "m5", timestamp: 5, path: [] },
			sourceContextId: "remote",
			messageId: "msg-filter",
		};

		window.dispatchEvent(
			new MessageEvent("message", {
				data: envelope,
				origin: "https://x.test",
			}),
		);

		expect(postMessage).toHaveBeenCalledTimes(0);
		expect(emitLocal).toHaveBeenCalledTimes(0);
		expect(filter).toHaveBeenCalled();
	});
});
