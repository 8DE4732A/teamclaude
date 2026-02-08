export interface IngestEventDto {
  eventId: string;
  tenantId?: string;
  userId?: string;
  deviceId?: string;
  eventType?: string;
  ts?: string;
  durationMs?: number;
  tokenUsage?: number;
  projectHash?: string;
}
