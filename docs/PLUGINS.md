# Acrescentar um plug-in à Garatuja

Cria um ficheiro na pasta do tipo de plug-in. Exporta a definição como `default` e usa um `id` único no respetivo registo. O Vite descobre os ficheiros automaticamente. Inclui `pt` com português europeu e `en` para cada texto da interface. Usa arte original e recursos locais.

## Pincel

Cria `src/brushes/dot.ts`. Pintar e Linhas partilham a seleção. O anfitrião interpola os pontos e fornece a pressão, a distância percorrida e `d.random()`.

```ts
import type { BrushDef } from '../core/types';

export default {
	id: 'dot', label: { pt: 'Pontos', en: 'Dots' }, order: 50, level: 1, spacing: 1,
	dab(ctx, d) {
		ctx.fillStyle = d.color;
		ctx.beginPath();
		ctx.arc(d.x, d.y, d.size * (.2 + .3 * d.pressure), 0, 2 * Math.PI);
		ctx.fill();
	},
} satisfies BrushDef;
```

Usa `begin(color, size)` para preparar cada traço. Mantém o desenho dentro de 1,5 vezes `d.size` a partir do centro. Se o pincel ultrapassar essa margem, declara o multiplicador em `extent` para o histórico capturar todos os píxeis.

## Efeito de magia

Cria `src/magic/dots.ts`. Usa `stroke` para pincelar e `whole` para atuar sobre a folha inteira. Se o efeito tiver ambos, a opção **Página inteira** escolhe qual se aplica. O anfitrião corre o efeito numa imagem de amostra para gerar a miniatura. Usa as dimensões de `c.width` e `c.height`. Reinicia o estado do traço em `begin` e recebe o tamanho pelo argumento `size`.

```ts
import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';

export default {
	id: 'dots', label: { pt: 'Pintas', en: 'Speckles' },
	hint: { pt: 'Arrasta para deixar pintas.', en: 'Drag to leave speckles.' },
	category: 'padroes', order: 60, level: 1, usesColor: true,
	stroke(_from, to, c, size) {
		const radius = size * (.1 + c.random() * .2);
		c.ctx.fillStyle = c.color;
		c.ctx.beginPath();
		c.ctx.arc(to.x, to.y, radius, 0, 2 * Math.PI);
		c.ctx.fill();
		c.markDirty(strokeBounds(to, to, radius + 2));
	},
} satisfies MagicEffect;
```

## Carimbo

Cria `src/stamps/acorn.ts`. Usa uma imagem importada com `?url` ou cria um SVG local com `stampSvg`. Declara `tintable: true` para usar a cor escolhida na silhueta. O anfitrião mantém as proporções da imagem ao redimensionar, espelhar e virar.

```ts
import { stampSvg } from '../core/tooling/stamp-art';
import { icon } from '../ui/icons';
import type { StampDef } from '../core/types';

export default {
	id: 'acorn', label: { pt: 'Bolota', en: 'Acorn' },
	category: { pt: 'Natureza', en: 'Nature' },
	src: stampSvg(icon('<path fill="#e1ae71" d="M12 22h24q0 14-12 20-12-6-12-20Z"/><path fill="#9ac5a0" d="M8 22q0-13 16-13t16 13Z"/><path d="M24 9q0-4 5-5"/>')),
} satisfies StampDef;
```

Uma feature pode usar `stamps.add(def)` para registar um carimbo em execução. Recebe uma função para o retirar. Chama `app.refresh()` após alterar o registo. A feature guarda os dados do carimbo e gere a duração de qualquer URL de Blob que criar.

## Modelo

Cria `src/starters/frame.ts`. A app pinta primeiro a cor escolhida no diálogo **Novo**. `paper` pode deixá-la à vista ou desenhar sobre ela. A borracha repõe o resultado de `paper`. Usa `foreground` para traços que ficam por cima do desenho e limitam o enchimento.

```ts
import type { StarterDef } from '../core/types';

export default {
	id: 'frame', label: { pt: 'Moldura', en: 'Frame' },
	category: { pt: 'Papel', en: 'Paper' },
	paper() {},
	foreground(ctx, w, h) {
		ctx.strokeStyle = '#614f42';
		ctx.lineWidth = 5;
		ctx.strokeRect(60, 60, w - 120, h - 120);
	},
} satisfies StarterDef;
```

## Ferramenta

Cria `src/tools/point.ts`. A caixa ordena as ferramentas pelo campo `order`. Usa `level: 1` para incluir a ferramenta na interface simples. O painel lê `options` e mostra escolhas, tamanhos e interruptores. `ChoiceItem.level` controla a visibilidade de cada escolha. Duas ferramentas podem declarar a mesma chave `shared` para uma escolha que devem partilhar.

```ts
import { strokeBounds } from '../core/draw';
import type { Tool } from '../core/types';
import { icons } from '../ui/icons';

export default {
	id: 'point', label: { pt: 'Ponto', en: 'Dot' }, icon: icons.solid,
	hint: { pt: 'Toca para desenhar um ponto.', en: 'Tap to draw a dot.' },
	order: 90, level: 1, usesColor: true,
	down(p, c) {
		c.ctx.fillStyle = c.color;
		c.ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
		c.markDirty(strokeBounds(p, p, 7));
	},
	move() {},
	up() {},
} satisfies Tool;
```

O motor prepara `snapshot` ao iniciar o gesto e guarda um passo em `up`. Usa `overlay` para pré-visualizações e chama `markDirty` após cada alteração no bitmap. Usa `manualCommit: true` para manter um gesto aberto até chamares `c.commit()`. O motor repõe os píxeis marcados e os objetos de `c.labels` quando cancela o gesto. Usa `cancel` para limpar estado próprio da ferramenta.

## Feature

Cria `src/features/presentation/index.ts`. Regista ações na barra do trabalho com `registerAction` e ecrãs com `registerScreen`. Usa `placement: 'files'` para ações de ficheiro. A posição predefinida fica ao lado de **O meu texto**, onde cabem as ações **Animar** e **Apresentar**.

```ts
import type { Feature } from '../../ui/app';
import { h } from '../../ui/dom';
import { icons } from '../../ui/icons';

const title = { pt: 'Apresentar', en: 'Present' };

export default {
	id: 'presentation',
	mount(app) {
		app.registerScreen('presentation.show', app => {
			app.modal({ title, content: h('p', '', app.documents.page.text) });
		});
		app.registerAction({
			id: 'present', label: title, icon: icons.text, order: 20,
			disabled: app => !app.documents.page.text.trim(),
			run: app => app.openScreen('presentation.show'),
		});
	},
} satisfies Feature;
```

- Lê o estado em `app.store.get()` e observa-o com `app.store.subscribe(listener)`. A função devolvida termina a subscrição. Usa `app.configure(patch)` para guardar definições.
- Usa `app.documents` para abrir trabalhos, editar texto, reordenar páginas e guardar a folha atual. Antes de consumir os PNG do trabalho chama `await app.documents.save()`. Para ler ou gerir outros trabalhos, usa `app.storage`.
- Usa `app.surface.composite(ctx)` para desenhar a folha atual com o guia e as legendas. Usa `showOnion(page)` para mostrar uma página em papel vegetal e `showOnion()` para a retirar. Instala um renderizador de legendas com `setLabelRenderer({ draw, at })`.
- `app.modal({ title, content, onClose })` devolve uma função que fecha o diálogo. O diálogo contém o foco e devolve-o ao controlo de origem. Usa `app.notify(message, { label, run })` para ligar um aviso âmbar a uma ação como **Anular**.
- Usa `app.run(action)` para tratar erros de ações assíncronas. Usa `app.say(message)` para enviar instruções curtas ao Pingo.

## Utilitários

Em `src/core/draw.ts`, usa `interpolateDabs` para espaçar marcas, `strokeBounds` para delimitar um traço e `clampRect`, `readRect` e `writeRect` para limitar operações de píxeis à folha. Usa `hexToRgb`, `rgbToHex`, `rgbToHsl` e `hslToRgb` para converter cores. Usa `seededRandom` para pré-visualizações independentes e `c.random` durante um gesto.

Corre `npm run check` e `npm run e2e` após acrescentar o ficheiro.
