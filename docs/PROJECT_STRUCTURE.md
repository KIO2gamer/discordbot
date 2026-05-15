# 📁 Project Structure

This document outlines the organized structure of the Project Kiyo Discord bot codebase.

## 🏗️ **Root Directory Structure**

```
project-kiyo/
├── 📁 src/                          # Main source code
├── 📁 docs/                         # Documentation
├── 📁 deployments/                  # External service deployments
├── 📁 assets/                       # Static assets (images, text)
├── 📁 .github/                      # GitHub workflows and templates
├── 📁 .husky/                       # Git hooks
├── 📁 .kiro/                        # Kiro IDE configuration
├── 📁 .vscode/                      # VS Code configuration
├── 📄 package.json                  # Node.js dependencies
├── 📄 eslint.config.js              # ESLint configuration
├── 📄 .env.example                  # Environment variables template
├── 📄 README.md                     # Main project documentation
└── 📄 LICENSE                       # Project license
```

## 🔧 **Source Code Structure (`src/`)**

```
src/
├── 📁 commands/                     # Discord slash commands (organized by category - 87 total)
│   ├── 📁 Admin_And_Configuration/  # Admin and server configuration (12 commands)
│   ├── 📁 API_Integrations/         # External API integration (8 commands)
│   ├── 📁 Fun_And_Entertainment/    # Fun and entertainment (11 commands)
│   ├── 📁 Information_And_Search/   # Information and search (12 commands)
│   ├── 📁 Levels_And_Experience/    # XP and leveling system (5 commands)
│   ├── 📁 Moderation/               # Moderation and management (13 commands)
│   ├── 📁 Music/                    # Music playback and control (9 commands)
│   ├── 📁 Role_Management/          # Role management (2 commands)
│   ├── 📁 Support_And_Tickets/      # Support ticket management (3 commands)
│   └── 📁 Utility/                  # Utility and helper (9 commands)
├── 📁 database/                     # MongoDB schemas and models
├── 📁 events/                       # Discord.js event handlers
├── 📁 features/                     # Feature-based organization
│   └── 📁 youtube-subscriber-roles/ # YouTube subscriber role feature
├── 📁 utils/                        # Utility functions and helpers
└── 📄 index.js                      # Main bot entry point
```

## 🎯 **Feature-Based Organization (`src/features/`)**

Large features are organized in their own directories for better maintainability:

```
src/features/youtube-subscriber-roles/
├── 📁 commands/                     # Feature-specific commands
│   ├── 📄 ytSubRole.js             # User command: /get_yt_sub_role
│   ├── 📄 ytSubRoleConfig.js       # Admin command: /yt_sub_role_config
│   └── 📄 testYTSetup.js           # Diagnostic command: /test_yt_setup
├── 📁 database/                     # Feature-specific database schemas
│   ├── 📄 ytSubRoleConfig.js       # Subscriber tier configuration schema
│   └── 📄 tempOAuth2Storage.js     # Temporary OAuth2 token storage
├── 📁 utils/                        # Feature-specific utilities
│   └── 📄 oauth2Handler.js         # OAuth2 callback server
└── 📄 index.js                      # Feature export and metadata
```

## 📚 **Documentation Structure (`docs/`)**

```
docs/
├── 📄 PROJECT_STRUCTURE.md         # This file - project organization
├── 📄 LOGGING_SYSTEM.md            # Universal logging system documentation
└── 📁 youtube-subscriber-roles/    # Feature-specific documentation
    ├── 📄 FEATURE_SUMMARY.md       # Implementation overview
    ├── 📄 SETUP_STATUS.md          # Current setup status
    ├── 📄 YOUTUBE_SUBSCRIBER_ROLES_SETUP.md  # Setup guide
    └── 📄 NETLIFY_DEPLOYMENT_GUIDE.md       # Netlify deployment guide
```

## 🚀 **Deployments Structure (`deployments/`)**

```
deployments/
└── 📁 netlify-oauth/               # Netlify OAuth2 callback service
    ├── 📁 netlify/functions/       # Serverless functions
    ├── 📁 public/                  # Static files
    ├── 📄 package.json             # Netlify service dependencies
    ├── 📄 netlify.toml             # Netlify configuration
    ├── 📄 deploy.sh                # Deployment script
    └── 📄 README.md                # Deployment documentation
```

## 🔗 **Compatibility Layer**

To maintain backward compatibility during the reorganization, symlink files are created in the original locations:

```javascript
// Example: src/commands/API_Integrations/ytSubRole.js
module.exports = require("../../features/youtube-subscriber-roles/commands/ytSubRole.js");
```

This ensures that:

-   ✅ Existing imports continue to work
-   ✅ No breaking changes to the bot functionality
-   ✅ Gradual migration is possible
-   ✅ Feature isolation is maintained

## 🎯 **Benefits of This Organization**

### 1. **Feature Isolation**

-   Each major feature has its own directory
-   Related files are grouped together
-   Easier to understand feature scope

### 2. **Maintainability**

-   Clear separation of concerns
-   Easier to find and modify feature-specific code
-   Reduced coupling between features

### 3. **Scalability**

-   Easy to add new features
-   Clear patterns for organization
-   Modular architecture

### 4. **Documentation**

-   Feature-specific documentation
-   Clear project structure documentation
-   Deployment guides separated by service

### 5. **Development Experience**

-   Faster navigation in IDEs
-   Clear file organization
-   Easier onboarding for new developers

## 📋 **File Naming Conventions**

### Commands

-   **PascalCase** for multi-word commands: `ytSubRoleConfig.js`
-   **Descriptive names** that match the slash command: `testYTSetup.js`

### Database Schemas

-   **PascalCase** for schema names: `YTSubRoleConfig`
-   **Descriptive** of the data they store: `tempOAuth2Storage.js`

### Utilities

-   **camelCase** for utility functions: `oauth2Handler.js`
-   **Descriptive** of their purpose: `errorHandler.js`

### Documentation

-   **UPPERCASE** for important docs: `README.md`, `SETUP_STATUS.md`
-   **Descriptive** names: `NETLIFY_DEPLOYMENT_GUIDE.md`

## 🔄 **Migration Strategy**

The reorganization was done with zero downtime:

1. **Move files** to new feature-based structure
2. **Create compatibility symlinks** in original locations
3. **Update import paths** in moved files
4. **Test functionality** to ensure no breaking changes
5. **Update documentation** to reflect new structure

## 🚀 **Future Enhancements**

This structure supports future improvements:

-   **Real-time updates** via WebSocket integration

## 📞 **Getting Started**

With this new organization:

1. **Find commands** in `src/commands/` by category (87 total)
2. **Find features** in `src/features/` by name
3. **Find documentation** in `docs/` by topic
4. **Find deployments** in `deployments/` by service

The bot functionality remains exactly the same, but the code is now much more organized and maintainable! 🎉
