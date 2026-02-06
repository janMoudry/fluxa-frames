# Fluxa Frames Plugin

Plugin for Fluxa Core that adds cross-frame communication via `postMessage`.

## Installation

```bash
npm install @moudrey/fluxa-frames @moudrey/fluxa-core
# or
pnpm add @moudrey/fluxa-frames @moudrey/fluxa-core
# or
yarn add @moudrey/fluxa-frames @moudrey/fluxa-core
```

## Usage

```ts
import { Fluxa } from "@moudrey/fluxa-core";
import { framesPlugin } from "@moudrey/fluxa-frames";

type Events = {
  "widget:ready": { id: string };
};

const bus = new Fluxa<Events>({
  plugins: [
    framesPlugin({
      channel: "my-app",
      allowedOrigins: ["https://example.com"],
      targets: "parent",
      direction: "both",
      maxHops: 8,
      targetOrigin: "https://example.com",
    }),
  ],
});

bus.on("widget:ready", (payload) => {
  console.log("Ready", payload.id);
});
```

## API

- `framesPlugin(options)`
  - `options.channel?: string` - channel identifier (default `fluxa`)
  - `options.allowedOrigins?: string[]` - allowed origins for incoming messages
  - `options.targets?: "parent" | "top" | "opener" | "children" | "all" | Window[]` - where to post outbound messages (default `parent`)
  - `options.direction?: "in" | "out" | "both"` - inbound/outbound toggle (default `both`)
  - `options.filter?: (event, meta) => boolean` - allowlist for inbound/outbound
  - `options.maxHops?: number` - max `meta.path` length (default `8`)
  - `options.targetOrigin?: string | (target) => string` - `postMessage` targetOrigin (default `*`)
  - `options.serialize?: (envelope) => unknown` - outbound serializer
  - `options.deserialize?: (data) => envelope | null` - inbound parser

## Architecture Notes

- The plugin is a fully separate feature and is only enabled via `plugins` in `new Fluxa(...)`.
- If `allowedOrigins` is not provided, messages from any origin are accepted. In production, always restrict this.
- The transport uses `meta.path` to prevent loops; `maxHops` provides a hard stop.

## Development

```bash
npm run build
npm run typecheck
npm run test
```

## License

MIT (c) Jan Moudry
# fluxa-frames
