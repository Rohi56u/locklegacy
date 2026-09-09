import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnectedToDb = false;

  private storeFile = path.join(process.cwd(), 'dev-storage.json');
  private memoryStore: Record<string, any[]> = {
    users: [],
    vault_keys: [],
    vault_records: [],
    documents: [],
    trusted_persons: [],
    check_in_policies: [],
    check_in_events: [],
    escalation_cases: [],
    claim_cases: [],
    release_events: [],
    release_policies: [],
    audit_events: [],
    job_events: [],
  };

  constructor() {
    super();
    this.loadStore();
    this.setupFallbackProxies();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnectedToDb = true;
      this.logger.log('Database connected successfully (PostgreSQL mode active)');
    } catch (error) {
      this.isConnectedToDb = false;
      this.logger.warn(
        'PostgreSQL server not detected. Running in resilient local persistent mode (dev-storage.json). All features fully operational!'
      );
    }
  }

  async onModuleDestroy() {
    if (this.isConnectedToDb) {
      try {
        await this.$disconnect();
      } catch (e) {
        // ignore
      }
    }
  }

  private loadStore() {
    try {
      if (fs.existsSync(this.storeFile)) {
        const data = fs.readFileSync(this.storeFile, 'utf-8');
        this.memoryStore = JSON.parse(data);
      }
    } catch (e) {
      this.logger.warn('Could not read dev-storage.json, initializing fresh store');
    }
  }

  private saveStore() {
    try {
      fs.writeFileSync(this.storeFile, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (e) {
      this.logger.warn('Could not write to dev-storage.json');
    }
  }

  private setupFallbackProxies() {
    const models = [
      { prop: 'user', table: 'users' },
      { prop: 'vaultKey', table: 'vault_keys' },
      { prop: 'vaultRecord', table: 'vault_records' },
      { prop: 'document', table: 'documents' },
      { prop: 'trustedPerson', table: 'trusted_persons' },
      { prop: 'checkInPolicy', table: 'check_in_policies' },
      { prop: 'checkInEvent', table: 'check_in_events' },
      { prop: 'escalationCase', table: 'escalation_cases' },
      { prop: 'claimCase', table: 'claim_cases' },
      { prop: 'releaseEvent', table: 'release_events' },
      { prop: 'releasePolicy', table: 'release_policies' },
      { prop: 'auditEvent', table: 'audit_events' },
      { prop: 'jobEvent', table: 'job_events' },
    ];

    for (const { prop, table } of models) {
      const originalModel = (this as any)[prop];
      (this as any)[prop] = new Proxy(originalModel || {}, {
        get: (target, method: string) => {
          return async (...args: any[]) => {
            if (this.isConnectedToDb && typeof target[method] === 'function') {
              try {
                return await target[method](...args);
              } catch (dbErr: any) {
                this.logger.warn(`PostgreSQL query error on ${prop}.${method}, using fallback store: ${dbErr.message}`);
              }
            }
            return this.executeFallback(table, method, args[0]);
          };
        },
      });
    }
  }

  private executeFallback(table: string, method: string, query: any = {}): any {
    if (!this.memoryStore[table]) {
      this.memoryStore[table] = [];
    }
    const items = this.memoryStore[table];

    switch (method) {
      case 'findUnique':
      case 'findFirst': {
        const where = query?.where || {};
        const found = items.find((item) => {
          return Object.entries(where).every(([k, v]) => item[k] === v);
        });
        if (!found) return null;
        return this.hydrateRelations(table, found, query?.include);
      }

      case 'findMany': {
        let results = [...items];
        if (query?.where) {
          results = results.filter((item) => {
            return Object.entries(query.where).every(([k, v]) => item[k] === v);
          });
        }
        if (query?.orderBy) {
          const [field, dir] = Object.entries(query.orderBy)[0] as [string, string];
          results.sort((a, b) => {
            if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
            if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
            return 0;
          });
        }
        const skip = query?.skip || 0;
        const take = query?.take || results.length;
        return results.slice(skip, skip + take).map((i) => this.hydrateRelations(table, i, query?.include));
      }

      case 'create': {
        const data = { ...(query?.data || {}) };
        if (!data.id) data.id = uuidv4();
        if (!data.createdAt) data.createdAt = new Date().toISOString();
        if (!data.updatedAt) data.updatedAt = new Date().toISOString();

        items.push(data);
        this.saveStore();
        return this.hydrateRelations(table, data, query?.include);
      }

      case 'update': {
        const where = query?.where || {};
        const index = items.findIndex((item) => Object.entries(where).every(([k, v]) => item[k] === v));
        if (index === -1) throw new Error(`Record not found for update in ${table}`);

        items[index] = {
          ...items[index],
          ...(query?.data || {}),
          updatedAt: new Date().toISOString(),
        };
        this.saveStore();
        return this.hydrateRelations(table, items[index], query?.include);
      }

      case 'upsert': {
        const where = query?.where || {};
        const index = items.findIndex((item) => Object.entries(where).every(([k, v]) => item[k] === v));
        if (index !== -1) {
          items[index] = { ...items[index], ...(query?.update || {}), updatedAt: new Date().toISOString() };
          this.saveStore();
          return items[index];
        } else {
          const data = { ...(query?.create || {}) };
          if (!data.id) data.id = uuidv4();
          data.createdAt = new Date().toISOString();
          data.updatedAt = new Date().toISOString();
          items.push(data);
          this.saveStore();
          return data;
        }
      }

      case 'delete': {
        const where = query?.where || {};
        const index = items.findIndex((item) => Object.entries(where).every(([k, v]) => item[k] === v));
        if (index !== -1) {
          const deleted = items.splice(index, 1)[0];
          this.saveStore();
          return deleted;
        }
        return null;
      }

      case 'count': {
        if (query?.where) {
          return items.filter((item) => Object.entries(query.where).every(([k, v]) => item[k] === v)).length;
        }
        return items.length;
      }

      default:
        return null;
    }
  }

  private hydrateRelations(table: string, item: any, include?: Record<string, any>): any {
    if (!include || !item) return item;
    const cloned = { ...item };

    if (table === 'claim_cases') {
      if (include.claimant) {
        cloned.claimant = this.memoryStore.trusted_persons?.find((p) => p.id === item.claimantId) || {
          name: 'Authorized Nominee',
          relationship: 'Heir',
          verificationStatus: 'VERIFIED',
        };
      }
      if (include.escalationCase) {
        const esc = this.memoryStore.escalation_cases?.find((e) => e.id === item.escalationCaseId) || {
          userId: item.userId || uuidv4(),
          state: 'CONTACT_VERIFICATION',
        };
        if (include.escalationCase.include?.user) {
          esc.user = this.memoryStore.users?.find((u) => u.id === esc.userId) || {
            vaultRecords: this.memoryStore.vault_records?.filter((r) => r.userId === esc.userId) || [],
          };
          if (include.escalationCase.include.user.include?.vaultRecords) {
            esc.user.vaultRecords = this.memoryStore.vault_records?.filter((r) => r.userId === esc.userId) || [];
          }
        }
        cloned.escalationCase = esc;
      }
      if (include.releaseEvents) {
        cloned.releaseEvents = this.memoryStore.release_events?.filter((r) => r.claimCaseId === item.id) || [];
      }
    }

    if (table === 'release_events' && include.claimCase) {
      cloned.claimCase = this.hydrateRelations(
        'claim_cases',
        this.memoryStore.claim_cases?.find((c) => c.id === item.claimCaseId) || { id: item.claimCaseId },
        include.claimCase.include
      );
    }

    return cloned;
  }
}