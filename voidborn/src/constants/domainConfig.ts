// Per-domain sensory config. 2.5D = layered parallax; true-3D = an R3F environment driven by the
// same `domainConfig`. Mirrors the server's DomainPack catalog (key-for-key). RN-free constants.

export interface DomainConfig {
  domainKey: string;
  name: string;
  tapEffect: string;
  kiBarMaterial: string;
  soundscapeKey: string;
  /** 2.5D parallax layers, back-to-front (color + relative depth). */
  parallax: { color: string; depth: number }[];
  /** true-3D hints for the R3F upgrade. */
  three: { env: 'baked'; frameloop: 'demand'; model?: string };
  accent: string;
}

const layered = (colors: string[]) => colors.map((color, depth) => ({ color, depth }));

export const DOMAINS: Record<string, DomainConfig> = {
  dojo: {
    domainKey: 'dojo', name: 'The Dojo', tapEffect: 'Ripple', kiBarMaterial: 'Obsidian', soundscapeKey: 'dojo_ambient',
    parallax: layered(['#05060a', '#0b0e16', '#131826']), three: { env: 'baked', frameloop: 'demand', model: 'dojo.glb' }, accent: '#7df9ff',
  },
  frozen_wastes: {
    domainKey: 'frozen_wastes', name: 'Frozen Wastes', tapEffect: 'Ice shard spray', kiBarMaterial: 'Glacial crystal', soundscapeKey: 'frozen_ambient',
    parallax: layered(['#0a1622', '#16324a', '#2a5a7a']), three: { env: 'baked', frameloop: 'demand', model: 'frozen_wastes.glb' }, accent: '#8fd6ff',
  },
  ember_court: {
    domainKey: 'ember_court', name: 'Ember Court', tapEffect: 'Ember sparks', kiBarMaterial: 'Molten core', soundscapeKey: 'ember_ambient',
    parallax: layered(['#1a0a06', '#3a160a', '#6a2a10']), three: { env: 'baked', frameloop: 'demand', model: 'ember_court.glb' }, accent: '#ff7a18',
  },
  abyssal_rift: {
    domainKey: 'abyssal_rift', name: 'Abyssal Rift', tapEffect: 'Dimensional fractures', kiBarMaterial: 'Liquid void', soundscapeKey: 'abyssal_ambient',
    parallax: layered(['#0c0616', '#241046', '#3a1a6a']), three: { env: 'baked', frameloop: 'demand', model: 'abyssal_rift.glb' }, accent: '#9b5cff',
  },
  jade_sovereign: {
    domainKey: 'jade_sovereign', name: 'Jade Sovereign', tapEffect: 'Falling leaves', kiBarMaterial: 'Jade plate', soundscapeKey: 'jade_ambient',
    parallax: layered(['#06160c', '#103a22', '#1a6a3a']), three: { env: 'baked', frameloop: 'demand', model: 'jade_sovereign.glb' }, accent: '#39ff88',
  },
  storm_mandate: {
    domainKey: 'storm_mandate', name: 'Storm Mandate', tapEffect: 'Lightning fork', kiBarMaterial: 'Charged plasma', soundscapeKey: 'storm_ambient',
    parallax: layered(['#0a0c12', '#2a2e44', '#4a4e6a']), three: { env: 'baked', frameloop: 'demand', model: 'storm_mandate.glb' }, accent: '#dfe6ff',
  },
};

export const domainFor = (key: string): DomainConfig => DOMAINS[key] ?? DOMAINS.dojo!;
