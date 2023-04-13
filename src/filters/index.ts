import { Context } from '@/types';

export const knownUser = (ctx: Context) => ctx.config.isAdmin;

export const unknownUser = (ctx: Context) => !ctx.config.isAdmin;
