import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { build } from 'bun'

rmSync('./dist', { recursive: true, force: true })

const entrypoints = [
  'src/detect.ts',
  'src/mailer.ts',
  'src/smtp-mailer.ts',
  'src/sms.ts',
  'src/whatsapp.ts',
  'src/push.ts',
  'src/dkim.ts',
  'src/core/errors.ts',
  'src/core/smtp.ts',
  'src/adapters/node.ts',
  'src/adapters/bun.ts',
  'src/adapters/deno.ts',
  'src/adapters/cf.ts',
  'src/transports/smtp.ts',
  'src/transports/resend.ts',
  'src/transports/sendgrid.ts',
  'src/transports/postmark.ts',
  'src/transports/mailgun.ts',
  'src/transports/ses.ts',
  'src/transports/brevo.ts',
  'src/transports/preview.ts',
  'src/transports/retry.ts',
  'src/transports/fallback.ts',
  'src/transports/weighted-fallback.ts',
  'src/transports/cloudflare-email.ts',
  'src/transports/mailersend.ts',
  'src/transports/plunk.ts',
  'src/transports/sparkpost.ts',
  'src/transports/mailtrap.ts',
  'src/transports/loops.ts',
  'src/transports/sndr.ts',
  'src/transports/twilio-sms.ts',
  'src/transports/taqnyat-sms.ts',
  'src/transports/taqnyat-whatsapp.ts',
  'src/transports/taqnyat-mail.ts',
  'src/transports/msegat.ts',
  'src/transports/unifonic.ts',
  'src/transports/whatsapp-cloud.ts',
  'src/transports/webpush.ts',
  'src/transports/fcm.ts',
  'src/core/channel-result.ts',
  'src/observability/console.ts',
  'src/plugins/template.ts',
  'src/plugins/react.ts',
  'src/idempotency.ts',
  'src/webhooks/types.ts',
  'src/webhooks/brevo.ts',
  'src/webhooks/mailgun.ts',
  'src/webhooks/postmark.ts',
  'src/webhooks/resend.ts',
  'src/webhooks/sendgrid.ts',
  'src/webhooks/ses.ts',
  'src/webhooks/sndr.ts',
  'src/webhooks/twilio-sms.ts',
  'src/webhooks/whatsapp-cloud.ts',
  'src/webhooks/unifonic.ts',
  'src/webhooks/timing-safe-equal.ts',
  'src/errors.ts',
  'src/auth/oauth2.ts',
  'src/pool/pool.ts',
]

await build({
  entrypoints,
  outdir: './dist',
  root: './src',
  target: 'node',
  format: 'esm',
  splitting: true,
  sourcemap: 'external',
  minify: true,
  external: [
    'node:net',
    'node:tls',
    'node:dns',
    'node:dns/promises',
    'node:fs/promises',
    'node:path',
    'node:child_process',
    'cloudflare:sockets',
    '@react-email/render',
    'react',
  ],
})

execSync('./node_modules/.bin/tsc --emitDeclarationOnly --outDir dist', {
  stdio: 'inherit',
})

execSync('bun scripts/generate-index-js.ts', { stdio: 'inherit' })

console.log('✓ sently built successfully')
