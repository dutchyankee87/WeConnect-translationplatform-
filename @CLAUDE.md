# @CLAUDE.md - WeConnect Translation Platform Project Guide

## Project Overview
**WeConnect Translation Platform** is a comprehensive document translation platform built with Next.js that integrates with DeepL API for professional translation services. It features workflow management, role-based access control, translation memory, quality assurance tools, and supports batch processing for enterprise use.

## Architecture & Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk for user management
- **Translation API**: DeepL API (Pro & Free tiers)
- **Styling**: Tailwind CSS
- **File Storage**: Local uploads folder (designed for S3 migration)
- **Type Safety**: TypeScript throughout

## Key Features

### Phase 1 - Core Translation
- Document translation (.docx, .pdf, .txt, .srt)
- 4-step translation workflow (upload → glossary → languages → download)
- DeepL API integration with document and text endpoints
- Glossary management and DeepL glossary sync
- Translation memory for reuse of previous translations
- Translation history and job tracking

### Phase 2 - Enterprise Workflow  
- Role-based access control (5 roles: creator, translator, reviewer, approver, admin)
- Task assignment and workflow management
- In-browser translation editor with segment editing
- Quality assurance with automated checks
- Audit trail system for compliance
- Batch processing for multiple documents
- User management and admin interface

## Important Commands
```bash
# Development
npm run dev

# Database operations
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Drizzle Studio

# Build and production
npm run build
npm run start

# Linting
npm run lint
```

## Project Structure
```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API routes
│   │   ├── admin/          # Admin user management
│   │   ├── audit/          # Audit trail endpoints
│   │   ├── batch-jobs/     # Batch processing
│   │   ├── glossaries/     # Glossary management
│   │   ├── jobs/           # Translation jobs
│   │   ├── tasks/          # Task workflow
│   │   ├── tm/             # Translation memory
│   │   └── user/           # User profile/permissions
│   ├── dashboard/          # Main application pages
│   │   ├── batch/          # Batch job interface
│   │   ├── glossaries/     # Glossary management UI
│   │   ├── history/        # Translation history
│   │   └── jobs/[id]/      # Individual job details
│   ├── editor/[taskId]/    # In-browser translation editor
│   ├── tasks/              # Task management interface
│   └── admin/              # Admin user management
├── components/             # Reusable React components
│   ├── ProtectedRoute.tsx  # Route protection
│   ├── QAResults.tsx       # Quality assurance display
│   └── Sidebar.tsx         # Navigation sidebar
└── middleware.ts           # Clerk authentication middleware

lib/
├── db/                     # Database configuration
│   ├── index.ts           # Database connection
│   └── schema.ts          # Drizzle schema definitions
├── deepl.ts               # DeepL API integration
├── file-processor.ts      # Document processing utilities
├── qa.ts                  # Quality assurance checks
├── rbac.ts                # Role-based access control
├── upload.ts              # File upload handling
└── user.ts                # User management utilities

uploads/                   # File storage
├── jobs/                  # Individual translation files
└── batch/                 # Batch job file groups
```

## Database Schema Key Tables
- `users` - User profiles with role-based permissions
- `translation_jobs` - Individual translation requests
- `batch_jobs` - Batch processing jobs with multiple files
- `glossaries` - Translation glossaries synced with DeepL
- `glossary_entries` - Individual glossary term pairs
- `translation_memory` - Reusable translation segments
- `translation_tasks` - Workflow tasks for translators/reviewers
- `task_segments` - Individual text segments within tasks
- `translation_qa_results` - Quality assurance check results
- `audit_events` - Complete audit trail for compliance

## User Roles & Permissions
- **Creator**: Upload documents, create jobs, view own history
- **Translator**: Edit assigned tasks, submit for review, access TM
- **Reviewer**: Review tasks, request changes, access creator features
- **Approver**: Approve final translations, full review access
- **Admin**: Complete system access, user management, task assignment

## Key Files to Know
- `src/app/page.tsx` - Landing page and main entry
- `src/app/dashboard/page.tsx` - Main dashboard interface
- `lib/db/schema.ts` - Complete database schema
- `lib/deepl.ts` - DeepL API integration with document handling
- `lib/rbac.ts` - Role-based access control logic
- `lib/qa.ts` - Quality assurance checks and scoring
- `lib/file-processor.ts` - Document processing and text extraction
- `src/app/api/jobs/route.ts` - Main translation job API
- `src/app/editor/[taskId]/page.tsx` - Translation editor interface

## Environment Variables Needed
```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard

# DeepL API
DEEPL_API_KEY=your-deepl-api-key-here

# File Storage
UPLOAD_DIR=./uploads
```

## Development Notes
- Uses Drizzle ORM for type-safe database queries
- DeepL API supports both document upload and text translation
- File validation includes size limits based on DeepL account type
- Quality assurance includes glossary compliance and number validation
- Audit trail captures all user actions for compliance
- Batch processing with rate limiting for enterprise use
- Translation memory automatically reuses previous translations
- Role-based middleware protects all sensitive routes

## Translation Workflow States
- **pending** → **processing** → **completed/failed** (Jobs)
- **draft** → **in_review** → **changes_requested/approved** (Tasks)
- **ready/syncing/error** (Glossaries)

## Quality Assurance Scoring
- Base score: 100 points
- Glossary violations: -10 points each
- Number inconsistencies: -15 points each
- Final score displayed in job history and details

## Testing
Currently no automated test framework configured. Manual testing should cover:
- Translation workflow with different file types
- Role-based access restrictions
- Batch processing with multiple files
- Quality assurance checks and scoring
- Translation memory functionality
- Glossary management and sync

## Deployment Notes
- Configured for Vercel or similar Node.js hosting
- Requires PostgreSQL database setup
- File storage currently local (designed for S3 migration)
- DeepL API keys required for both development and production
- Clerk authentication setup for custom domain

## Plan & Review

Before you start working, write a plan to claude/tasks/TASK_NAME.md. The plan should be a detailed description of the changes you will make and the reasoning behind them. Once you have written the plan, stop and ask me to review it. Do not continue until I have reviewed and approved the plan. After I have approved the plan, continue with the work. You may update the plan as you work.

Once you are done with your work, append a review to the same file. The review should be a detailed description of the changes you made and the reasoning behind them. It should also serve to help me perform the final code review.

If I ask you to start working on a new task during our session, then create a separate claude/tasks/TASK_NAME.md file for the new task and repeat the process.

## Project Memory
- WeConnect Translation Platform is a professional document translation service
- Built for enterprise use with workflow management and compliance features
- Integrates with DeepL API for high-quality machine translation
- Uses role-based access control for secure multi-user environments
- Supports both individual and batch document processing