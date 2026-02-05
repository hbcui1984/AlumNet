# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AlumNet is an open-source alumni association mini-program built with **uni-app** (Vue 3) and **uniCloud** (serverless backend). It enables universities and schools to manage alumni networks with features like alumni verification, search, friend systems, and activities.

**Tech Stack:**
- Frontend: uni-app (Vue 3 + TypeScript), uni-ui components
- Backend: uniCloud cloud objects (JavaScript + JSDoc), MongoDB
- Auth: uni-id (built-in authentication system)
- Deployment: WeChat Mini Program, H5, Native App, Alipay Mini Program

## Development Environment

**Required Tools:**
- HBuilderX 4.0+ (official IDE, required for uni-app development)
- Node.js 18+
- WeChat Developer Tools (for mini-program debugging)

**Development Workflow:**
1. Open project in HBuilderX
2. Right-click `uniCloud-alipay` → Associate cloud service space
3. Run → Run to Mini Program Simulator → WeChat Developer Tools
4. Deploy cloud functions: Right-click `cloudfunctions` → Upload all

## Architecture

```
AlumNet/
├── pages/                    # Vue pages (index, alumni, ucenter)
├── components/               # Reusable Vue components
├── composables/              # Vue 3 composition API hooks (useTheme.ts)
├── config/school.config.js   # School-specific configuration (theme, colleges, features)
├── types/                    # TypeScript type definitions
├── styles/                   # Global SCSS styles and themes
├── uni_modules/              # uni-app plugin ecosystem (uni-ui, uni-id-pages)
├── uniCloud-alipay/          # Cloud backend
│   ├── cloudfunctions/       # Cloud objects (alumni-co, alumni-friend-co, alumni-search-co)
│   └── database/             # MongoDB schemas (*.schema.json)
├── manifest.json             # App configuration and permissions
└── pages.json                # Page routing and tab bar config
```

## Key Patterns

**Frontend (TypeScript):**
- Use Vue 3 Composition API style
- Types defined in `types/*.d.ts`
- Theme management via `composables/useTheme.ts`
- Prefer uni-ui components over third-party libraries

**Backend (Cloud Objects - JavaScript):**
- Cloud objects in `uniCloud-alipay/cloudfunctions/`
- Use JSDoc comments for type hints
- Authentication via `uni-id` token validation in `_before` hook
- Database schemas define validation and permissions

**Theming:**
- CSS variables for H5, inline styles for mini-programs
- School-specific branding in `config/school.config.js`
- Theme colors: primaryColor, primaryLight, primaryDark, secondaryColor, accentColor

## Database Collections

Core alumni collections (in `uniCloud-alipay/database/`):
- `uni-id-users` - Extended with alumni fields (educations, career, privacy)
- `alumni-friends` - Bidirectional friend relationships (userIdA < userIdB by convention)
- `alumni-card-requests` - Business card exchange requests
- `alumni-activities` - Events with signup/check-in
- `alumni-organizations` - Regional/industry/interest groups
- `alumni-recommendations` - Verification recommendations

## Cloud Functions

Main cloud objects:
- `alumni-co` - Profile management, verification
- `alumni-friend-co` - Friend requests, friend list management
- `alumni-search-co` - Multi-criteria alumni search with pagination

Call pattern from frontend:
```javascript
const alumniObj = uniCloud.importObject('alumni-co')
const result = await alumniObj.getMyProfile()
```

## Configuration

**School Configuration (`config/school.config.js`):**
- `name`, `type` (university/highschool/middleschool)
- `theme` - Color scheme
- `colleges` - Array of {name, majors[]} for universities
- `features` - Feature toggles (enableDonation, enableMap, enableActivity, etc.)
- `verify.recommendCount` - Number of recommendations for auto-verification

**Page Routes (`pages.json`):**
- Custom tab bar with 3 tabs (Home, Find Alumni, My)
- Login router configured with uni-id-pages
- Protected routes require authentication

## Privacy System

Privacy scopes for contact visibility:
- `all` - Everyone can see
- `classmate` - Only classmates
- `friend` - Only friends
- `none` - Hidden

## Internationalization

- Translations in `lang/zh-Hans.js` and `lang/en.js`
- Use `$t('key')` in templates
