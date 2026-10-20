import { z } from 'zod';

export const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export const BehaviorCategorySchema = z.enum([
  'HEALTH',
  'HABIT',
  'SUBSTANCE',
  'MINDFULNESS',
  'DIGITAL',
  'PRODUCTIVITY',
  'OTHER'
]);

export const MeasurementTypeSchema = z.enum(['COUNT', 'NUMERIC']);

export const GoalTypeSchema = z.enum(['ABSTINENCE', 'REDUCTION', 'FREQUENCY']);
export const EvaluationPeriodSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export const DailyReviewStatusSchema = z.enum([
  'CONFIRMED_ZERO',
  'LOGGED',
  'PENDING',
  'EXCLUDED'
]);

export const CreateBehaviorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name cannot exceed 80 characters'),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional().nullable(),
  category: BehaviorCategorySchema,
  icon: z.string().min(1, 'Icon identifier is required'),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code'),
  measurementType: MeasurementTypeSchema,
  unit: z.string().max(30, 'Unit cannot exceed 30 characters').optional().nullable()
});

export const UpdateBehaviorSchema = CreateBehaviorSchema.partial();

export const CreateEntrySchema = z.object({
  behaviorId: z.string().uuid('Behavior ID must be a valid UUID'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  occurredAt: z.string().datetime({ message: 'Must be a valid ISO 8601 date-time string' }),
  timezone: z.string().min(1, 'Timezone is required'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  contextTags: z.array(z.string().max(40)).default([])
});

export const UpdateEntrySchema = z.object({
  quantity: z.number().positive('Quantity must be greater than zero').optional(),
  occurredAt: z.string().datetime().optional(),
  timezone: z.string().min(1).optional(),
  notes: z.string().max(500).optional().nullable(),
  contextTags: z.array(z.string().max(40)).optional()
});

export const CreateGoalSchema = z.object({
  behaviorId: z.string().uuid('Behavior ID must be a valid UUID'),
  goalType: GoalTypeSchema,
  targetValue: z.number().nonnegative('Target value cannot be negative'),
  evaluationPeriod: EvaluationPeriodSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable()
});

export const UpdateGoalSchema = z.object({
  targetValue: z.number().nonnegative().optional(),
  evaluationPeriod: EvaluationPeriodSchema.optional(),
  endsAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional()
});

export const DailyReviewInputSchema = z.object({
  behaviorId: z.string().uuid('Behavior ID must be a valid UUID'),
  localDate: z.string().regex(dateStringRegex, 'Date must be formatted as YYYY-MM-DD'),
  timezone: z.string().min(1, 'Timezone is required'),
  status: DailyReviewStatusSchema,
  notes: z.string().max(500).optional().nullable()
});

export const RegisterInputSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50)
});

export const LoginInputSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase()
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
});

export const UserSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  timezone: z.string().min(1),
  locale: z.string().min(2),
  dayBoundaryHour: z.number().int().min(0).max(23),
  preferences: z.record(z.unknown()).default({})
});
