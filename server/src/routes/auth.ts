import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken, requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { badRequest, conflict, unauthorized, wrap } from '../lib/http.js';
import { publicPractitioner, DEFAULT_AVATAR_CONFIG } from '../lib/serialize.js';

export const authRouter = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80).optional(),
});

authRouter.post(
  '/signup',
  wrap(async (req, res) => {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid signup payload');
    const { email, password } = parsed.data;
    const name = parsed.data.name || email.split('@')[0]!;

    const existing = await prisma.practitioner.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw conflict('An entity is already bound to this email', 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(password, 12);
    const practitioner = await prisma.$transaction(async (tx) => {
      const p = await tx.practitioner.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name,
          entity: { create: {} },
          bond: { create: {} },
        },
      });
      // A working avatarConfig lives as the active preset (only avatarConfig + activeFormKey persist).
      const preset = await tx.manifestationPreset.create({
        data: { practitionerId: p.id, name: 'Default', config: DEFAULT_AVATAR_CONFIG, isActive: true },
      });
      return tx.practitioner.update({
        where: { id: p.id },
        data: { activeManifestationPresetId: preset.id },
      });
    });

    const token = signToken({ sub: practitioner.id, role: practitioner.role, ver: practitioner.tokenVersion });
    res.status(201).json({ token, practitioner: publicPractitioner(practitioner) });
  }),
);

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const parsed = credsSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid login payload');
    const p = await prisma.practitioner.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!p) throw unauthorized('No entity bound to those credentials');
    const ok = await bcrypt.compare(parsed.data.password, p.passwordHash);
    if (!ok) throw unauthorized('No entity bound to those credentials');
    const token = signToken({ sub: p.id, role: p.role, ver: p.tokenVersion });
    res.json({ token, practitioner: publicPractitioner(p) });
  }),
);

authRouter.post(
  '/refresh',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ token: signToken({ sub: p.id, role: p.role, ver: p.tokenVersion }) });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.findUniqueOrThrow({ where: { id: req.practitionerId! } });
    res.json({ practitioner: publicPractitioner(p) });
  }),
);

// Sign out everywhere: bump tokenVersion (invalidates every existing JWT) and re-issue this device.
authRouter.post(
  '/revoke',
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const p = await prisma.practitioner.update({
      where: { id: req.practitionerId! },
      data: { tokenVersion: { increment: 1 } },
    });
    res.json({ token: signToken({ sub: p.id, role: p.role, ver: p.tokenVersion }), practitioner: publicPractitioner(p) });
  }),
);
