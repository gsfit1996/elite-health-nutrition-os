# Deployment Guide - Elite Health Nutrition

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Neon PostgreSQL database created
- [ ] Resend account with verified domain
- [ ] GLM-5 API key (provided)
- [ ] Gamma API key (provided)
- [ ] GitHub repository created
- [ ] Vercel account

## Step-by-Step Deployment

### 1. Set Up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project: "elite-health-nutrition-prod"
3. Copy the connection string
4. Save it for later (you'll add it to Vercel)

### 2. Set Up Resend Email

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain (e.g., elitehealth.com)
3. Add the DNS records to your domain provider
4. Wait for verification (usually 5-10 minutes)
5. Create an API key in [API Keys](https://resend.com/api-keys)
6. Save the API key for later

**For Testing**: You can use `onboarding@resend.dev` without domain verification.

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Elite Health Nutrition MVP"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 4. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

5. Add Environment Variables:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/elite_health?sslmode=require
NEXTAUTH_SECRET=<generate-new-secret-for-production>
NEXTAUTH_URL=https://your-domain.vercel.app
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Elite Health <noreply@yourdomain.com>
GLM_5_API_KEY=dcf160ff7511489190d9ba467df3f0fd.U95T1SW5MLFkFD7x
GLM_5_ENDPOINT=https://open.bigmodel.cn/api/paas/v4/chat/completions
GAMMA_API_KEY=sk-gamma-scDMMtwqrcgzA6oShdWyEBzFRJG7yjvHLPMKI71X9c
```

6. Click "Deploy"

### 5. Run Database Migrations

After first deployment:

1. Go to your Vercel project settings
2. Navigate to "Deployments"
3. Click on the latest deployment
4. Click "..." menu → "Redeploy"
5. Check "Use existing Build Cache" is OFF
6. Deploy

Or run migrations locally:
```bash
# Set DATABASE_URL to production database
npx prisma migrate deploy
```

### 6. Verify Deployment

1. Visit your Vercel URL
2. Test sign up flow:
   - Enter email
   - Check email for magic link
   - Click link to sign in
3. Complete questionnaire
4. Verify plan generation
5. Check Gamma export

## Custom Domain Setup

### 1. Add Domain in Vercel

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### 2. Update Environment Variables

Update `NEXTAUTH_URL` to your custom domain:
```env
NEXTAUTH_URL=https://yourdomain.com
```

### 3. Update Resend

Update `EMAIL_FROM` to use your verified domain:
```env
EMAIL_FROM=Elite Health <noreply@yourdomain.com>
```

## Post-Deployment

### Monitor Application

1. **Vercel Analytics**: Automatically enabled
2. **Logs**: Check Vercel dashboard for errors
3. **Database**: Monitor Neon dashboard for queries

### Test Critical Paths

- [ ] User sign up and login
- [ ] Questionnaire completion
- [ ] Plan generation with GLM-5
- [ ] Markdown validation
- [ ] Gamma export
- [ ] Plan viewing
- [ ] Plan regeneration

### Performance Optimization

1. **Database Indexes**: Already optimized in Prisma schema
2. **API Routes**: Use edge runtime where possible
3. **Images**: Optimize with Next.js Image component
4. **Caching**: Implement ISR for static content

## Scaling Considerations

### Database

- **Neon Free Tier**: 0.5 GB storage, 10 GB data transfer
- **Upgrade**: Scale plan as needed
- **Connection Pooling**: Already handled by Neon

### API Rate Limits

- **GLM-5**: Check BigModel API limits
- **Gamma**: Monitor generation limits
- **Resend**: 100 emails/day on free tier

### Monitoring

Consider adding:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Posthog**: Product analytics

## Backup Strategy

### Database Backups

Neon provides automatic backups. To export manually:

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

### Code Backups

- GitHub repository (primary)
- Vercel deployment history
- Local development environment

## Security Checklist

- [ ] NEXTAUTH_SECRET is unique and secure (32+ characters)
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] API keys are not exposed in client-side code
- [ ] Email domain is verified in Resend
- [ ] CORS is properly configured
- [ ] Rate limiting is considered for API routes

## Troubleshooting Production Issues

### "Database connection failed"
- Check DATABASE_URL in Vercel environment variables
- Verify Neon database is active
- Check connection pooling settings

### "Email not sending"
- Verify Resend API key
- Check domain verification status
- Review Resend logs

### "Plan generation timeout"
- Check GLM-5 API status
- Review Vercel function timeout (default 10s, max 60s on Pro)
- Consider implementing queue system for long-running tasks

### "Gamma export stuck"
- Check Gamma API status
- Review polling interval (currently 5s)
- Verify generationId is stored correctly

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs
- **Monthly**: Check API usage and costs
- **Quarterly**: Update dependencies
- **As Needed**: Scale database and services

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest

# Test after updates
npm run build
npm run dev
```

## Rollback Procedure

If deployment fails:

1. Go to Vercel dashboard
2. Navigate to Deployments
3. Find last working deployment
4. Click "..." → "Promote to Production"

## Support

For production issues:
- Check Vercel logs
- Review Neon database metrics
- Check Resend delivery logs
- Monitor GLM-5 API status
- Review Gamma API status

## Next Steps

After successful deployment:

1. **Custom Domain**: Set up your branded domain
2. **Analytics**: Add product analytics
3. **Monitoring**: Set up error tracking
4. **Marketing**: Create landing page content
5. **User Feedback**: Implement feedback collection
6. **Iteration**: Improve based on user data
