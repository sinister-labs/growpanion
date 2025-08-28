import { z } from 'zod';

/**
 * Zod validation schemas for GrowPanion application
 * Provides comprehensive input validation for forms and API requests
 */

// Base validation schemas
export const IdSchema = z.string().min(1, 'ID is required');

export const NonEmptyStringSchema = z.string().min(1, 'This field is required');

export const PositiveNumberSchema = z.number().positive('Must be a positive number');

export const OptionalStringSchema = z.string().optional();

// Date validation
export const DateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
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
    amount: NonEmptyStringSchema,
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
  images: z.array(z.string()).optional()
});

export const CreatePlantSchema = PlantSchema.omit({ id: true });

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
  }).optional()
});

export const CreateGrowSchema = GrowSchema.omit({ id: true });

// Fertilizer validation schemas
export const FertilizerSchema = z.object({
  name: NonEmptyStringSchema.max(100, 'Fertilizer name must be less than 100 characters'),
  amount: NonEmptyStringSchema.max(50, 'Amount must be less than 50 characters')
});

export const FertilizerMixSchema = z.object({
  id: IdSchema,
  name: NonEmptyStringSchema.max(100, 'Mix name must be less than 100 characters'),
  waterAmount: NonEmptyStringSchema.max(50, 'Water amount must be less than 50 characters'),
  fertilizers: z.array(FertilizerSchema).min(1, 'At least one fertilizer is required')
});

export const CreateFertilizerMixSchema = FertilizerMixSchema.omit({ id: true });

// Settings validation schemas
export const TuyaCredentialsSchema = z.object({
  tuyaClientId: z.string().min(10, 'Client ID must be at least 10 characters'),
  tuyaClientSecret: z.string().min(10, 'Client Secret must be at least 10 characters')
});

export const SensorValueSchema = z.object({
  code: NonEmptyStringSchema,
  decimalPlaces: z.number().int().min(0).max(5).optional()
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
  method: z.enum(['GET', 'POST']),
  headers: z.record(z.string()).optional(),
  body: z.any().optional()
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
  amount: NonEmptyStringSchema.max(50, 'Amount must be less than 50 characters'),
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
export type Grow = z.infer<typeof GrowSchema>;
export type CreateGrow = z.infer<typeof CreateGrowSchema>;
export type FertilizerMix = z.infer<typeof FertilizerMixSchema>;
export type CreateFertilizerMix = z.infer<typeof CreateFertilizerMixSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type TuyaSensor = z.infer<typeof TuyaSensorSchema>;
export type TrainingRecord = z.infer<typeof TrainingRecordSchema>;
export type WateringRecord = z.infer<typeof WateringRecordSchema>;
export type SubstrateRecord = z.infer<typeof SubstrateRecordSchema>;