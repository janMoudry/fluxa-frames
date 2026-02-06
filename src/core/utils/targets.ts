import type { FramesTarget } from "../types";

export function getTargets(targets: FramesTarget, win: Window): Window[] {
	if (Array.isArray(targets)) return targets.filter(Boolean);

	const set = new Set<Window>();

	const add = (candidate: Window | null | undefined) => {
		if (candidate && candidate !== win) set.add(candidate);
	};

	if (targets === "parent" || targets === "all") add(win.parent);
	if (targets === "top" || targets === "all") add(win.top);
	if (targets === "opener" || targets === "all") add(win.opener);

	if (targets === "children" || targets === "all") {
		for (let i = 0; i < win.frames.length; i += 1) {
			add(win.frames[i]);
		}
	}

	return Array.from(set);
}
