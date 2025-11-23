# Translation Platform

A comprehensive document translation platform built with Next.js, featuring DeepL API integration, workflow management, translation memory, and quality assurance tools.

## 🚀 Features

### ✅ Core Functionality (Phase 1)
- **Authentication**: Clerk-based user authentication with role management
- **Document Translation**: Support for .docx, .pdf, .txt, and .srt files
- **4-Step Translation Workflow**: 
  1. File upload with validation
  2. Optional glossary selection  
  3. Language pair selection
  4. Download translated document
- **Glossary Management**: Create, sync, and manage translation glossaries
- **Translation History**: View and download previous translations
- **Translation Memory**: Automatic reuse of previous translations
- **DeepL Integration**: Professional translation API with glossary support

### 🔧 Technical Stack
- **Frontend**: Next.js 15 (App Router) + React + TypeScript + TailwindCSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Clerk
- **File Storage**: Local uploads folder (designed for S3 migration)
- **Translation**: DeepL API

### ✅ Phase 2 Features (COMPLETED)
- **QA Checks**: Automated glossary compliance and number validation with detailed reporting
- **Role-Based Access Control**: 5 user roles (creator, translator, reviewer, approver, admin) with granular permissions
- **Translation Task Workflow Engine**: Complete task assignment, review, and approval workflow
- **In-Browser Translation Editor**: Feature-rich editor with segment-by-segment editing, TM suggestions, and real-time collaboration
- **Audit Trail System**: Complete activity tracking and history for all user actions
- **User Management**: Admin interface for role management and user oversight

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- DeepL API account
- Clerk account

### 1. Environment Configuration

Configure the following variables in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/translation_platform"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
CLERK_SECRET_KEY=sk_test_your-secret-key-here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard

# DeepL API
DEEPL_API_KEY=your-deepl-api-key-here

# Upload directory
UPLOAD_DIR=./uploads
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Run migrations
npm run db:migrate

# Optional: Open Drizzle Studio to view database
npm run db:studio
```

### 4. Clerk Setup

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Configure your Clerk application:
   - Add your domain to allowed origins
   - Configure sign-in/sign-up pages
3. Copy your API keys to `.env.local`

### 5. DeepL Setup

1. Get a DeepL API key from [DeepL Pro](https://www.deepl.com/pro)
2. Add the API key to `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Main application pages
│   │   ├── tasks/             # Task management
│   │   └── auth pages/        # Clerk authentication
│   └── components/            # Reusable components
├── lib/
│   ├── db/                    # Database configuration
│   ├── deepl.ts               # DeepL API integration
│   ├── file-processor.ts      # Document processing
│   ├── upload.ts              # File upload handling
│   └── user.ts                # User management
├── drizzle/                   # Database migrations
├── uploads/                   # File storage
└── middleware.ts              # Clerk middleware
```

## 🔄 Workflows

### Document Translation Process (Phase 1)

1. **Upload Document**: User uploads supported file format
2. **Select Glossary**: Optional glossary for consistent terminology
3. **Choose Languages**: Source and target language selection
4. **Processing**: Extract text, check translation memory, translate with DeepL, run QA checks
5. **Download**: Translated document ready for download with QA score

### Translation Task Workflow (Phase 2)

1. **Task Creation**: System automatically creates tasks for translation jobs
2. **Assignment**: Translators can take available tasks or admins can assign them
3. **Translation**: Use in-browser editor with TM suggestions and real-time saving
4. **Review Submission**: Translator submits completed work for review
5. **Review Process**: Reviewer/Approver can approve or request changes
6. **Completion**: Approved tasks are finalized and audited

## 🔐 Role-Based Access Control

### User Roles & Permissions
- **Creator**: Upload documents, create translation jobs, view own history
- **Translator**: All creator permissions + edit assigned tasks, submit for review  
- **Reviewer**: All creator permissions + review tasks, request changes
- **Approver**: All reviewer permissions + approve final translations
- **Admin**: Full system access + user management, assign tasks, view all data

### Workflow States
- **Draft**: Task can be edited by assigned translator
- **In Review**: Awaiting reviewer/approver action
- **Changes Requested**: Returned to translator for modifications
- **Approved**: Final state, task completed

## 🎯 Quality Assurance

### Automated QA Checks
- **Glossary Compliance**: Validates consistent use of terminology
- **Number Validation**: Ensures numbers match between source and target
- **Quality Scoring**: 0-100 score based on detected issues
- **Warning Reports**: Detailed segment-level issue identification

### QA Score Calculation
- Base score: 100 points
- Glossary warnings: -10 points each
- Number inconsistencies: -15 points each
- Score displayed in translation history and job details

## 🧪 Testing the Application

### Phase 1 - Basic Translation
1. Sign up/sign in with Clerk
2. Upload a document (.txt, .srt, .docx, or .pdf)
3. Select source and target languages (and optional glossary)
4. Start translation and download result
5. View QA results and quality score

### Phase 2 - Advanced Workflow
1. Create translation tasks (automatically created from jobs)
2. As a translator: take available tasks, edit in the browser editor
3. Use translation memory suggestions and see real-time QA feedback
4. Submit for review when complete
5. As a reviewer: approve or request changes
6. As an admin: manage users, assign tasks, view audit trails

### User Role Testing
- Create users with different roles (creator, translator, reviewer, approver, admin)
- Test role-based navigation and feature access
- Verify permission restrictions work correctly

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Setup
1. Set up PostgreSQL database
2. Configure Clerk for production domain
3. Set DeepL API key
4. Update environment variables

---

Built with ❤️ using Next.js, Drizzle, Clerk, and DeepL.
