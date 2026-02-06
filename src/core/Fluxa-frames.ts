import type {
	FluxaEmitFn,
	FluxaEventMap,
	FluxaPlugin,
} from "@moudrey/fluxa-core";

import {
	DEFAULT_CHANNEL,
	DEFAULT_MAX_HOPS,
	PROTOCOL_VERSION,
} from "./constants";
import type { FramesEnvelope, FramesPluginOptions } from "./types";
import { isBrowser } from "./utils/browser";
import { defaultDeserialize, normalizeMeta } from "./utils/envelope";
import { createMessageId } from "./utils/id";
import { createSeenTracker } from "./utils/seen";
import { getTargets } from "./utils/targets";

export function framesPlugin<Events extends FluxaEventMap = FluxaEventMap>(
	options: FramesPluginOptions<Events> = {},
): FluxaPlugin<Events> {
	const channel = options.channel ?? DEFAULT_CHANNEL;
	const direction = options.direction ?? "both";
	const targets = options.targets ?? "parent";
	const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS;
	const serialize =
		options.serialize ?? ((envelope: FramesEnvelope) => envelope);
	const deserialize = options.deserialize ?? defaultDeserialize;
	const targetOrigin = options.targetOrigin ?? "*";
	const allowedOrigins = options.allowedOrigins;
	const filter = options.filter;

	const { hasSeen, markSeen } = createSeenTracker();
	let contextId = "";
	let emitLocal: FluxaEmitFn<Events> | null = null;
	let teardown: (() => void) | null = null;

	return {
		setup(ctx) {
			contextId = ctx.contextId;
			emitLocal = ctx.emitLocal;

			if (!isBrowser() || direction === "out") return;

			const handler = (event: MessageEvent) => {
				if (!emitLocal) return;
				if (allowedOrigins && !allowedOrigins.includes(event.origin))
					return;

				const envelope = deserialize(event.data);
				if (!envelope) return;
				if (envelope.channel !== channel) return;
				if (envelope.sourceContextId === contextId) return;

				if (hasSeen(envelope.messageId)) return;
				markSeen(envelope.messageId);

				const baseMeta = normalizeMeta(envelope.meta);
				const path = baseMeta.path ? [...baseMeta.path] : [];
				if (path.includes(contextId)) return;
				if (maxHops !== undefined && path.length >= maxHops) return;
				path.push(contextId);

				const nextMeta = { ...baseMeta, path };
				const eventKey = envelope.event as keyof Events;

				if (filter && !filter(eventKey, nextMeta)) return;

				emitLocal(
					eventKey,
					envelope.data as Events[keyof Events],
					nextMeta,
				);
			};

			window.addEventListener("message", handler);
			teardown = () => {
				window.removeEventListener("message", handler);
			};
		},
		onEmit(event, data, meta) {
			if (!isBrowser() || direction === "in") return;
			if (filter && !filter(event, meta)) return;

			const path = Array.isArray(meta.path) ? meta.path : [];
			if (maxHops !== undefined && path.length >= maxHops) return;

			const envelope: FramesEnvelope = {
				type: "fluxa",
				v: PROTOCOL_VERSION,
				channel,
				event: String(event),
				data,
				meta,
				sourceContextId: contextId,
				messageId: createMessageId(),
			};

			const payload = serialize(envelope);
			const targetsList = getTargets(targets, window);

			for (const target of targetsList) {
				const origin =
					typeof targetOrigin === "function"
						? targetOrigin(target)
						: targetOrigin;
				try {
					target.postMessage(payload, origin);
				} catch {
					// Ignore unreachable targets.
				}
			}
		},
		onDestroy() {
			teardown?.();
			teardown = null;
		},
	};
}
