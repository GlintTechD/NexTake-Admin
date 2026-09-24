import { INITIAL_ARTICLES } from './initialData';
import type { Company } from '../types';

export const DEMO_ARTICLES = INITIAL_ARTICLES;

export const DEMO_COMPANIES: Company[] = [
  { id: 'company-1', name: 'NexTake', sector: 'Media', websiteUrl: null },
  { id: 'company-2', name: 'Linear', sector: 'Productivity', websiteUrl: 'https://linear.app' },
  { id: 'company-3', name: 'OpenAI', sector: 'Artificial intelligence', websiteUrl: 'https://openai.com' },
];