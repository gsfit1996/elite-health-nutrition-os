# Elite Health Nutrition - Feature Documentation

## Core Features

### 1. Magic Link Authentication

**Implementation**: NextAuth.js with Resend email provider

**User Experience**:
- User enters email address
- Receives magic link via email
- Clicks link to sign in (no password needed)
- Session persists across visits

**Security**:
- Links expire after 24 hours
- One-time use only
- JWT-based sessions
- Secure HTTP-only cookies

**Files**:
- [`src/lib/auth.ts`](src/lib/auth.ts) - NextAuth configuration
- [`src/app/api/auth/[...nextauth]/route.ts`](src/app/api/auth/[...nextauth]/route.ts) - Auth API routes
- [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx) - Login UI

---

### 2. Smart Questionnaire

**Implementation**: Multi-step form with React Hook Form + Zod validation

**Features**:
- 4 steps, 22 questions
- Real-time validation
- LocalStorage draft saving
- Server-side persistence
- Progress indicator
- Mobile-responsive

**Question Categories**:
1. **Stats + Goal** (6 questions)
   - firstName, sex, age, heightCm, weightKg, primaryGoal

2. **Routine Constraints** (5 questions)
   - wakeTime, sleepTime, workSchedule, kitchenAccessDaytime, mealPrepWillingness

3. **Training/Activity** (3 questions)
   - trainingDaysPerWeek, trainingTimeOfDay, dailySteps

4. **Preferences + Real Life** (8 questions)
   - dietStyle, allergiesIntolerances, foodsLove, foodsHateAvoid
   - proteinPreferences, biggestObstacle, takeawaysAndOrders, alcoholPerWeek

**Files**:
- [`src/questionnaire/schema.ts`](src/questionnaire/schema.ts) - Zod schemas
- [`src/app/(dashboard)/questionnaire/page.tsx`](src/app/(dashboard)/questionnaire/page.tsx) - UI component
- [`src/app/api/questionnaire/route.ts`](src/app/api/questionnaire/route.ts) - Save API
- [`src/app/api/questionnaire/complete/route.ts`](src/app/api/questionnaire/complete/route.ts) - Completion API

---

### 3. Derived Targets Calculation

**Implementation**: Server-side deterministic calculations

**Calculations**:

**Protein Target**:
```
weightLb = weightKg × 2.20462
proteinTarget = weightLb × 1.0
proteinMin = round(proteinTarget × 0.90)
proteinMax = round(proteinTarget × 1.05)
```

**Calorie Target** (Mifflin-St Jeor):
```
Male BMR = 10×weightKg + 6.25×heightCm - 5×age + 5
Female BMR = 10×weightKg + 6.25×heightCm - 5×age - 161

Activity Factor:
- <5k steps: 1.35
- 5-8k steps: 1.45
- 8-12k steps: 1.55
- 12k+ steps: 1.65
- +0.05 if training ≥4 days/week

TDEE = BMR × activityFactor

Goal Adjustments:
- Fat loss: TDEE - 400
- Recomposition: TDEE - 150
- Muscle gain: TDEE + 200
- Energy + focus: TDEE
```

**Output**:
```json
{
  "weightKg": 75,
  "weightLb": 165.3,
  "proteinMin": 149,
  "proteinMax": 174,
  "caloriesPerDay": 2200,
  "goalMode": "fat_loss",
  "bmr": 1750,
  "tdee": 2600,
  "activityFactor": 1.50
}
```

**Files**:
- [`src/lib/derived-targets.ts`](src/lib/derived-targets.ts) - Calculation logic

---

### 4. AI Plan Generation (GLM-5)

**Implementation**: BigModel GLM-5 API integration

**Process**:
1. Build system prompt (Elite Health format rules)
2. Build user prompt (questionnaire data + derived targets)
3. Call GLM-5 API
4. Validate markdown response
5. If invalid, call repair prompt once
6. Re-validate
7. Save plan to database

**Prompt Templates**:
- **System Prompt**: Elite Health format rules and requirements
- **User Prompt**: Client brief with all questionnaire data
- **Repair Prompt**: Fix validation issues

**API Configuration**:
- Endpoint: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- Model: glm-4
- Temperature: 0.7
- Max Tokens: 8000

**Files**:
- [`src/lib/glm5.ts`](src/lib/glm5.ts) - API integration
- [`src/prompts/system-prompt.ts`](src/prompts/system-prompt.ts) - System prompt
- [`src/prompts/user-prompt.ts`](src/prompts/user-prompt.ts) - User prompt builder
- [`src/prompts/repair-prompt.ts`](src/prompts/repair-prompt.ts) - Repair prompt builder

---

### 5. Markdown Validation

**Implementation**: Regex-based validation with detailed error reporting

**Validation Rules**:

1. **Title Check**:
   - Must include: `**Welcome to your Elite Health Nutrition Plan, {firstName}**`

2. **Required Sections** (must exist in order):
   - Opening (2-4 lines)
   - Your 90-Day Targets
   - We'll achieve this with:
   - Table of Contents
   - 13 numbered sections

3. **Content Counts**:
   - Breakfast options: exactly 3
   - Lunch options: 6 (3 home + 3 out/office)
   - Pre-bed meals: exactly 3
   - Snacks: 8-12 ideas
   - Supplements: 3-5 max

4. **Protein Range**:
   - Must explicitly mention protein grams range

**Repair Flow**:
1. Validate initial markdown
2. If invalid, generate list of issues
3. Call GLM-5 with repair prompt
4. Re-validate repaired markdown
5. If still invalid, return errors to user

**Files**:
- [`src/lib/markdown-validator.ts`](src/lib/markdown-validator.ts) - Validation logic

---

### 6. Gamma Export

**Implementation**: Async generation with status polling

**Process**:
1. Create GammaGeneration record (status: queued)
2. POST to Gamma API with markdown
3. Receive generationId
4. Update status to pending
5. Client polls status endpoint every 5 seconds
6. Server polls Gamma API
7. When completed, store gammaUrl and exportUrl
8. Display link to user

**API Configuration**:
```json
{
  "inputText": "markdown content",
  "textMode": "preserve",
  "format": "document",
  "cardSplit": "inputTextBreaks",
  "numCards": 30,
  "imageOptions": { "source": "noImages" },
  "exportAs": "pdf",
  "additionalInstructions": "Keep formatting clean..."
}
```

**Status Flow**:
- queued → pending → completed/failed

**Files**:
- [`src/lib/gamma.ts`](src/lib/gamma.ts) - Gamma API integration
- [`src/app/api/gamma/status/[planId]/route.ts`](src/app/api/gamma/status/[planId]/route.ts) - Status polling API

---

### 7. Plan Display

**Implementation**: React Markdown with custom styling

**Features**:
- Markdown rendering with syntax highlighting
- Derived targets summary card
- Gamma status badge
- Export links (Gamma, PDF)
- Version indicator
- Regenerate button

**Derived Targets Display**:
- Protein range (green)
- Calories (blue)
- Goal mode (purple)
- Version number (orange)

**Gamma Status Badge**:
- **Ready** (green): Gamma document is ready
- **Processing** (gray): Generation in progress
- **Failed** (red): Generation failed

**Files**:
- [`src/app/(dashboard)/plan/page.tsx`](src/app/(dashboard)/plan/page.tsx) - Plan display UI
- [`src/app/api/plan/route.ts`](src/app/api/plan/route.ts) - Fetch plan API

---

### 8. Plan Versioning

**Implementation**: Database-backed version tracking

**Features**:
- Each plan has a version number
- Versions increment on regeneration
- Linked to questionnaire version
- Maintains history

**Versioning Logic**:
```typescript
const latestPlan = await prisma.nutritionPlan.findFirst({
  where: { userId },
  orderBy: { version: "desc" },
})
const newVersion = (latestPlan?.version || 0) + 1
```

**Use Cases**:
- Track plan evolution
- Compare different versions
- Rollback if needed
- Audit trail

**Files**:
- [`src/app/api/plan/regenerate/route.ts`](src/app/api/plan/regenerate/route.ts) - Regeneration logic

---

### 9. Questionnaire Versioning

**Implementation**: Active/archived status system

**Behavior**:
- Only one active questionnaire per user
- On completion, previous questionnaires are archived
- Maintains history for plan regeneration

**Status Flow**:
```
active → archived (when new questionnaire completed)
```

**Files**:
- [`prisma/schema.prisma`](prisma/schema.prisma) - Database schema

---

### 10. Real-time Status Updates

**Implementation**: Client-side polling with React hooks

**Features**:
- Polls Gamma status every 5 seconds
- Updates UI in real-time
- Stops polling when completed/failed
- Shows progress indicator

**Polling Logic**:
```typescript
useEffect(() => {
  if (status === "pending" || status === "queued") {
    const interval = setInterval(async () => {
      // Poll API
      // Update state
      // Stop if completed/failed
    }, 5000)
    return () => clearInterval(interval)
  }
}, [status])
```

**Files**:
- [`src/app/(dashboard)/plan/page.tsx`](src/app/(dashboard)/plan/page.tsx) - Polling implementation

---

## Technical Highlights

### Type Safety
- Full TypeScript coverage
- Zod runtime validation
- Prisma type generation
- React Hook Form type inference

### Performance
- Server-side rendering
- Optimistic UI updates
- LocalStorage caching
- Efficient database queries

### User Experience
- Mobile-first design
- Loading states
- Error handling
- Toast notifications
- Progress indicators

### Code Quality
- Modular architecture
- Separation of concerns
- Reusable components
- Clear naming conventions

## Future Enhancements

### Potential Features
- [ ] Plan comparison view
- [ ] Export to PDF directly
- [ ] Email plan to user
- [ ] Progress tracking dashboard
- [ ] Meal logging
- [ ] Recipe database
- [ ] Shopping list generator
- [ ] Mobile app
- [ ] Social sharing
- [ ] Coach dashboard

### Technical Improvements
- [ ] Add rate limiting
- [ ] Implement caching layer
- [ ] Add error tracking (Sentry)
- [ ] Add analytics (Posthog)
- [ ] Optimize bundle size
- [ ] Add E2E tests
- [ ] Add unit tests
- [ ] Implement CI/CD
- [ ] Add monitoring
- [ ] Add logging

## API Documentation

### Internal APIs

#### POST /api/questionnaire
Save questionnaire step progress

**Request**:
```json
{
  "step": 0,
  "answers": { ... }
}
```

**Response**:
```json
{
  "questionnaire": { ... }
}
```

#### POST /api/questionnaire/complete
Complete questionnaire and generate plan

**Request**:
```json
{
  "firstName": "John",
  "sex": "Male",
  ...
}
```

**Response**:
```json
{
  "success": true,
  "plan": { ... },
  "validation": { ... },
  "wasRepaired": false
}
```

#### GET /api/plan
Get latest nutrition plan

**Response**:
```json
{
  "plan": {
    "id": "...",
    "version": 1,
    "title": "...",
    "markdown": "...",
    "derivedTargets": { ... },
    "gammaGeneration": { ... }
  }
}
```

#### POST /api/plan/regenerate
Regenerate plan from active questionnaire

**Response**:
```json
{
  "success": true,
  "plan": { ... },
  "validation": { ... },
  "wasRepaired": false
}
```

#### GET /api/gamma/status/[planId]
Poll Gamma generation status

**Response**:
```json
{
  "gammaGeneration": {
    "id": "...",
    "status": "completed",
    "generationId": "...",
    "gammaUrl": "https://gamma.app/...",
    "lastPayload": { ... }
  }
}
```

## Data Flow

### Plan Generation Flow

```
User submits questionnaire
  ↓
Server validates with Zod
  ↓
Calculate derived targets
  ↓
Archive old questionnaires
  ↓
Create new active questionnaire
  ↓
Build GLM-5 prompts
  ↓
Call GLM-5 API
  ↓
Validate markdown
  ↓
[If invalid] Repair with GLM-5
  ↓
[If still invalid] Return errors
  ↓
Save NutritionPlan to database
  ↓
Create GammaGeneration record
  ↓
POST to Gamma API (async)
  ↓
Store generationId
  ↓
Client polls status
  ↓
Server polls Gamma API
  ↓
Update status when complete
  ↓
Display plan + Gamma link
```

### Authentication Flow

```
User enters email
  ↓
Server generates magic link
  ↓
Resend sends email
  ↓
User clicks link
  ↓
NextAuth verifies token
  ↓
Create session
  ↓
Redirect to dashboard
```

## Component Architecture

### UI Components (shadcn/ui)
- Button
- Input
- Label
- Select
- Textarea
- Card
- Progress
- Badge
- Toast

### Page Components
- HomePage - Landing page
- LoginPage - Authentication
- DashboardPage - User dashboard
- QuestionnairePage - Multi-step form
- PlanPage - Plan display

### Layout Components
- RootLayout - App wrapper with providers
- Providers - SessionProvider + ThemeProvider

## State Management

### Client State
- React Hook Form (form state)
- useState (UI state)
- useSession (auth state)
- LocalStorage (draft persistence)

### Server State
- PostgreSQL (persistent data)
- Prisma (ORM)
- NextAuth sessions (JWT)

## Error Handling

### Client-Side
- Form validation errors
- API request errors
- Toast notifications
- Loading states

### Server-Side
- Try-catch blocks
- Error logging
- Graceful degradation
- User-friendly error messages

## Performance Optimizations

### Database
- Indexed fields (email, userId)
- Efficient queries
- Connection pooling (Neon)

### Frontend
- Code splitting (Next.js automatic)
- Image optimization
- Font optimization
- CSS purging (Tailwind)

### API
- Server-side rendering
- API route optimization
- Async operations (Gamma)

## Security Measures

### Authentication
- Magic links (no passwords)
- JWT sessions
- HTTP-only cookies
- CSRF protection (NextAuth)

### API Security
- Server-side API keys
- Environment variables
- Input validation (Zod)
- SQL injection protection (Prisma)

### Data Protection
- User data isolation
- Ownership verification
- Secure connections (SSL)

## Monitoring & Logging

### Built-in
- Console logging
- Error boundaries
- Vercel Analytics

### Recommended Additions
- Sentry (error tracking)
- LogRocket (session replay)
- Posthog (product analytics)

## Testing Strategy

### Manual Testing
1. Sign up flow
2. Questionnaire completion
3. Plan generation
4. Gamma export
5. Plan regeneration
6. Error scenarios

### Automated Testing (Future)
- Unit tests (Jest)
- Integration tests (Playwright)
- E2E tests (Cypress)
- API tests (Supertest)

## Maintenance

### Regular Tasks
- Monitor error logs
- Check API usage
- Review user feedback
- Update dependencies
- Database backups

### Scaling Considerations
- Database connection limits
- API rate limits
- Vercel function timeouts
- Storage limits

## Known Limitations

### Current MVP Limitations
1. Single user per email
2. No plan comparison view
3. No direct PDF export
4. No meal logging
5. No progress tracking
6. No coach dashboard
7. No payment integration

### API Limitations
1. GLM-5 rate limits (check BigModel docs)
2. Gamma generation time (1-2 minutes)
3. Resend email limits (100/day free tier)
4. Vercel function timeout (10s default, 60s max)

## Extensibility

### Easy to Add
- New questionnaire fields
- Additional validation rules
- Custom prompt templates
- New UI components
- Additional export formats

### Requires Architecture Changes
- Multi-user organizations
- Real-time collaboration
- Mobile app
- Payment processing
- Advanced analytics

## Best Practices

### Code Organization
- Feature-based structure
- Colocated components
- Shared utilities in /lib
- Type definitions in /types

### Git Workflow
- Feature branches
- Descriptive commits
- Pull request reviews
- Semantic versioning

### Deployment
- Environment-specific configs
- Staged rollouts
- Rollback procedures
- Health checks

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth Docs](https://next-auth.js.org/)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com/)

### APIs
- [BigModel GLM-5](https://open.bigmodel.cn/dev/api)
- [Gamma API](https://gamma.app/docs/api)
- [Resend API](https://resend.com/docs)

### Tools
- [Neon Console](https://console.neon.tech/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Resend Dashboard](https://resend.com/emails)
