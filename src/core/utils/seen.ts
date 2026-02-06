import { MAX_SEEN, SEEN_TTL_MS } from "../constants";

export function createSeenTracker() {
	const seen = new Map<string, number>();

	const markSeen = (messageId: string) => {
		const now = Date.now();
		seen.set(messageId, now);
		if (seen.size <= MAX_SEEN) return;
		for (const [id, timestamp] of seen) {
			if (now - timestamp > SEEN_TTL_MS) seen.delete(id);
		}
	};

	const hasSeen = (messageId: string) => seen.has(messageId);

	return { markSeen, hasSeen };
}
