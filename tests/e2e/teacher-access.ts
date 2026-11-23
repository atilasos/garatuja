import { expect, type Page } from '@playwright/test';
import { numberWord } from '../../src/features/teacher/gate';

export async function openAdultGate(page: Page) {
  await page.getByRole('button', { name: 'Definições', exact: true }).click();
  const adult = page.getByRole('button', { name: 'Adulto' });
  await adult.focus();
  await page.keyboard.down('Space');
  const gate = page.getByRole('dialog', { name: 'Área do adulto' });
  await expect(gate).toBeVisible();
  await page.keyboard.up('Space');
  return gate;
}

export async function answerAdultChallenge(page: Page) {
  const gate = page.getByRole('dialog', { name: 'Área do adulto' });
  const words = new Map(Array.from({ length: 100 }, (_, i) => [numberWord(i).pt, i]));
  const [a, b] = (await gate.locator('strong').innerText()).toLowerCase().split(' mais ');
  const first = words.get(a);
  const second = words.get(b);
  if (first === undefined || second === undefined) throw new Error('Unknown challenge operands');
  await gate.getByRole('textbox').fill(numberWord(first + second).pt);
  await gate.getByRole('button', { name: 'Entrar' }).click();
}
