# Elite Health Nutrition MVP

A production-ready web app that generates personalized 90-day nutrition plans using AI.

## Features

- **Magic Link Authentication** - Secure, passwordless login via email
- **Smart Questionnaire** - 4-step onboarding with 22 high-leverage questions
- **AI-Powered Plans** - GLM-5 generates personalized nutrition plans in strict Elite Health format
- **Automatic Validation** - Validates and repairs generated plans to ensure quality
- **Gamma Export** - Automatically exports plans to beautiful Gamma documents
- **Plan Versioning** - Track and regenerate plans as needs change
- **Real-time Status** - Live updates on Gamma document generation

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Authentication**: NextAuth.js with Resend email provider
- **AI**: GLM-5 (BigModel API)
- **Export**: Gamma Generate API
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Resend account for email
- GLM-5 API key
- Gamma API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd elite-health-nutrition-os
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `RESEND_API_KEY` - Your Resend API key
- `EMAIL_FROM` - Your verified sender email
- `GLM_5_API_KEY` - Your GLM-5 API key (provided)
- `GAMMA_API_KEY` - Your Gamma API key (provided)

4. Set up the database:
```bash
npm run db:generate
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── lib/                   # Core utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── glm5.ts           # GLM-5 API integration
│   ├── gamma.ts          # Gamma API integration
│   ├── derived-targets.ts # Nutrition calculations
│   └── markdown-validator.ts # Plan validation
├── prompts/               # LLM prompt templates
├── questionnaire/         # Questionnaire schema & types
└── types/                 # TypeScript types
```

## User Journey

1. **Sign Up / Login** - User enters email, receives magic link
2. **Complete Questionnaire** - 4-step form with 22 questions
3. **Plan Generation** - Server calculates targets and calls GLM-5
4. **Validation** - Markdown is validated and repaired if needed
5. **Gamma Export** - Plan is sent to Gamma for document generation
6. **View Plan** - User sees plan with derived targets and Gamma status
7. **Regenerate** - User can update questionnaire and regenerate plan

## API Integrations

### GLM-5 (BigModel)
- **Endpoint**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **Model**: glm-4
- **Purpose**: Generate personalized nutrition plans

### Gamma
- **Endpoint**: `https://public-api.gamma.app/v1.0/generations`
- **Purpose**: Export plans to beautiful documents
- **Features**: Async generation with status polling

## Database Schema

- **User** - Authentication and profile
- **Questionnaire** - Health data and preferences (versioned)
- **NutritionPlan** - Generated plans (versioned)
- **GammaGeneration** - Async export status tracking

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Prisma Studio (database GUI)
npm run db:studio

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- Update `NEXTAUTH_URL` to your production domain
- Use production database URL
- Verify email sender domain in Resend

## Key Features

### Derived Targets Calculation
- **Protein**: 0.9-1.05g per lb of body weight
- **Calories**: Mifflin-St Jeor BMR × activity factor ± goal adjustment
- **Activity Factor**: Based on daily steps + training frequency

### Markdown Validation
- Validates 13 required sections
- Checks item counts (3 breakfast, 6 lunch, 3 pre-bed, 8-12 snacks, 3-5 supplements)
- Ensures protein range is mentioned
- Auto-repair with GLM-5 if validation fails

### Plan Versioning
- Each regeneration creates a new version
- Tracks questionnaire changes
- Maintains history for comparison

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Run `npm run db:push` to sync schema

### Email Not Sending
- Verify Resend API key
- Check sender domain is verified
- Review Resend dashboard for errors

### GLM-5 API Errors
- Verify API key is correct
- Check API endpoint is accessible
- Review rate limits

### Gamma Generation Stuck
- Check Gamma API key
- Review Gamma dashboard for generation status
- Check API rate limits

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
