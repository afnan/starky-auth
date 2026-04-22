# Keycloak Custom Themes

This directory contains custom themes for Keycloak. Each realm can have its own branded login experience.

## Theme Structure

```
themes/
├── README.md
├── boxe/                          # Theme for Boxe realm
│   ├── login/                     # Login pages theme
│   │   ├── theme.properties       # Theme configuration
│   │   ├── resources/
│   │   │   ├── css/
│   │   │   │   └── login.css      # Custom styles
│   │   │   └── img/
│   │   │       └── logo.png       # Custom logo
│   │   ├── messages/
│   │   │   └── messages_en.properties  # Custom text
│   │   └── login.ftl              # Custom login template (optional)
│   ├── account/                   # Account management theme (optional)
│   └── email/                     # Email templates (optional)
├── partner-portal/                # Theme for Partner Portal realm
│   └── login/
│       └── ...
└── internal/                      # Theme for internal apps realm
    └── login/
        └── ...
```

## Creating a New Theme

### 1. Create Theme Directory

```bash
mkdir -p themes/your-client/login/resources/css
mkdir -p themes/your-client/login/resources/img
mkdir -p themes/your-client/login/messages
```

### 2. Create theme.properties

```properties
# themes/your-client/login/theme.properties
parent=keycloak
import=common/keycloak

# Override styles
styles=css/login.css
```

### 3. Create Custom CSS

```css
/* themes/your-client/login/resources/css/login.css */

/* Brand colors */
:root {
    --pf-global--primary-color--100: #your-brand-color;
}

/* Logo */
.login-pf-brand img {
    height: 60px;
}

/* Custom background */
.login-pf {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Login card */
.card-pf {
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
```

### 4. Add Custom Logo

Place your logo at:
```
themes/your-client/login/resources/img/logo.png
```

### 5. Custom Messages (Optional)

```properties
# themes/your-client/login/messages/messages_en.properties
loginTitle=Sign in to Your Company
loginTitleHtml=Sign in to <strong>Your Company</strong>
```

## Applying Theme to Realm

1. Go to Admin Console: `https://auth-admin.allspicetech.com.au`
2. Select your realm (e.g., "boxe")
3. Go to **Realm Settings** → **Themes**
4. Select your theme from dropdown:
   - Login theme: `your-client`
   - Account theme: `your-client` (if created)
   - Email theme: `your-client` (if created)
5. Click **Save**

## Development Mode

For faster development (see changes without restart):

1. Edit `.env`:
   ```
   KC_THEME_CACHING=false
   ```

2. Restart Keycloak:
   ```bash
   docker-compose restart keycloak
   ```

3. Make changes to theme files
4. Refresh browser to see changes

**Remember to set `KC_THEME_CACHING=true` in production!**

## Theme Types

### Login Theme
- Login/registration pages
- Password reset
- OTP entry
- Social login buttons

### Account Theme
- User account management
- Profile editing
- Security settings
- Sessions management

### Email Theme
- Email verification
- Password reset emails
- Account notifications

### Admin Theme
- Admin console (rarely customized)

## Best Practices

1. **Extend Base Theme**: Always use `parent=keycloak` to inherit base functionality
2. **Minimal Overrides**: Only override what you need to change
3. **Test Thoroughly**: Test all login flows (login, register, reset, OTP)
4. **Mobile Responsive**: Ensure themes work on mobile devices
5. **Accessibility**: Maintain accessibility standards (contrast, labels)
6. **Version Control**: Keep themes in git with your Keycloak config

## Example: Boxe Theme

See `themes/boxe/` for a complete example theme implementation.

## Troubleshooting

### Theme Not Showing
- Check theme directory name matches exactly
- Verify `theme.properties` exists
- Check Keycloak logs: `docker-compose logs keycloak`
- Ensure theme is selected in Realm Settings

### CSS Not Loading
- Check file paths in `theme.properties`
- Verify CSS file is in correct location
- Clear browser cache
- Check for CSP errors in browser console

### Images Not Loading
- Verify image paths are correct
- Check image file permissions
- Use relative paths: `resources/img/logo.png`
