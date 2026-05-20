---
title: General FAQs
journey: FAQs
order: 1
tags: [faq, general, login, password, access, session, reset, user, role, permissions]
keywords: forgot password use reset link, session expires after 8 hours, different roles have different access, browser refresh fixes most display issues
video:
---

## General FAQs

---

### I forgot my password. What do I do?

On the login page, click **Forgot Password** and enter your registered email. You will receive a reset link within a few minutes. If you don't see it, check your spam folder.

If you don't have a registered email on file, contact your clinic admin or the DMS support team to reset your account.

---

### My session expired in the middle of work. Did I lose data?

Sessions auto-expire after **8 hours** of inactivity for security. Any data you saved before the session expired is safe. Unsaved changes in open forms may have been lost — always save before stepping away.

Log back in and your data will be exactly as you left it.

---

### I can see some menu items but not others. Is something broken?

No — this is **role-based access**. The clinic admin assigns roles (Receptionist, Dentist, Manager, etc.) and each role can only see the sections relevant to them.

If you need access to a section you can't see, ask your clinic admin to update your role permissions.

---

### The page looks broken or data is not loading.

Try these in order:
1. **Hard refresh** the page: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac).
2. **Clear browser cache** and reload.
3. Try a different browser (Chrome recommended).
4. If the issue persists across browsers, check your internet connection.
5. If it still fails, contact support — the server may be having an issue.

---

### Can two staff members use the system at the same time?

Yes. The DMS supports multiple concurrent users. Each staff member should log in with their own account. Sharing accounts is not recommended — it breaks audit trails and you lose track of who did what.

---

### How do I add a new staff member / user?

1. Go to **Settings** → **Users**.
2. Click **+ Invite User**.
3. Enter their email and assign a role.
4. They will receive an invitation email with a link to set their password.

---

### Can I use the DMS on my phone?

Yes. The DMS is a web app that works on mobile browsers. For the best experience on small screens, use Chrome on Android or Safari on iOS. Some complex screens (like the clinical charting tooth chart) work better on a tablet or desktop.

---

### How do I change the clinic name, logo, or contact details?

Go to **Settings** → **Clinic Profile**. You can update the clinic name, address, phone number, email, logo, and the name that appears on invoices and WhatsApp messages.

---

### Is my data backed up?

Yes. Data is stored on MongoDB Atlas with automatic daily backups. Cloudinary handles media storage with redundancy. Contact your DMS administrator for the specific backup retention policy for your clinic.
