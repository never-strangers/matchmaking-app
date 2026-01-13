# Production Implementation Checklist

This document tracks what remains to be implemented for production deployment. The demo version uses localStorage and mock services; production requires real infrastructure.

## Authentication & User Management

### Email OTP
- [ ] Integrate real email service (SendGrid, AWS SES, Resend, etc.)
- [ ] Implement OTP generation with secure random codes (6-8 digits)
- [ ] Store OTPs in database with expiry (5-10 minutes)
- [ ] Rate limiting: max 3 OTP requests per email per hour
- [ ] Email templates for OTP delivery
- [ ] OTP verification endpoint with retry limits

### User Registration
- [ ] Real password hashing (bcrypt/argon2)
- [ ] Email uniqueness validation at database level
- [ ] Phone number validation and formatting
- [ ] Profile photo upload to S3/Cloudinary with image processing
- [ ] Age verification (18+)
- [ ] Terms & Privacy acceptance tracking with version numbers

### User Status & Approval
- [ ] Database triggers for status changes
- [ ] Email notifications via real email service
- [ ] Admin approval queue with filtering/search
- [ ] Rejection reason tracking
- [ ] 24h cooldown enforcement at database level (scheduled jobs)

### City Management
- [ ] City change request workflow with admin approval
- [ ] City lock enforcement at database level (constraints)
- [ ] City validation against allowed list

## Database Schema

### Core Tables
- [ ] `users` table with all profile fields
- [ ] `events` table with capacity, datetime, city
- [ ] `rsvps` table with status enum, hold_expires_at, payment_status
- [ ] `check_ins` table with event_id, user_id, checked_in_at
- [ ] `event_questionnaires` table (per-event answers)
- [ ] `match_results` table with event_id, user_id1, user_id2, score
- [ ] `match_actions` table (like/pass)
- [ ] `mutual_likes` table
- [ ] `notifications` table
- [ ] `matching_runs` table

### Constraints & Indexes
- [ ] Unique constraint: (event_id, user_id) on RSVPs
- [ ] Unique constraint: (event_id, user_id1, user_id2) on match_results
- [ ] Index on rsvps.rsvp_status for capacity queries
- [ ] Index on events.city for filtering
- [ ] Index on users.status for admin queries
- [ ] Foreign key constraints on all relationships

### Migrations
- [ ] Initial schema migration
- [ ] Questionnaire version tracking migration
- [ ] City change request migration
- [ ] Notification system migration

## RSVP & Payment

### RSVP State Machine
- [ ] Database-level state machine enforcement (CHECK constraints or triggers)
- [ ] Background job for hold expiry (every 1-2 minutes)
- [ ] Transaction-safe capacity checking (SELECT FOR UPDATE)
- [ ] Waitlist promotion queue with FIFO ordering
- [ ] Overlap detection query (efficient date range checks)

### Payment Integration
- [ ] Real payment provider (Stripe, PayPal, etc.)
- [ ] Payment intent creation on RSVP hold
- [ ] Webhook handling for payment confirmation
- [ ] Refund processing for cancellations
- [ ] Payment status sync with RSVP status
- [ ] Receipt generation and email delivery

### Capacity Management
- [ ] Real-time capacity tracking (Redis or DB counters)
- [ ] Race condition prevention (pessimistic locking)
- [ ] Waitlist auto-promotion when capacity frees
- [ ] Capacity alerts for admins

## Events & Questionnaire

### Event Management
- [ ] Event CRUD API with validation
- [ ] City-based event filtering (efficient queries)
- [ ] Event visibility rules (approved users only)
- [ ] Event capacity enforcement
- [ ] Event date/time validation (no past events)

### Per-Event Questionnaire
- [ ] Questionnaire answer storage per event
- [ ] Completion threshold enforcement (>=10 answers)
- [ ] Answer locking after RSVP confirmation (database constraint)
- [ ] Questionnaire version tracking
- [ ] Answer editing UI with lock checks

## Matching System

### Matching Algorithm
- [ ] Background job for matching runs
- [ ] Matching constraints enforcement:
  - Gender/orientation filtering
  - Historical exclusion (efficient query)
  - Max 3 matches per person
- [ ] Matching score calculation optimization
- [ ] Matching result persistence
- [ ] Matching run history and analytics

### Match Reveal
- [ ] Match notification delivery (email + in-app)
- [ ] Match reveal timing control
- [ ] Like/pass action tracking
- [ ] Mutual like detection and chat unlock

## Check-in & Event Day

### Check-in System
- [ ] QR code generation for check-in
- [ ] Check-in scanning interface (mobile-friendly)
- [ ] Check-in status tracking
- [ ] Auto-matching trigger when all checked in
- [ ] No-show tracking

## Notifications

### Email Notifications
- [ ] Email service integration
- [ ] Email templates for all notification types:
  - Account approved/rejected
  - RSVP hold expired
  - Waitlist promoted
  - Match revealed
  - Mutual like unlocked
  - City change approved/rejected
- [ ] Email preference management
- [ ] Unsubscribe handling

### In-App Notifications
- [ ] Real-time notification delivery (WebSockets or Server-Sent Events)
- [ ] Notification read/unread tracking
- [ ] Notification preferences
- [ ] Push notifications (mobile app)

## Chat System

### Chat Infrastructure
- [ ] Real-time messaging (WebSockets or Supabase Realtime)
- [ ] Message persistence in database
- [ ] Chat permission checks (mutual like + event match)
- [ ] Message delivery status
- [ ] Typing indicators
- [ ] File/image sharing

## Admin Dashboard

### Admin Features
- [ ] User approval/rejection with bulk actions
- [ ] City change approval workflow
- [ ] Event management (CRUD)
- [ ] Check-in management interface
- [ ] Matching trigger with validation
- [ ] Analytics dashboard:
  - User signups/approvals
  - Event RSVP rates
  - Matching success rates
  - Revenue tracking

### Moderation
- [ ] User reporting system
- [ ] Content moderation tools
- [ ] Suspension/ban functionality
- [ ] Admin audit logs

## Security & Performance

### Security
- [ ] Rate limiting on all endpoints
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation and sanitization
- [ ] Authentication middleware
- [ ] Role-based access control (RBAC)
- [ ] API key management for external services

### Performance
- [ ] Database query optimization
- [ ] Caching strategy (Redis)
- [ ] CDN for static assets
- [ ] Image optimization and lazy loading
- [ ] Pagination for large lists
- [ ] Background job processing (Bull/BullMQ)

## Testing

### Test Coverage
- [ ] Unit tests for stores/logic
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows:
  - Registration → OTP → Approval → RSVP → Payment → Check-in → Matching
- [ ] Load testing for capacity management
- [ ] Security testing

## Infrastructure

### Deployment
- [ ] Production database setup (PostgreSQL)
- [ ] Environment variable management
- [ ] CI/CD pipeline
- [ ] Monitoring and logging (Sentry, DataDog, etc.)
- [ ] Backup strategy
- [ ] Disaster recovery plan

### Background Jobs
- [ ] Job queue setup (Bull/BullMQ, Celery, etc.)
- [ ] Hold expiry cleanup job
- [ ] Waitlist promotion job
- [ ] Email sending queue
- [ ] Matching run job

## Compliance & Legal

### Data Protection
- [ ] GDPR compliance (data export, deletion)
- [ ] Privacy policy implementation
- [ ] Terms of service enforcement
- [ ] Cookie consent management
- [ ] Data retention policies

### Payment Compliance
- [ ] PCI DSS compliance
- [ ] Payment data handling
- [ ] Refund policy implementation

## Analytics & Monitoring

### Analytics
- [ ] User behavior tracking
- [ ] Conversion funnel analysis
- [ ] Event performance metrics
- [ ] Matching algorithm effectiveness
- [ ] Revenue analytics

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database performance monitoring
- [ ] Email delivery monitoring

---

## Notes

- **Demo vs Production**: The demo uses localStorage for all data persistence. Production requires a real database (PostgreSQL recommended).
- **State Management**: Demo uses simple stores. Production may benefit from a state management library (Zustand, Redux) or server-side state.
- **Real-time**: Demo uses BroadcastChannel for cross-tab sync. Production needs WebSockets or Supabase Realtime.
- **Background Jobs**: Demo has no background jobs. Production needs a job queue for hold expiry, waitlist promotion, email sending.
- **Security**: Demo has minimal security. Production needs comprehensive security hardening.
