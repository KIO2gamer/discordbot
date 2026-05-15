# 🤝 Contributing to Project Kiyo

Thank you for your interest in contributing to Project Kiyo! This guide will help you get started.

## 📋 Table of Contents

-   [Getting Started](#getting-started)
-   [Development Workflow](#development-workflow)
-   [Code Style Guidelines](#code-style-guidelines)
-   [Adding Features](#adding-features)
-   [Submitting Changes](#submitting-changes)
-   [Testing](#testing)
-   [Documentation](#documentation)

## Getting Started

### 1. Fork & Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/project-kiyo.git
cd project-kiyo

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/project-kiyo.git
```

### 2. Create Development Branch

```bash
# Update from upstream
git fetch upstream
git rebase upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Install Dependencies

```bash
npm ci
```

### 4. Set Up Environment

```bash
# Copy example env file
cp .env.example .env

# Add your Discord token and MongoDB URL
# At minimum for testing:
# - DISCORD_TOKEN=your_test_bot_token
# - CLIENTID=your_client_id
# - MONGODB_URL=mongodb://localhost:27017/kiyo
```

## Development Workflow

### Running Development Mode

```bash
npm run dev
```

Auto-reloads on file changes. Perfect for active development.

### Code Quality Checks

```bash
# Check for linting issues
npm run lint

# Format code
npm run format

# Both together
npm run lint && npm run format
```

### Testing Your Changes

```bash
# Run tests (when available)
npm test

# Run bot and test manually
npm run dev
```

## Code Style Guidelines

### General Principles

-   **DRY (Don't Repeat Yourself):** Reuse code via utilities and helpers
-   **KISS (Keep It Simple Stupid):** Clear, readable code over clever tricks
-   **Modular:** One responsibility per function/module
-   **Documented:** Comments for complex logic

### JavaScript Style

```javascript
// ✅ Good: Clear variable names, proper formatting
const handleUserCommand = async (interaction) => {
    const user = interaction.user;

    if (!user) {
        await interaction.reply("User not found");
        return;
    }

    // Process user data
    const userData = await UserModel.findById(user.id);
    return userData;
};

// ❌ Avoid: Unclear names, poor formatting
const cmd = async (i) => {
    let u = i.user;
    if (!u) {
        i.reply("err");
        return;
    }
    let d = await UserModel.findById(u.id);
    return d;
};
```

### Naming Conventions

```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_MESSAGE_LENGTH = 2000;
const DISCORD_EPOCH = 1420070400000;

// Functions: camelCase
const handleUserInput = () => {};
const validateEmail = (email) => {};

// Classes: PascalCase
class CommandHandler {}
class DatabaseManager {}

// Private methods: _leadingUnderscore
const _formatError = (error) => {};
```

### Comments

```javascript
// ✅ Good: Explains WHY not WHAT
const delay = (ms) => {
    // Wait for message send to register in database
    // before attempting to fetch it
    return new Promise((resolve) => setTimeout(resolve, ms));
};

// ❌ Avoid: Obvious comments
const x = 5; // Set x to 5
```

### Error Handling

```javascript
// ✅ Good: Proper error handling
try {
    const data = await fetchUserData(userId);
    return data;
} catch (error) {
    Logger.error(`Failed to fetch user ${userId}:`, error);
    throw error; // Re-throw or handle appropriately
}

// ❌ Avoid: Ignoring errors
const data = await fetchUserData(userId); // Might crash!
```

### Async/Await

```javascript
// ✅ Good: Clear async handling
const processUser = async (userId) => {
    try {
        const user = await User.findById(userId);
        const posts = await Post.find({ author: userId });
        return { user, posts };
    } catch (error) {
        Logger.error(`Processing failed for ${userId}`, error);
        throw error;
    }
};

// ❌ Avoid: Callback hell
const processUser = (userId, callback) => {
    User.findById(userId, (err, user) => {
        if (err) callback(err);
        Post.find({...}, (err, posts) => {
            if (err) callback(err);
            callback(null, {user, posts});
        });
    });
};
```

## Adding Features

### 1. Simple Command

Create a new command file in appropriate category:

```javascript
// src/commands/Utility/mycommand.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mycommand")
        .setDescription("Description of what it does"),

    async execute(interaction) {
        try {
            const response = "Your response here";

            const embed = new EmbedBuilder()
                .setTitle("Command Result")
                .setDescription(response)
                .setColor("Blue");

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            Logger.error("MyCommand Error:", error);
            await interaction.reply("An error occurred");
        }
    },
};
```

### 2. New Feature (Multi-file)

Create feature directory structure:

```
src/features/my-feature/
├── index.js              # Feature metadata
├── commands/
│   ├── command1.js
│   └── command2.js
├── database/
│   └── schema.js
├── utils/
│   └── helper.js
└── README.md             # Feature documentation
```

**Feature index.js:**

```javascript
const command1 = require("./commands/command1");
const command2 = require("./commands/command2");
const MySchema = require("./database/schema");

module.exports = {
    commands: {
        command1,
        command2,
    },
    database: {
        MySchema,
    },
    meta: {
        name: "My Feature",
        version: "1.0.0",
        description: "What this feature does",
        dependencies: ["discord.js", "mongoose"],
    },
};
```

### 3. Database Schema

```javascript
// src/database/mySchema.js
const mongoose = require("mongoose");

const mySchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        data: {
            type: String,
            default: "",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        collection: "my_collection",
    },
);

module.exports = mongoose.model("MyModel", mySchema);
```

### 4. Event Handler

```javascript
// src/events/my_event.js
const { Events } = require("discord.js");

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        try {
            // Your event logic
            Logger.info(`Message from ${message.author.tag}`);
        } catch (error) {
            Logger.error("Event Handler Error:", error);
        }
    },
};
```

## Submitting Changes

### 1. Commit with Clear Messages

```bash
# Use descriptive commit messages
git add .
git commit -m "feat: add user profile command"
git commit -m "fix: resolve auto-mod spam detection issue"
git commit -m "docs: update installation guide"
git commit -m "style: format code with prettier"
git commit -m "refactor: simplify error handling"
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

On GitHub:

1. Click "Compare & pull request"
2. Add description of changes
3. Reference related issues: `Closes #123`
4. Wait for review

### 4. Respond to Review

-   Address all feedback
-   Push additional commits (don't force push)
-   Request re-review when ready

## Testing

### Manual Testing Checklist

-   [ ] Command runs without errors
-   [ ] Error handling works
-   [ ] Database operations succeed
-   [ ] Discord permissions checked
-   [ ] User feedback is appropriate
-   [ ] No console warnings

### Automated Testing (when available)

```bash
npm test
```

## Documentation

### Update Documentation When:

-   Adding new commands → Update [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md)
-   Adding new feature → Create feature README
-   Changing architecture → Update [CODEBASE_OVERVIEW.md](CODEBASE_OVERVIEW.md)
-   Installation steps change → Update [INSTALLATION_AND_SETUP.md](INSTALLATION_AND_SETUP.md)

### Documentation Format

````markdown
### Feature Name

**Description:**
Clear explanation of what it does.

**Files:**

-   `path/to/file1.js`
-   `path/to/file2.js`

**Configuration:**

```env
FEATURE_ENV_VAR=value
```
````

**Usage:**

```javascript
// Example code
```

**Related:** Links to related docs

````

## 💡 Tips for Success

### Before Starting

- Check existing issues/PRs to avoid duplicates
- Discuss large changes before coding
- Follow the current code style

### While Developing

- Keep changes focused on one feature
- Test thoroughly before committing
- Write meaningful commit messages
- Keep PRs reasonably sized

### Common Pitfalls

❌ **Don't:**
- Commit node_modules or .env
- Make unrelated changes in one PR
- Ignore linting errors
- Skip error handling
- Add console.log debugging
- Break existing functionality

✅ **Do:**
- Follow code style guidelines
- Add comments for complex logic
- Test your changes
- Update related documentation
- Request help if unsure

## Need Help?

1. **Read Docs:** Check [CODEBASE_OVERVIEW.md](CODEBASE_OVERVIEW.md)
2. **Ask Questions:** Open discussion in PR
3. **Report Bugs:** Include error logs and reproduction steps
4. **Suggest Features:** Describe use case and benefits

## Code Review Process

All PRs require:

1. ✅ Code style compliance (ESLint passes)
2. ✅ Tests pass (when applicable)
3. ✅ Documentation updated
4. ✅ No breaking changes without discussion
5. ✅ Maintainer approval

## License

By contributing, you agree your code is licensed under the MIT License.

---

## Quick Reference

**Linting:**
```bash
npm run lint
npm run format
````

**Development:**

```bash
npm run dev              # Auto-reload
npm run dev:debug       # Debug mode
npm run dev:trace       # Trace mode
```

**Structure:**

-   Commands: `src/commands/Category/command.js`
-   Database: `src/database/schema.js`
-   Events: `src/events/event.js`
-   Utils: `src/utils/utility.js`
-   Features: `src/features/feature-name/`

**Git Workflow:**

```bash
git checkout -b feature/name
# Make changes
git add .
git commit -m "type: description"
git push origin feature/name
# Create PR on GitHub
```

---

**Thank you for contributing!** 🎉

Your efforts help make Project Kiyo better for everyone.
