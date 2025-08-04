# Email Templates

This directory contains customizable email templates for your application. Templates placed here will override the default framework templates.

## Template Files

### Current Templates

- **`welcome.html/txt`** - Welcome email for new users
- **`notification.html`** - General notification emails
- **`password-reset.html`** - Password reset emails
- **`example.html/txt`** - Example template showing features

### Template Priority

The email system loads templates in this order:
1. **App Resources** (`app/resources/templates/email/`) - Your custom templates ✅
2. **Framework** (`framework/templates/email/`) - Default templates

If you create a template with the same name as a framework template, your version will be used instead.

## Template Syntax

### Variables
Use `{{variable_name}}` to insert dynamic content:
```html
<h1>Welcome {{user_name}}!</h1>
<p>Your email is {{user_email}}</p>
```

### Conditional Blocks
Show content conditionally:
```html
{{#verification_required}}
<p>Please verify your email:</p>
<a href="{{verification_url}}">Verify Email</a>
{{/verification_required}}
```

### Common Variables
These variables are automatically available in all templates:
- `{{app_name}}` - Application name
- `{{app_url}}` - Application URL
- `{{current_year}}` - Current year
- `{{timestamp}}` - Current timestamp

## Creating New Templates

1. Create your template file in this directory
2. Use `.html` for HTML emails or `.txt` for plain text
3. Add variables using `{{variable}}` syntax
4. Test your template by sending a test email

## Example Usage

```javascript
// Send email with custom template
await mailingService.sendEmail({
  to: 'user@example.com',
  template: 'welcome',
  variables: {
    user_name: 'John Doe',
    user_email: 'user@example.com',
    verification_required: true,
    verification_url: 'https://yourapp.com/verify/abc123'
  }
});
```

## File Formats

- **HTML Templates (`.html`)**: Rich formatting with CSS styling
- **Text Templates (`.txt`)**: Plain text alternative for email clients that don't support HTML

Both formats support the same variable syntax and conditional blocks.