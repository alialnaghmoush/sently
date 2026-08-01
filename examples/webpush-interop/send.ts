/**
 * End-to-end Web Push send harness.
 *
 * Env:
 *   VAPID_PUBLIC_KEY   — base64url uncompressed P-256 public key (65 bytes)
 *   VAPID_PRIVATE_KEY  — base64url raw P-256 private key (32 bytes)
 *   VAPID_SUBJECT      — mailto: or https: contact URI (default mailto:webpush-interop@localhost)
 *
 * Usage:
 *   bun examples/webpush-interop/send.ts path/to/subscription.json
 *   bun examples/webpush-interop/send.ts '{"endpoint":"...","keys":{...}}'
 *   cat subscription.json | bun examples/webpush-interop/send.ts -
 */
import { WebPushError, WebPushTransport } from "../../src/transports/webpush.ts";
import type { PushSubscription } from "../../src/core/push-types.ts";

function usage(): never {
  console.error(`Usage:
  bun examples/webpush-interop/send.ts <subscription.json|-|'{"endpoint":...}'>

Required env:
  VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY

Optional env:
  VAPID_SUBJECT   (default: mailto:webpush-interop@localhost)
`);
  process.exit(1);
}

async function readSubscriptionArg(arg: string): Promise<string> {
  if (arg === "-") {
    return new Response(Bun.stdin).text();
  }
  if (arg.trimStart().startsWith("{")) {
    return arg;
  }
  return Bun.file(arg).text();
}

function parseSubscription(raw: string): PushSubscription {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Subscription must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;
  const keys = obj.keys;
  if (typeof obj.endpoint !== "string" || !obj.endpoint) {
    throw new Error('Subscription missing string "endpoint"');
  }
  if (!keys || typeof keys !== "object") {
    throw new Error('Subscription missing "keys" object');
  }
  const k = keys as Record<string, unknown>;
  if (typeof k.p256dh !== "string" || typeof k.auth !== "string") {
    throw new Error('Subscription.keys must include string "p256dh" and "auth"');
  }

  return {
    endpoint: obj.endpoint,
    keys: { p256dh: k.p256dh, auth: k.auth },
  };
}

function installFetchLogger(): void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    const clone = response.clone();
    const bodyText = await clone.text().catch(() => "");

    console.log("\n--- Push service HTTP response ---");
    console.log(`${response.status} ${response.statusText}`);
    for (const [name, value] of response.headers) {
      console.log(`${name}: ${value}`);
    }
    console.log("");
    console.log(bodyText.length > 0 ? bodyText : "(empty body)");
    console.log("----------------------------------\n");

    return response;
  }) as typeof fetch;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) usage();

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:webpush-interop@localhost";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("Missing VAPID_PUBLIC_KEY and/or VAPID_PRIVATE_KEY.");
    usage();
  }

  const subscription = parseSubscription(await readSubscriptionArg(arg));
  installFetchLogger();

  const transport = new WebPushTransport({
    vapidPublicKey,
    vapidPrivateKey,
    subject,
  });

  console.log("Sending via WebPushTransport…");
  console.log(`  endpoint origin: ${new URL(subscription.endpoint).origin}`);
  console.log(`  VAPID subject:   ${subject}`);

  try {
    const result = await transport.send({
      subscription,
      title: "sently webpush interop",
      body: `Hello from WebPushTransport at ${new Date().toISOString()}`,
      data: { source: "examples/webpush-interop/send.ts" },
    });

    console.log("WebPushTransport.send() result:");
    console.log(JSON.stringify(result, null, 2));
    console.log(
      "\nIf encryption + VAPID are correct, the OS should show a notification now.",
    );
  } catch (error) {
    if (error instanceof WebPushError) {
      console.error("WebPushError:");
      console.error(`  message:    ${error.message}`);
      console.error(`  statusCode: ${error.statusCode}`);
      console.error(`  code:       ${error.code}`);
      console.error(`  apiError:   ${JSON.stringify(error.apiError)}`);
      process.exit(1);
    }
    throw error;
  }
}

await main();
