import type { Page } from '@playwright/test';

export function openDetails(page: Page) {
  return page.getByRole('button', { name: /^Dados do trabalho,/ }).click();
}

export async function fillDetails(page: Page, fields: { title: string; author?: string; audience?: string }) {
  await openDetails(page);
  const dialog = page.getByRole('dialog', { name: 'Dados do trabalho' });
  await dialog.getByRole('textbox', { name: 'Título' }).fill(fields.title);
  if (fields.author) await dialog.getByRole('textbox', { name: 'Autor' }).fill(fields.author);
  if (fields.audience) await dialog.getByRole('textbox', { name: 'Para quem é?' }).fill(fields.audience);
  await dialog.getByRole('button', { name: 'Pronto' }).click();
}
