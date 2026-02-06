import type { FluxaEventMap, FluxaEventMeta } from "@moudrey/fluxa-core";

export type FramesDirection = "in" | "out" | "both";

export type FramesTarget =
	| "parent"
	| "top"
	| "opener"
	| "children"
	| "all"
	| Window[];

export type FramesEnvelope = {
	type: "fluxa";
	v: 1;
	channel: string;
	event: string;
	data: unknown;
	meta: FluxaEventMeta;
	sourceContextId: string;
	messageId: string;
};

export type FramesPluginOptions<Events extends FluxaEventMap = FluxaEventMap> =
	{
		channel?: string;
		allowedOrigins?: string[];
		targets?: FramesTarget;
		direction?: FramesDirection;
		filter?: <K extends keyof Events>(
			event: K,
			meta: FluxaEventMeta,
		) => boolean;
		maxHops?: number;
		serialize?: (envelope: FramesEnvelope) => unknown;
		deserialize?: (data: unknown) => FramesEnvelope | null;
		targetOrigin?: string | ((target: Window) => string);
	};
