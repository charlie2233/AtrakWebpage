# Form Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Formspree Account
1. Go to https://formspree.io/
2. Sign up for a free account (no credit card required)
3. Verify your email

### Step 2: Create Forms
1. Go to https://formspree.io/forms
2. Click **"New Form"**
3. Create forms for each endpoint:
   - **Suggestion Box**: Name it "Atrak Suggestion Box"
   - **Join/Contact**: Name it "Atrak Join/Contact"
   - **Security**: Name it "Atrak Security Reports" (optional)
   - **Sponsor**: Name it "Atrak Sponsorships" (optional)

### Step 3: Get Form IDs
After creating each form, you'll see a URL like:
```
https://formspree.io/f/mqkowpqz
```

The part after `/f/` is your Form ID (e.g., `mqkowpqz`)

### Step 4: Update config.js
Open `config.js` and replace `REPLACE_ME` with your actual Form IDs:

```javascript
window.ATRAK_CONFIG = {
    forms: {
        default: 'https://formspree.io/f/YOUR_FORM_ID_HERE',
        suggestion: 'https://formspree.io/f/YOUR_SUGGESTION_FORM_ID',
        join: 'https://formspree.io/f/YOUR_JOIN_FORM_ID',
        security: 'https://formspree.io/f/YOUR_SECURITY_FORM_ID',
        sponsor: 'https://formspree.io/f/YOUR_SPONSOR_FORM_ID'
    }
};
```

**Quick Start**: You can use the same Form ID for all forms, or create separate ones to organize emails.

### Step 5: Test
1. Open your website
2. Try submitting the suggestion form
3. Check your email inbox (Formspree will send you the submission)

## Form Endpoints Explained

- **`suggestion`**: Anonymous suggestion box (no email required)
- **`join`**: Apply/Contact form (requires name and email)
- **`security`**: Security vulnerability reports
- **`sponsor`**: Sponsorship inquiries
- **`default`**: Fallback if specific endpoint not found

## Troubleshooting

### Form shows "This form is not active yet"
- Check that `config.js` doesn't contain `REPLACE_ME`
- Verify the Form ID is correct
- Make sure you're using the full URL: `https://formspree.io/f/YOUR_ID`

### Form submits but no email received
- Check your Formspree dashboard for submissions
- Verify your email in Formspree settings
- Check spam folder
- Free accounts have a limit (50 submissions/month)

### Form disabled on page load
- The form checks configuration on load
- If endpoint contains `REPLACE_ME`, it disables submission
- Update `config.js` and refresh the page

## Free Tier Limits

- 50 submissions per month per form
- Email notifications
- Basic spam protection
- No custom domains (for paid plans)

## Alternative: Use Same Form ID

If you want to use one Form ID for all forms:

```javascript
window.ATRAK_CONFIG = {
    forms: {
        default: 'https://formspree.io/f/YOUR_SINGLE_FORM_ID',
        suggestion: 'https://formspree.io/f/YOUR_SINGLE_FORM_ID',
        join: 'https://formspree.io/f/YOUR_SINGLE_FORM_ID',
        security: 'https://formspree.io/f/YOUR_SINGLE_FORM_ID',
        sponsor: 'https://formspree.io/f/YOUR_SINGLE_FORM_ID'
    }
};
```

Formspree will include the form name in the email subject to help you distinguish submissions.

