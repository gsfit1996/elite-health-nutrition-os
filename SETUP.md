# Elite Health Nutrition - Setup Guide

## Quick Start

Follow these steps to get the application running locally.

### 1. Database Setup (Neon)

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project called "elite-health-nutrition"
3. Copy the connection string
4. Paste it into `.env.local` as `DATABASE_URL`

Example:
```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/elite_health?sslmode=require"
```

### 2. Email Setup (Resend)

1. Go to [Resend](https://resend.com/)
2. Sign up and verify your account
3. Add and verify your sending domain (or use resend.dev for testing)
4. Create an API key
5. Add to `.env.local`:

```
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Elite Health <noreply@yourdomain.com>"
```

For development, you can use:
```
EMAIL_FROM="Elite Health <onboarding@resend.dev>"
```

### 3. NextAuth Secret

Generate a secure secret:
```bash
openssl rand -base64 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.env.local`:
```
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. API Keys

The GLM-5 and Gamma API keys are already provided in the task:

```
GLM_5_API_KEY="your-glm-5-api-key"
GLM_5_ENDPOINT="https://open.bigmodel.cn/api/paas/v4/chat/completions"
GAMMA_API_KEY="your-gamma-api-key"
```

### 5. Initialize Database

Run Prisma migrations:
```bash
npm run db:generate
npm run db:push
```

This will:
- Generate the Prisma Client
- Push the schema to your database
- Create all tables

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Complete .env.local Example

```env
# Database - Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/elite_health?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-generated-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Email - Resend
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Elite Health <onboarding@resend.dev>"

# GLM-5 API - BigModel
GLM_5_API_KEY="your-glm-5-api-key"
GLM_5_ENDPOINT="https://open.bigmodel.cn/api/paas/v4/chat/completions"

# Gamma API
GAMMA_API_KEY="your-gamma-api-key"
```

## Testing the Application

### 1. Sign Up

1. Go to http://localhost:3000
2. Click "Get Started Free"
3. Enter your email
4. Check your email for the magic link
5. Click the link to sign in

### 2. Complete Questionnaire

1. Fill out all 4 steps:
   - Stats + Goal
   - Routine Constraints
   - Training/Activity
   - Preferences + Real Life
2. Click "Generate My Plan"

### 3. View Your Plan

1. Wait for plan generation (30-60 seconds)
2. View your personalized nutrition plan
3. See derived targets (protein, calories)
4. Check Gamma export status
5. Click "Open in Gamma" when ready

### 4. Regenerate Plan

1. Click "Edit Questionnaire"
2. Update your answers
3. Click "Regenerate Plan"
4. View new version

## Troubleshooting

### "Cannot connect to database"
- Verify DATABASE_URL is correct
- Check Neon dashboard - database should be active
- Ensure connection string includes `?sslmode=require`

### "Failed to send verification email"
- Check RESEND_API_KEY is valid
- Verify EMAIL_FROM domain is verified in Resend
- For testing, use `onboarding@resend.dev`

### "GLM-5 API error"
- Verify GLM_5_API_KEY is correct
- Check API endpoint is accessible
- Review BigModel API documentation for rate limits

### "Gamma generation failed"
- Check GAMMA_API_KEY is valid
- Review Gamma dashboard for errors
- Ensure markdown is valid

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Delete `.next` folder and rebuild
- Check Node.js version (18+ required)

## Database Management

### View Database
```bash
npm run db:studio
```

This opens Prisma Studio at http://localhost:5555

### Reset Database
```bash
npx prisma migrate reset
```

⚠️ This will delete all data!

### Create Migration
```bash
npx prisma migrate dev --name your_migration_name
```

## Production Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Update `NEXTAUTH_URL` to your production domain
5. Deploy

### Environment Variables Checklist

- [ ] DATABASE_URL (production database)
- [ ] NEXTAUTH_SECRET (new secret for production)
- [ ] NEXTAUTH_URL (your production domain)
- [ ] RESEND_API_KEY
- [ ] EMAIL_FROM (verified domain)
- [ ] GLM_5_API_KEY
- [ ] GLM_5_ENDPOINT
- [ ] GAMMA_API_KEY

## Architecture

See [`plans/elite-health-nutrition-architecture.md`](plans/elite-health-nutrition-architecture.md) for detailed architecture documentation.

## Support

For issues or questions:
1. Check this setup guide
2. Review the architecture documentation
3. Check the troubleshooting section
4. Open an issue on GitHub
