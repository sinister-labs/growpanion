import { z } from 'zod';

/**
 * Zod validation schemas for GrowPanion application
 * Provides comprehensive input validation for forms and API requests
 */

// Base validation schemas
export const IdSchema = z.string().trim().min(1, 'ID is required');

export const NonEmptyStringSchema = z.string().trim().min(1, 'This field is required');

export const PositiveNumberSchema = z.number().positive('Must be a positive number');

export const OptionalStringSchema = z.string().trim().optional();

const PositiveNumberStringSchema = (fieldName: string) =>
  NonEmptyStringSchema
    .max(50, `${fieldName} must be less than 50 characters`)
    .refine(
      (val) => {
        const numberValue = Number(val.trim());
        return Number.isFinite(numberValue) && numberValue > 0;
      },
      { message: `${fieldName} must be a positive number` }
    );

function isValidDateString(value: string): boolean {
  const trimmedValue = value.trim();
  const parsedTime = Date.parse(trimmedValue);

  if (!Number.isFinite(parsedTime)) {
    return false;
  }

  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmedValue);
  if (!datePrefix) {
    return true;
  }

  const year = Number(datePrefix[1]);
  const month = Number(datePrefix[2]);
  const day = Number(datePrefix[3]);
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    normalizedDate.getUTCFullYear() === year &&
    normalizedDate.getUTCMonth() === month - 1 &&
    normalizedDate.getUTCDate() === day
  );
}

// Date validation
export const DateStringSchema = z.string().refine(
  isValidDateString,
  { message: 'Invalid date format' }
);

// Plant validation schemas
export const PlantTypeSchema = z.enum(['regular', 'autoflowering', 'feminized'], {
  errorMap: () => ({ message: 'Plant type must be regular, autoflowering, or feminized' })
});

export const PropagationMethodSchema = z.enum(['clone', 'seed'], {
  errorMap: () => ({ message: 'Propagation method must be clone or seed' })
});

export const PlantPhaseSchema = z.enum([
  "Seedling",
  "Vegetative",
  "Flowering",
  "Flushing",
  "Drying",
  "Curing",
  "Done"
], {
  errorMap: () => ({ message: 'Invalid plant phase' })
});

export const PlantSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema.max(100, 'Name must be less than 100 characters'),
  genetic: NonEmptyStringSchema.max(100, 'Genetic must be less than 100 characters'),
  manufacturer: NonEmptyStringSchema.max(100, 'Manufacturer must be less than 100 characters'),
  type: PlantTypeSchema,
  propagationMethod: PropagationMethodSchema,
  yield: OptionalStringSchema,
  notes: z.union([
    z.string(),
    z.null(),
    z.object({
      type: z.literal('doc'),
      content: z.array(z.any())
    })
  ]).optional(),
  waterings: z.array(z.object({
    date: DateStringSchema,
    amount: PositiveNumberStringSchema('Amount'),
    mixId: OptionalStringSchema
  })).optional(),
  hstRecords: z.array(z.object({
    date: DateStringSchema,
    method: NonEmptyStringSchema,
    notes: OptionalStringSchema
  })).optional(),
  lstRecords: z.array(z.object({
    date: DateStringSchema,
    method: NonEmptyStringSchema,
    notes: OptionalStringSchema
  })).optional(),
  substrateRecords: z.array(z.object({
    date: DateStringSchema,
    action: z.enum(['potting', 'repotting']).optional(),
    substrateType: NonEmptyStringSchema,
    potSize: NonEmptyStringSchema,
    notes: OptionalStringSchema
  })).optional(),
  images: z.array(z.string()).optional(),
  harvest: z.object({
    date: DateStringSchema,
    yieldWetGrams: z.number().positive().optional(),
    yieldDryGrams: z.number().positive().optional(),
    notes: OptionalStringSchema
  }).refine(
    harvest => (
      harvest.yieldWetGrams === undefined ||
      harvest.yieldDryGrams === undefined ||
      harvest.yieldDryGrams <= harvest.yieldWetGrams
    ),
    { message: 'Dry yield cannot be greater than wet yield' }
  ).optional(),
  isHarvested: z.boolean().optional()
});

export const CreatePlantSchema = PlantSchema.omit({ id: true });
export const PlantDBSchema = PlantSchema.extend({
  growId: IdSchema
});

// Grow validation schemas
export const GrowSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema.max(100, 'Grow name must be less than 100 characters'),
  startDate: DateStringSchema,
  currentPhase: PlantPhaseSchema,
  phaseHistory: z.array(z.object({
    phase: PlantPhaseSchema,
    startDate: DateStringSchema
  })),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  environmentSettings: z.object({
    temperature: z.number().min(10).max(50).optional(),
    humidity: z.number().min(0).max(100).optional(),
    lightSchedule: OptionalStringSchema
  }).optional(),
  expectedYield: z.number().nonnegative().optional(),
  actualYield: z.number().nonnegative().optional()
});

export const CreateGrowSchema = GrowSchema.omit({ id: true });

// Fertilizer validation schemas
export const FertilizerSchema = z.object({
  name: NonEmptyStringSchema.max(100, 'Fertilizer name must be less than 100 characters'),
  amount: PositiveNumberStringSchema('Amount')
});

export const FertilizerMixSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema.max(100, 'Mix name must be less than 100 characters'),
  waterAmount: PositiveNumberStringSchema('Water amount'),
  fertilizers: z.array(FertilizerSchema).min(1, 'At least one fertilizer is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

export const CreateFertilizerMixSchema = FertilizerMixSchema.omit({ id: true });
export const FertilizerMixDBSchema = FertilizerMixSchema.extend({
  growId: IdSchema
});

// Strain validation schemas
export const StrainSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema.max(100, 'Strain name must be less than 100 characters'),
  breeder: NonEmptyStringSchema.max(100, 'Breeder must be less than 100 characters'),
  genetics: z.enum(['Indica', 'Sativa', 'Hybrid']),
  indicaPercent: z.number().min(0).max(100).optional(),
  sativaPercent: z.number().min(0).max(100).optional(),
  thcPercent: z.number().min(0).max(40).optional(),
  cbdPercent: z.number().min(0).max(30).optional(),
  floweringWeeks: z.number().min(4).max(16).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  createdAt: OptionalStringSchema,
  updatedAt: OptionalStringSchema
});

// Settings validation schemas
export const TuyaCredentialsSchema = z.object({
  tuyaClientId: z.string().min(10, 'Client ID must be at least 10 characters'),
  tuyaClientSecret: z.string().min(10, 'Client Secret must be at least 10 characters')
});

export const SensorValueSchema = z.object({
  code: NonEmptyStringSchema,
  decimalPlaces: z.number().int().min(1).max(3).optional()
});

export const TuyaSensorSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema.max(100, 'Sensor name must be less than 100 characters'),
  tuyaId: NonEmptyStringSchema.max(100, 'Tuya ID must be less than 100 characters'),
  type: z.enum(['Lamp', 'Carbon Filter', 'Fan', 'Temperature', 'Humidity', 'Boolean', 'Number']),
  values: z.array(SensorValueSchema).min(1, 'At least one value configuration is required')
});

export const SettingsSchema = z.object({
  id: z.literal('global'),
  tuyaClientId: OptionalStringSchema,
  tuyaClientSecret: OptionalStringSchema,
  lastUpdated: OptionalStringSchema,
  sensors: z.array(TuyaSensorSchema).optional()
});

// API validation schemas
export const ProxyRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.any().optional()
});

// Reminder validation schemas
export const ReminderTypeSchema = z.enum(['watering', 'feeding', 'photo', 'training', 'custom']);

export const ReminderSchema = z.object({
  id: IdSchema,
  growId: IdSchema,
  plantId: OptionalStringSchema,
  type: ReminderTypeSchema,
  title: NonEmptyStringSchema.max(100, 'Reminder title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  intervalDays: z.number().int().min(0, 'Interval days cannot be negative'),
  lastTriggered: OptionalStringSchema,
  nextDue: DateStringSchema,
  enabled: z.boolean(),
  createdAt: DateStringSchema,
  updatedAt: DateStringSchema
});

export const NotificationPermissionSchema = z.enum(['default', 'denied', 'granted']);
export const TimeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format');

export const NotificationSettingsSchema = z.object({
  id: z.literal('notification-settings'),
  enabled: z.boolean(),
  permission: NotificationPermissionSchema,
  defaultReminderTime: TimeStringSchema,
  soundEnabled: z.boolean()
});

// Training record validation
export const TrainingRecordSchema = z.object({
  date: DateStringSchema,
  method: NonEmptyStringSchema.max(100, 'Method must be less than 100 characters'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional()
});

// Watering record validation
export const WateringRecordSchema = z.object({
  date: DateStringSchema,
  amount: PositiveNumberStringSchema('Amount'),
  mixId: OptionalStringSchema
});

// Substrate record validation
export const SubstrateRecordSchema = z.object({
  date: DateStringSchema,
  action: z.enum(['potting', 'repotting']).optional(),
  substrateType: NonEmptyStringSchema.max(100, 'Substrate type must be less than 100 characters'),
  potSize: NonEmptyStringSchema.max(50, 'Pot size must be less than 50 characters'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional()
});

// Helper types for TypeScript
export type Plant = z.infer<typeof PlantSchema>;
export type CreatePlant = z.infer<typeof CreatePlantSchema>;
export type PlantDB = z.infer<typeof PlantDBSchema>;
export type Grow = z.infer<typeof GrowSchema>;
export type CreateGrow = z.infer<typeof CreateGrowSchema>;
export type FertilizerMix = z.infer<typeof FertilizerMixSchema>;
export type CreateFertilizerMix = z.infer<typeof CreateFertilizerMixSchema>;
export type FertilizerMixDB = z.infer<typeof FertilizerMixDBSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type TuyaSensor = z.infer<typeof TuyaSensorSchema>;
export type TrainingRecord = z.infer<typeof TrainingRecordSchema>;
export type WateringRecord = z.infer<typeof WateringRecordSchema>;
export type SubstrateRecord = z.infer<typeof SubstrateRecordSchema>;
export type Strain = z.infer<typeof StrainSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
