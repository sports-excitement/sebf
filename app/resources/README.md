# Resources Directory

This directory contains user-customizable resources for your application. These resources take precedence over the default framework resources, allowing you to customize your application without modifying the core framework files.

## Email Templates

The `templates/email/` directory contains email templates that your application can use for sending emails.

### Template Structure

Email templates support two formats:
- **HTML templates** (`.html`): Rich HTML emails with styling
- **Text templates** (`.txt`): Plain text alternatives

### Available Variables

All email templates support the following variables using `{{variable}}` syntax:

#### Common Variables (automatically available)
- `{{app_name}}` - Application name from environment
- `{{app_url}}` - Application URL from environment  
- `{{current_year}}` - Current year
- `{{timestamp}}` - Current timestamp

#### User-specific Variables
- `{{user_name}}` - User's display name
- `{{user_email}}` - User's email address

#### Template-specific Variables
Each template may support additional variables depending on its purpose:

**Welcome Template:**
- `{{verification_required}}` - Boolean for conditional verification content
- `{{verification_url}}` - Email verification link

**Password Reset Template:**
- `{{reset_url}}` - Password reset link
- `{{expiry_hours}}` - Hours until link expires

**Notification Template:**
- `{{notification_title}}` - Title of the notification
- `{{notification_subject}}` - Subject of the notification
- `{{notification_message}}` - Main notification message
- `{{action_required}}` - Boolean for conditional action content
- `{{action_url}}` - Action button URL
- `{{action_text}}` - Action button text
- `{{unsubscribe_url}}` - Unsubscribe link

### Conditional Content

Templates support conditional blocks using:
```
{{#condition}}
Content to show when condition is true
{{/condition}}
```

### Adding Custom Templates

1. Create your template file in `app/resources/templates/email/`
2. Use the `.html` extension for HTML templates or `.txt` for text templates
3. Include any necessary variables using `{{variable}}` syntax
4. The template will automatically be available for use in your application

### Template Priority

The system will look for templates in this order:
1. `app/resources/templates/email/` (your custom templates)
2. `framework/templates/email/` (default framework templates)

This allows you to override specific templates while keeping others as defaults.

### Example Usage

```javascript
// In your service or controller
await mailingService.sendEmail({
  to: 'user@example.com',
  template: 'welcome',
  variables: {
    user_name: 'John Doe',
    user_email: 'user@example.com',
    verification_required: true,
    verification_url: 'https://yourapp.com/verify/token123'
  }
});
```