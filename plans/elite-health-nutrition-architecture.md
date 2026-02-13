# Elite Health Nutrition MVP - Architecture Plan

## Overview

A production-ready MVP web app that collects user health data through an onboarding questionnaire, generates personalized 90-day nutrition plans using GLM-5, exports to Gamma for presentation, and manages plan versioning.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client [Next.js App Router - Client]
        UI[UI Components]
        Auth[NextAuth Session]
        Forms[Questionnaire Forms]
        PlanView[Plan Display]
    end

    subgraph Server [Next.js Server Actions + API Routes]
        Actions[Server Actions]
        API[API Routes]
        AuthAPI[Auth Handlers]
    end

    subgraph External [External Services]
        GLM5[GLM-5 API]
        Gamma[Gamma API]
        Email[Email Service]
    end

    subgraph Data [Data Layer]
        Prisma[Prisma ORM]
        PG[(PostgreSQL)]
    end

    UI --> Actions
    Forms --> Actions
    PlanView --> API
    Auth --> AuthAPI
    AuthAPI --> Email
    
    Actions --> Prisma
    API --> Prisma
    Prisma --> PG
    
    Actions --> GLM5
    Actions --> Gamma
    API --> Gamma
```

---

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant DB as PostgreSQL
    participant GLM as GLM-5 API
    participant G as Gamma API

    U->>C: Sign up / Login
    C->>S: Auth request
    S->>U: Magic link email
    U->>C: Click magic link
    S->>C: Session created

    U->>C: Start questionnaire
    C->>C: Save draft to localStorage
    U->>C: Complete step
    C->>S: Save step answers
    S->>DB: Store answers

    U->>C: Submit questionnaire
    S->>S: Calculate derived targets
    S->>DB: Archive old questionnaires
    S->>DB: Create active questionnaire

    S->>GLM: Generate plan markdown
    GLM-->>S: Markdown response
    S->>S: Validate markdown
    alt Invalid
        S->>GLM: Repair prompt
        GLM-->>S: Fixed markdown
        S->>S: Re-validate
    end
    S->>DB: Save NutritionPlan

    S->>G: POST to Gamma
    G-->>S: generationId
    S->>DB: Create GammaGeneration

    loop Poll until complete
        S->>G: GET status
        G-->>S: status + gammaUrl
    end
    S->>DB: Update GammaGeneration

    C->>S: Request plan
    S->>DB: Fetch plan + gamma status
    S-->>C: Plan data
    C->>U: Display plan + Gamma link
```

---

## Project Structure

```
elite-health-nutrition-os/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── verify-request/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── questionnaire/
│   │   │   │   └── page.tsx
│   │   │   └── plan/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── gamma/
│   │   │   │   ├── status/[id]/route.ts
│   │   │   │   └── generate/route.ts
│   │   │   └── plan/
│   │   │       └── [id]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── questionnaire/
│   │   │   ├── QuestionnaireForm.tsx
│   │   │   ├── StepNavigation.tsx
│   │   │   └── steps/
│   │   │       ├── StatsGoalStep.tsx
│   │   │       ├── RoutineStep.tsx
│   │   │       ├── TrainingStep.tsx
│   │   │       └── PreferencesStep.tsx
│   │   ├── plan/
│   │   │   ├── PlanDisplay.tsx
│   │   │   ├── GammaStatus.tsx
│   │   │   └── DerivedTargets.tsx
│   │   └── auth/
│   │       └── LoginForm.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── glm5.ts
│   │   ├── gamma.ts
│   │   ├── derived-targets.ts
│   │   └── markdown-validator.ts
│   ├── questionnaire/
│   │   ├── schema.ts
│   │   ├── questions.ts
│   │   └── types.ts
│   ├── prompts/
│   │   ├── system-prompt.ts
│   │   ├── user-prompt.ts
│   │   └── repair-prompt.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Model Details

### User
- Primary entity for authentication
- Has many Questionnaires and NutritionPlans
- Uses CUID for IDs

### Questionnaire
- Stores user health data as JSON
- Version tracking for changes
- Status: active or archived
- Only one active per user

### NutritionPlan
- Links to User and Questionnaire
- Contains generated markdown
- Stores derived targets as JSON
- Version tracking for regeneration
- Has one GammaGeneration

### GammaGeneration
- Async status tracking
- Stores Gamma API responses
- Links to NutritionPlan

---

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Magic link request
- `GET /api/auth/callback` - Magic link callback

### Questionnaire
- `GET /api/questionnaire` - Get active questionnaire
- `POST /api/questionnaire` - Save step answers
- `POST /api/questionnaire/complete` - Mark complete and generate plan

### Plan
- `GET /api/plan` - Get latest plan for user
- `GET /api/plan/[id]` - Get specific plan version
- `POST /api/plan/regenerate` - Regenerate plan from questionnaire

### Gamma
- `POST /api/gamma/generate` - Start Gamma generation
- `GET /api/gamma/status/[id]` - Poll Gamma status

---

## Questionnaire Steps

### Step 1: Stats + Goal
- firstName, sex, age, heightCm, weightKg, primaryGoal

### Step 2: Routine Constraints
- wakeTime, sleepTime, workSchedule, kitchenAccessDaytime, mealPrepWillingness

### Step 3: Training/Activity
- trainingDaysPerWeek, trainingTimeOfDay, dailySteps

### Step 4: Preferences + Real Life
- dietStyle, allergiesIntolerances, foodsLove, foodsHateAvoid, proteinPreferences
- biggestObstacle, takeawaysAndOrders, alcoholPerWeek

---

## Derived Targets Calculation

```typescript
// Weight conversion
const weightLb = weightKg * 2.20462;

// Protein calculation
const proteinTarget = weightLb * 1.0;
const proteinMin = Math.round(proteinTarget * 0.90);
const proteinMax = Math.round(proteinTarget * 1.05);

// BMR calculation - Mifflin-St Jeor
let BMR: number;
if (sex === 'Male') {
  BMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
} else {
  BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

// Activity factor
let activityFactor = 1.35; // <5k steps
if (dailySteps === '5-8k') activityFactor = 1.45;
else if (dailySteps === '8-12k') activityFactor = 1.55;
else if (dailySteps === '12k+') activityFactor = 1.65;

if (trainingDaysPerWeek >= 4) activityFactor += 0.05;

const TDEE = BMR * activityFactor;

// Goal mode calories
let caloriesPerDay: number;
let goalMode: string;
switch (primaryGoal) {
  case 'Fat loss':
    caloriesPerDay = TDEE - 400;
    goalMode = 'fat_loss';
    break;
  case 'Recomposition':
    caloriesPerDay = TDEE - 150;
    goalMode = 'recomp';
    break;
  case 'Muscle gain':
    caloriesPerDay = TDEE + 200;
    goalMode = 'muscle_gain';
    break;
  case 'Energy + focus':
    caloriesPerDay = TDEE;
    goalMode = 'maintenance';
    break;
}
```

---

## GLM-5 Integration

### API Configuration
- Endpoint: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- Authentication: API Key in Authorization header (Bearer token)
- Model: GLM-5 (glm-4 or glm-4-plus for better quality)

### Request Flow
1. Build system prompt from template
2. Build user prompt with questionnaire data
3. Call GLM-5 API
4. Validate response markdown
5. If invalid, call repair prompt once
6. Save valid markdown

---

## Markdown Validator

### Validation Rules

1. **Title Check**
   - Must contain: `**Welcome to your Elite Health Nutrition Plan, {firstName}**`

2. **Required Sections** - Must exist in order:
   - Opening
   - Your 90-Day Targets
   - We'll achieve this with:
   - Table of Contents
   - 13 numbered sections as specified

3. **Content Counts**
   - Breakfast options: exactly 3
   - Lunch: 3 home + 3 out/office
   - Pre-bed: 3
   - Snacks: 8-12
   - Supplements: 3-5 max

### Implementation Approach
- Use regex to split by headings
- Count items in each section
- Return list of issues for repair prompt

---

## Gamma API Integration

### POST - Start Generation
```typescript
const response = await fetch('https://public-api.gamma.app/v1.0/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': process.env.GAMMA_API_KEY,
  },
  body: JSON.stringify({
    inputText: markdown,
    textMode: 'preserve',
    format: 'document',
    cardSplit: 'inputTextBreaks',
    numCards: 30,
    imageOptions: { source: 'noImages' },
    exportAs: 'pdf',
    additionalInstructions: 'Keep formatting clean. Preserve headings. Use a professional, minimal style.',
  }),
});
```

### GET - Poll Status
```typescript
const response = await fetch(
  `https://public-api.gamma.app/v1.0/generations/${generationId}`,
  {
    headers: {
      'X-API-KEY': process.env.GAMMA_API_KEY,
      'accept': 'application/json',
    },
  }
);
```

### Status Flow
1. Create GammaGeneration with status: queued
2. POST to Gamma, store generationId, set status: pending
3. Poll GET endpoint every 5-10 seconds
4. When status: completed, store gammaUrl and export URLs
5. If error, store error message

---

## Environment Variables

```env
# Database - Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/elite_health?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Email - Resend
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Elite Health <noreply@elitehealth.com>"

# GLM-5 API - BigModel
GLM_5_API_KEY="your-glm-5-api-key"
GLM_5_ENDPOINT="https://open.bigmodel.cn/api/paas/v4/chat/completions"

# Gamma API
GAMMA_API_KEY="your-gamma-api-key"
```

---

## Security Considerations

1. **API Keys**: Never expose on client-side
2. **Authentication**: Magic links expire after use
3. **Data Validation**: Zod schemas on all inputs
4. **Rate Limiting**: Consider for API routes
5. **CORS**: Configure for production domain

---

## Deployment Checklist

- [ ] Set up Neon PostgreSQL database
- [ ] Configure environment variables in Vercel
- [ ] Run Prisma migrations (`npx prisma migrate dev`)
- [ ] Set up Resend account and verify domain
- [ ] Configure NextAuth URL for production
- [ ] Test GLM-5 API connectivity from server
- [ ] Test Gamma API connectivity from server
- [ ] Set up monitoring (Vercel Analytics, Sentry optional)

---

## Implementation Order

1. **Phase 1: Foundation**
   - Next.js project setup
   - Tailwind + shadcn/ui
   - Prisma schema and migrations
   - NextAuth with email provider

2. **Phase 2: Questionnaire**
   - Questionnaire schema and types
   - Multi-step form UI
   - Step persistence
   - LocalStorage drafts

3. **Phase 3: Plan Generation**
   - Derived targets calculation
   - GLM-5 integration
   - Prompt templates
   - Markdown validator
   - Repair flow

4. **Phase 4: Gamma Integration**
   - Gamma API client
   - Async generation
   - Status polling
   - Error handling

5. **Phase 5: Plan Display**
   - Markdown rendering
   - Gamma status badge
   - Version history
   - Regeneration flow

6. **Phase 6: Polish**
   - Loading states
   - Error handling
   - Responsive design
   - Testing
