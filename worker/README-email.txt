Email alerts for donation notes

1. Cloudflare dashboard, parabaikdaily.com, Email, Email Routing: enable it.
2. Destination addresses: add the owner inbox and click the link Cloudflare emails to it.
3. Workers, parabaik-alerts, Settings, Variables and Secrets: add a secret named OWNER_EMAIL with that address.
4. The [[send_email]] binding named MAIL is added to wrangler.toml once Email Routing is on.
5. Owner tools page: Send a test email.
