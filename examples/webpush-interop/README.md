# Web Push interop harness

Manual end-to-end check that `WebPushTransport` can deliver a real notification
through a browser push service (Chrome → FCM, Firefox → Mozilla autopush).

Unit tests only cover encrypt → decrypt self-consistency. **This harness does
not close the interop gate by itself** — a human must run it once and confirm a
visible OS notification appears.

## Prerequisites

- Bun
- A desktop browser with Web Push (Chrome or Firefox recommended)
- Localhost (service workers + push require a secure context)

## 1. Generate a VAPID key pair

From the repo root:

```sh
bun -e '
import { encodeBase64Url } from "./src/core/base64.ts";
const kp = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const pub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
console.log("export VAPID_PUBLIC_KEY=" + encodeBase64Url(pub));
console.log("export VAPID_PRIVATE_KEY=" + jwk.d);
'
```

Export both values in your shell (do not commit them):

```sh
export VAPID_PUBLIC_KEY='…'
export VAPID_PRIVATE_KEY='…'
export VAPID_SUBJECT='mailto:you@example.com'   # optional
```

Use the **same** public key in the browser subscribe step and the private key
in `send.ts`.

## 2. Serve the test page

```sh
cd examples/webpush-interop
bunx --bun serve .
```

Open the printed URL (typically `http://localhost:3000`) in a real browser —
not a headless runner.

## 3. Subscribe in the browser

1. Paste `VAPID_PUBLIC_KEY` into the page.
2. Click **Subscribe**.
3. Grant notification permission when prompted.
4. Copy the logged `PushSubscription` JSON (page + DevTools console).

Save it somewhere convenient, e.g. `/tmp/push-sub.json`.

## 4. Send through sently

Still from the repo root, with the same VAPID env vars:

```sh
bun examples/webpush-interop/send.ts /tmp/push-sub.json
```

Or pipe / inline:

```sh
bun examples/webpush-interop/send.ts - < /tmp/push-sub.json
bun examples/webpush-interop/send.ts '{"endpoint":"…","keys":{"p256dh":"…","auth":"…"}}'
```

The script calls `WebPushTransport.send()` and prints the raw HTTP status,
headers, and body from the push service, plus the transport result object.

## 5. Confirm success

- Push service HTTP status is typically **201** (Created) or **200**.
- A **visible OS / browser notification** appears with title
  `sently webpush interop`.

If the HTTP call succeeds but no notification appears, check that the tab’s
service worker is still registered, notification permission is still granted,
and Focus Assist / Do Not Disturb is not suppressing banners.

## Gate status

| Check | Owner |
| --- | --- |
| Harness exists (`index.html`, `sw.js`, `send.ts`, this README) | done in-repo |
| Real browser subscribe + real push-service delivery + visible notification | **human — still required** |
