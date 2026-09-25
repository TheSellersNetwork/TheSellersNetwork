# Supabase email templates

The site verifies email addresses with a 6-digit code. Supabase only puts the
code in the email if the template asks for it, so paste these into the dashboard:
Authentication > Email Templates. Each keeps the link as well, for anyone who
would rather click.

Subject lines are UK English, no exclamation marks.

## Confirm signup

Subject: `Your Sellers Network code: {{ .Token }}`

```html
<h2 style="font-family:Inter,Arial,sans-serif;font-size:18px;color:#0f172a;margin:0 0 12px">Confirm your email</h2>
<p style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#0f172a;line-height:1.6;margin:0 0 16px">Enter this code on the site to finish setting up your account.</p>
<p style="font-family:Inter,Arial,sans-serif;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a;margin:0 0 20px">{{ .Token }}</p>
<p style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#5b6b69;line-height:1.6;margin:0">The code works for one hour. If the site is not open, you can <a href="{{ .ConfirmationURL }}" style="color:#2563eb">confirm with this link</a> instead. If you did not create an account, ignore this email.</p>
```

## Magic Link (used for "sign in with a code")

Subject: `Your Sellers Network sign in code: {{ .Token }}`

```html
<h2 style="font-family:Inter,Arial,sans-serif;font-size:18px;color:#0f172a;margin:0 0 12px">Your sign in code</h2>
<p style="font-family:Inter,Arial,sans-serif;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a;margin:0 0 20px">{{ .Token }}</p>
<p style="font-family:Inter,Arial,sans-serif;font-size:13px;color:#5b6b69;line-height:1.6;margin:0">Enter it on the sign in page. It works for one hour. Or <a href="{{ .ConfirmationURL }}" style="color:#2563eb">sign in with this link</a>. If you did not ask for this, ignore this email.</p>
```

## Also check

Authentication > Providers > Email: keep "Confirm email" on. Under the same page, the OTP
expiry can stay at the default (3600 seconds).
