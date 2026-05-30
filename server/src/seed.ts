import './env.js';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';

const FREE = { kind: 'free' as const };
const iap = (productKey: string, priceUsd: number) => ({ kind: 'iap' as const, productKey, priceUsd });
const crystals = (amount: number) => ({ kind: 'crystals' as const, amount });

async function seedForms() {
  const forms = [
    { formKey: 'void', name: 'Void', tier: 'free' as const, priceModel: FREE, stageAssets: { riv: 'void.riv', artboards: stageArtboards('Void'), inputs: ['ki', 'shadowLevel', 'streak', 'realm'] } },
    { formKey: 'beast', name: 'Beast', tier: 'premium' as const, priceModel: iap('form.beast', 7.99), stageAssets: { riv: 'beast.riv', artboards: stageArtboards('Beast'), inputs: ['ki', 'shadowLevel', 'streak', 'realm'] } },
    { formKey: 'humanoid', name: 'Humanoid', tier: 'premium' as const, priceModel: iap('form.humanoid', 9.99), stageAssets: { riv: 'humanoid.riv', artboards: stageArtboards('Humanoid'), inputs: ['ki', 'shadowLevel', 'streak', 'realm'] } },
    { formKey: 'transcendent_heavenly', name: 'Transcendent (Heavenly Restriction)', tier: 'transcendent' as const, priceModel: { kind: 'earned' }, stageAssets: { riv: 'transcendent.riv', artboards: stageArtboards('Transcendent'), inputs: ['ki', 'shadowLevel', 'streak', 'realm'] } },
  ];
  for (const f of forms) await prisma.entityForm.upsert({ where: { formKey: f.formKey }, update: f, create: f });
}

function stageArtboards(prefix: string) {
  const labels = ['Embryo', 'Awakening', 'Forming', 'Tempered', 'Ascendant', 'Sovereign', 'Divine'];
  return Object.fromEntries(labels.map((l, i) => [String(i + 1), `${prefix}_${l}`]));
}

async function seedDomains() {
  const domains = [
    { domainKey: 'dojo', name: 'The Dojo', aesthetic: 'Dark, minimal, absolute', tapEffect: 'Ripple', kiBarMaterial: 'Obsidian', soundscapeKey: 'dojo_ambient', priceModel: FREE, domainConfig: parallax(['#05060a', '#0b0e16']) },
    { domainKey: 'frozen_wastes', name: 'Frozen Wastes', aesthetic: 'Arctic blue, frost geometry', tapEffect: 'Ice shard spray', kiBarMaterial: 'Glacial crystal', soundscapeKey: 'frozen_ambient', priceModel: iap('domain.frozen_wastes', 9.99), domainConfig: parallax(['#0a1622', '#16324a']) },
    { domainKey: 'ember_court', name: 'Ember Court', aesthetic: 'Deep orange, heat shimmer', tapEffect: 'Ember sparks', kiBarMaterial: 'Molten core', soundscapeKey: 'ember_ambient', priceModel: iap('domain.ember_court', 9.99), domainConfig: parallax(['#1a0a06', '#3a160a']) },
    { domainKey: 'abyssal_rift', name: 'Abyssal Rift', aesthetic: 'Void purple, spatial tears', tapEffect: 'Dimensional fractures', kiBarMaterial: 'Liquid void', soundscapeKey: 'abyssal_ambient', priceModel: iap('domain.abyssal_rift', 12.99), domainConfig: parallax(['#0c0616', '#241046']) },
    { domainKey: 'jade_sovereign', name: 'Jade Sovereign', aesthetic: 'Forest green, ancient stone', tapEffect: 'Falling leaves', kiBarMaterial: 'Jade plate', soundscapeKey: 'jade_ambient', priceModel: iap('domain.jade_sovereign', 9.99), domainConfig: parallax(['#06160c', '#103a22']) },
    { domainKey: 'storm_mandate', name: 'Storm Mandate', aesthetic: 'Electric white, thunder', tapEffect: 'Lightning fork', kiBarMaterial: 'Charged plasma', soundscapeKey: 'storm_ambient', priceModel: iap('domain.storm_mandate', 12.99), domainConfig: parallax(['#0a0c12', '#2a2e44']) },
  ];
  for (const d of domains) await prisma.domainPack.upsert({ where: { domainKey: d.domainKey }, update: d, create: d });
}

function parallax(colors: string[]) {
  return { mode: 'parallax', layers: colors.map((c, i) => ({ color: c, depth: i })), three: { env: 'baked', frameloop: 'demand' } };
}

async function seedCosmetics() {
  const categories = ['trail', 'aura', 'core', 'surface', 'eyes', 'appendages', 'orbit', 'sigils'] as const;
  // A free option per layer (soft paywall) + a couple of paid options.
  const items: any[] = [];
  for (const category of categories) {
    items.push({ itemKey: `${category}_origin`, category, name: `Origin ${cap(category)}`, rarity: 'free', defaultTint: '#7df9ff', layerSpec: { kind: category }, priceModel: FREE });
    items.push({ itemKey: `${category}_ember`, category, name: `Ember ${cap(category)}`, rarity: 'premium', defaultTint: '#ff7a18', layerSpec: { kind: category }, priceModel: crystals(120), setKey: 'ember' });
    items.push({ itemKey: `${category}_void`, category, name: `Void ${cap(category)}`, rarity: 'premium', defaultTint: '#9b5cff', layerSpec: { kind: category }, priceModel: iap(`cosmetic.${category}.void`, 2.99), setKey: 'void_regalia' });
  }
  // Artifacts (orbit) + reactive aura, sold individually.
  items.push({ itemKey: 'artifact_void_blade', category: 'orbit', name: 'Void Blade', rarity: 'premium', defaultTint: '#c0c8ff', layerSpec: { kind: 'artifact', orbits: 1 }, priceModel: iap('artifact.void_blade', 3.99), setKey: 'artifacts' });
  items.push({ itemKey: 'aura_reactive_pulse', category: 'aura', name: 'Reactive Pulse', rarity: 'premium', defaultTint: '#39ff88', layerSpec: { kind: 'reactive', source: 'health' }, priceModel: iap('aura.reactive_pulse', 4.99) });
  for (const i of items) await prisma.cosmeticItem.upsert({ where: { itemKey: i.itemKey }, update: i, create: i });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function seedBloodlines() {
  const lines = [
    { bloodlineKey: 'abyssal', name: 'Abyssal Bloodline' },
    { bloodlineKey: 'celestial_mandate', name: 'Celestial Mandate' },
    { bloodlineKey: 'crimson_curse', name: 'Crimson Curse' },
    { bloodlineKey: 'phantom_sovereign', name: 'Phantom Sovereign' },
  ];
  for (const l of lines) {
    const data = { ...l, stageAssets: { artboards: stageArtboards(cap(l.bloodlineKey)) }, lockedSlots: { core: true }, priceModel: iap(`bloodline.${l.bloodlineKey}`, 6.99) };
    await prisma.bloodline.upsert({ where: { bloodlineKey: l.bloodlineKey }, update: data, create: data });
  }
}

async function seedCompanions() {
  const list = [
    { companionKey: 'time_weaver', name: 'Time-Weaver', rarity: 'ancient', utility: 'Retroactively log one missed session per month without breaking streak', weight: 50 },
    { companionKey: 'oracle', name: 'Oracle', rarity: 'ancient', utility: 'Deep 30-day AI analysis → custom protocol', weight: 50 },
    { companionKey: 'anchor_keeper', name: 'Anchor Keeper', rarity: 'bound', utility: 'Adaptive notification timing from your patterns', weight: 100 },
    { companionKey: 'shadow_hound', name: 'Shadow Hound', rarity: 'bound', utility: 'Doubles hammer count for sessions before 6am', weight: 100 },
    { companionKey: 'ki_sentinel', name: 'Ki Sentinel', rarity: 'wandering', utility: 'Caps daily ki drain at 20 regardless of leaks', weight: 200 },
    { companionKey: 'vow_witness', name: 'Vow Witness', rarity: 'wandering', utility: 'Daily check-in when a major vow is active', weight: 200 },
    { companionKey: 'echo_specter', name: 'Echo Specter', rarity: 'void_herald', utility: 'An inverted ghost echo trailing the entity', weight: 10, inLesserPool: false },
  ];
  for (const c of list) {
    const data = { inLesserPool: true, inAbyssalPool: true, ...c } as any;
    await prisma.companion.upsert({ where: { companionKey: c.companionKey }, update: data, create: data });
  }
}

async function seedDecor() {
  const decor = [
    { decorKey: 'brazier', name: 'Soul Brazier', slot: 'floor', priceModel: crystals(40) },
    { decorKey: 'banner_sect', name: 'Sect Banner', slot: 'wall', priceModel: crystals(60) },
    { decorKey: 'shrine_minor', name: 'Minor Shrine', slot: 'alcove', priceModel: crystals(80) },
  ];
  for (const d of decor) await prisma.spaceDecor.upsert({ where: { decorKey: d.decorKey }, update: d, create: d });
}

async function seedSeason() {
  const now = new Date();
  const endsAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  await prisma.season.upsert({
    where: { seasonKey: 'season_void_dawn' },
    update: { name: 'Void Dawn', startsAt: now, endsAt, dropKeys: ['aura_void', 'orbit_void', 'sigils_void'] },
    create: { seasonKey: 'season_void_dawn', name: 'Void Dawn', startsAt: now, endsAt, dropKeys: ['aura_void', 'orbit_void', 'sigils_void'] },
  });
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash('voidbornadmin', 10);
  await prisma.practitioner.upsert({
    where: { email: 'admin@voidborn.app' },
    update: { role: 'ADMIN' },
    create: { email: 'admin@voidborn.app', passwordHash, name: 'Overseer', role: 'ADMIN', entity: { create: {} }, bond: { create: {} } },
  });
}

async function seedDemo() {
  const email = 'demo@voidborn.app';
  const passwordHash = await bcrypt.hash('voidborn123', 10);
  const demo = await prisma.practitioner.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'Adept', entity: { create: {} }, bond: { create: {} } },
  });

  // Reset derived history so the seed is deterministic and hammerCount == sum(StrikeEvent).
  await prisma.strikeEvent.deleteMany({ where: { practitionerId: demo.id } });
  await prisma.voidSession.deleteMany({ where: { practitionerId: demo.id } });
  await prisma.vow.deleteMany({ where: { practitionerId: demo.id } });
  await prisma.kiLeak.deleteMany({ where: { practitionerId: demo.id } });

  // Build a strike history that lands mid-progression (Realm 3 — Ki Establishment band).
  const amounts = [400, 350, 500, 300, 450, 600, 380, 520, 700, 500, 600];
  const total = amounts.reduce((s, a) => s + a, 0); // 5300
  const now = Date.now();
  for (let i = 0; i < amounts.length; i++) {
    const occurredAt = new Date(now - (amounts.length - i) * 24 * 60 * 60 * 1000);
    const session = await prisma.voidSession.create({
      data: { practitionerId: demo.id, modality: ['origin', 'pull', 'push', 'core', 'cardio'][i % 5] as any, reps: amounts[i]!, rating: 4, occurredOn: occurredAt },
    });
    await prisma.strikeEvent.create({ data: { practitionerId: demo.id, amount: amounts[i]!, sessionId: session.id, occurredAt } });
  }
  // A recovery (reps:0) session — must NOT strike (invariant #3).
  await prisma.voidSession.create({ data: { practitionerId: demo.id, modality: 'recovery', reps: 0, note: 'Stillness', occurredOn: new Date(now) } });

  await prisma.kiLeak.create({ data: { practitionerId: demo.id, category: 'media', label: 'doomscroll', cost: 8 } });

  await prisma.vow.create({
    data: {
      practitionerId: demo.id, title: 'Forge the Foundation', type: 'major', resolutionDate: new Date(now + 14 * 864e5),
      progressions: { create: [{ text: 'Train 6 days this week', orderIndex: 0 }, { text: 'No media after 9pm', orderIndex: 1, completed: true }] },
    },
  });
  await prisma.vow.create({ data: { practitionerId: demo.id, title: 'First Light', type: 'minor', status: 'kept', resolutionDate: new Date(now - 7 * 864e5), resolvedAt: new Date(now - 7 * 864e5) } });

  // Owns the Beast form + Frozen Wastes domain (granted as if purchased) + a starter companion.
  await prisma.practitionerForm.upsert({ where: { practitionerId_formKey: { practitionerId: demo.id, formKey: 'beast' } }, update: {}, create: { practitionerId: demo.id, formKey: 'beast' } });
  await prisma.entitlement.upsert({ where: { practitionerId_kind_productKey: { practitionerId: demo.id, kind: 'form', productKey: 'beast' } }, update: {}, create: { practitionerId: demo.id, kind: 'form', productKey: 'beast' } });
  await prisma.practitionerDomain.upsert({ where: { practitionerId_domainKey: { practitionerId: demo.id, domainKey: 'frozen_wastes' } }, update: {}, create: { practitionerId: demo.id, domainKey: 'frozen_wastes' } });
  await prisma.practitionerCompanion.upsert({ where: { practitionerId_companionKey: { practitionerId: demo.id, companionKey: 'ki_sentinel' } }, update: {}, create: { practitionerId: demo.id, companionKey: 'ki_sentinel' } });

  // Default working preset + metrics. hammerCount is set to the exact strike sum (reconcilable).
  let preset = await prisma.manifestationPreset.findFirst({ where: { practitionerId: demo.id, name: 'Default' } });
  if (!preset) preset = await prisma.manifestationPreset.create({ data: { practitionerId: demo.id, name: 'Default', config: { layers: { aura: { itemKey: 'aura_origin', tint: '#7df9ff' } }, demeanor: 'focused' }, isActive: true } });
  await prisma.practitioner.update({
    where: { id: demo.id },
    data: { hammerCount: total, ki: 72, shadowLevel: 2, streak: 11, crystals: 300, lastLogDate: new Date(now), activeFormKey: 'void', activeManifestationPresetId: preset.id },
  });
  await prisma.bond.update({ where: { practitionerId: demo.id }, data: { value: 34, lastPresenceDate: new Date(now) } });

  return { id: demo.id, hammerCount: total };
}

async function main() {
  await seedForms();
  await seedDomains();
  await seedCosmetics();
  await seedBloodlines();
  await seedCompanions();
  await seedDecor();
  await seedSeason();
  await seedAdmin();
  const demo = await seedDemo();
  // eslint-disable-next-line no-console
  console.log(`Seed complete. Demo practitioner ${demo.id} hammerCount=${demo.hammerCount}.`);
  console.log('  demo@voidborn.app / voidborn123   ·   admin@voidborn.app / voidbornadmin');
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
