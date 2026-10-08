import type { Client, Campaign, Community, Lead, Connection, PerformanceRow, AuditEntry, ContentItem, CreativeDraft, DistributionList, AutomationRule, GoogleLocation } from '../types';

export type WorkspaceRecords = {
  campaigns: Campaign[];
  communities: Community[];
  leads: Lead[];
  connections: Connection[];
  performanceRows: PerformanceRow[];
  activity: AuditEntry[];
  content: ContentItem[];
  creatives: CreativeDraft[];
  distributionLists: DistributionList[];
  automations: AutomationRule[];
  locations: GoogleLocation[];
};
export type WorkspaceDataset = {
  source: 'LIVE' | 'FIXTURE';
  clients: Client[];
  recordsByClient: Record<string, WorkspaceRecords>;
};
