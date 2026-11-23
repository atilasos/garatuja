import type { BrushDef, MagicEffect, StampDef, StarterDef, Tool } from './types';

export class Registry<T extends { id: string }> {
  private readonly entries = new Map<string, T>();

  constructor(values: T[], private order: (a: T, b: T) => number = () => 0) {
    for (const value of values) this.add(value);
  }

  add(value: T): () => void {
    if (this.entries.has(value.id)) throw new Error(`Duplicate plug-in ID: ${value.id}`);
    this.entries.set(value.id, value);
    return () => { this.entries.delete(value.id); };
  }

  get(id: string) { return this.entries.get(id); }
  all() { return [...this.entries.values()].sort(this.order); }
}

const byOrder = (a: { id: string; order: number }, b: { id: string; order: number }) => a.order - b.order || a.id.localeCompare(b.id);

export const tools = new Registry(Object.values(import.meta.glob<Tool>('../tools/*.ts', { eager: true, import: 'default' })), byOrder);
export const brushes = new Registry(Object.values(import.meta.glob<BrushDef>('../brushes/*.ts', { eager: true, import: 'default' })), byOrder);
// Files and folders whose names start with "_" are shared helpers, not plug-ins.
export const magic = new Registry(Object.values(import.meta.glob<MagicEffect>(['../magic/*.ts', '!../magic/_*.ts'], { eager: true, import: 'default' })), byOrder);
export const stamps = new Registry(Object.values(import.meta.glob<StampDef>('../stamps/*.ts', { eager: true, import: 'default' })));
export const starters = new Registry(Object.values(import.meta.glob<StarterDef>('../starters/*.ts', { eager: true, import: 'default' })));
