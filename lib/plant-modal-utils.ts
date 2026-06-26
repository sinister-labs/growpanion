import type { SubstrateRecord, TrainingRecord, WateringRecord } from '@/components/plant-modal/types';

export function normalizeWateringRecord(record: WateringRecord): WateringRecord {
  const amount = record.amount.trim();
  const mixId = record.mixId?.trim();

  return {
    date: record.date.trim(),
    amount,
    ...(mixId ? { mixId } : {}),
  };
}

export function normalizeTrainingRecord(record: TrainingRecord): TrainingRecord {
  const notes = record.notes?.trim();

  return {
    date: record.date.trim(),
    method: record.method.trim(),
    ...(notes ? { notes } : {}),
  };
}

export function normalizeSubstrateRecord(record: SubstrateRecord): SubstrateRecord {
  const notes = record.notes?.trim();

  return {
    date: record.date.trim(),
    action: record.action,
    substrateType: record.substrateType.trim(),
    potSize: record.potSize.trim(),
    ...(notes ? { notes } : {}),
  };
}
