# Garatuja — especificação do produto

Aplicação web de desenho para alunos dos 4 aos 11 anos, com as funcionalidades do Tux Paint,
pensada para **ilustrar textos narrativos e informativos escritos pelas crianças** e para
**animar** os desenhos. Nome, mascote («Pingo», uma gota de tinta), arte e sons são originais:
não se copia nome, pinguim, ícones, carimbos nem sons do Tux Paint.

Contratos de código: `src/core/types.ts` (fonte de verdade).

## 1. Princípios (da Sebenta do professor, modelo MEM)

Regras de produto — não são negociáveis por conveniência técnica.

1. **Autoria da criança.** Cada trabalho tem título, autor e «Para quem é?». Sem IA generativa,
   sem «completar o desenho». Os carimbos existem (paridade), mas a criança pode criar **os seus
   próprios carimbos** a partir do que desenhou.
2. **O texto é da criança e vem primeiro.** Cada página tem um campo «O meu texto»; a ilustração
   acompanha o texto. A app nunca fornece textos nem temas.
3. **Circuito completo: produzir → trabalhar em cooperação → comunicar.** Modo «Apresentar à turma»
   (ecrã inteiro), impressão/exportação para jornal, livro ou cartaz, e comentários dos colegas
   apenas qualitativos («Gostei…», «Pergunto…», «Sugiro…»).
4. **Sem recompensas.** Proibido: pontos, estrelas, medalhas, níveis, streaks, rankings, confetes
   de «parabéns», avaliação automática do desenho.
5. **O erro é reparável.** Desfazer/refazer sempre visíveis; avisos em âmbar, concretos, nunca
   vermelhos nem sonoros por defeito; nada se perde (gravação automática).
6. **Autonomia.** Interface estável e previsível, utilizável sem o professor e sem saber ler:
   ícone + palavra em todos os botões, linha de ajuda do Pingo, leitura em voz alta opcional.
7. **Inclusão no contexto comum.** Os apoios (interface simples/completa, clique fixo, cursor
   grande, alto contraste, mão esquerda, maiúsculas) são opções da mesma ferramenta, escolhidas
   livremente; nunca um «modo para quem tem dificuldades», nunca cores de semáforo.
8. **Ambiente fechado e privado.** Tudo fica no dispositivo (IndexedDB). Zero pedidos de rede em
   execução, zero contas, zero telemetria, zero ligações externas. Funciona offline (PWA).
9. **Som por opção.** Desligado por defeito; um botão visível liga-o.
10. **Cor nunca é a única semântica.** Estados selecionados mudam forma/contorno; as cores têm nome.

## 2. Modelo mental

- Um **trabalho** (`ProjectRecord`) é uma lista de **páginas**. Uma página = um desenho + o texto
  que ilustra + legendas editáveis.
- Uma página só → desenho simples. Várias páginas → **história** (livro) ou **animação**: é o
  mesmo objeto visto de duas maneiras («Ler» mostra página + texto; «Animar» passa as páginas depressa).
- O bitmap da página é **opaco** (1600×1200, 4:3). O papel fica guardado à parte para a borracha.
- Acima do bitmap: desenho-guia do modelo (opcional), legendas vetoriais, sobreposição de pré-visualização,
  e papel vegetal (página anterior a ~25 %) quando ligado.

## 3. Ecrã principal (disposição herdada do Tux Paint, por ser previsível)

```
┌──────────────────────────────────────────────────────────────┐
│ Barra do trabalho: título · autor · tira de páginas · ▶ Animar · Apresentar · Som │
├────────┬──────────────────────────────────────────┬──────────┤
│ Ferra- │                                          │ Opções   │
│ mentas │              Folha (4:3)                 │ da ferra-│
│ (2 col)│                                          │ menta    │
├────────┴──────────────────────────────────────────┴──────────┤
│ Cores (paleta com nomes · conta-gotas · misturar cor)                │
│ Pingo: linha de ajuda (texto curto + botão ouvir)                    │
└──────────────────────────────────────────────────────────────┘
```

- Alvos de toque ≥ 56 px (≥ 48 px no mínimo absoluto); espaço ≥ 8 px.
- Funciona em 1024×768 (tablet), 1366×768 (Chromebook), quadro interativo e, degradando com
  graça, em retrato/telemóvel (ferramentas passam para baixo).
- Tipografia da interface: **Andika** (SIL, feita para leitores iniciais), empacotada localmente.
- Direção visual: «mesa de ateliê» — fundo creme, peças arredondadas e gordas, ícones a duas cores,
  sombra curta; a folha é a protagonista. Sem gradientes berrantes nem estética de jogo.
- Teclado: tudo operável (roving tabindex nas barras), foco bem visível, atalhos Ctrl+Z / Ctrl+Y.
- `prefers-reduced-motion` respeitado.

## 4. Ferramentas (paridade com o Tux Paint)

| Ferramenta | id | Conteúdo |
| --- | --- | --- |
| Pintar | `paint` | ≥ 20 pincéis (`BrushDef`): redondo, quadrado, caligrafia, giz, lápis de cera, aguarela, spray, marcador, pontilhado, direcionais (seta, pegadas), animados (cintilante), pressão da caneta; 5 tamanhos |
| Carimbo | `stamp` | categorias, tamanho, espelhar, virar, rodar; carimbos tingíveis; **«Os meus carimbos»** |
| Linhas | `lines` | reta com qualquer pincel; Shift = ângulos de 15° |
| Formas | `shapes` | quadrado, retângulo, círculo, elipse, triângulo, pentágono, hexágono, octógono, losango, estrelas 5/6 pontas, coração, seta; cheio/contorno; do centro/do canto; rodar |
| Texto | `text` | escreve no bitmap; fontes: Andika, manuscrita escolar (Playwrite PT), título, máquina de escrever; tamanhos; opção só maiúsculas |
| Legenda | `label` | texto que continua editável (mover, reescrever, apagar); **seta de legenda** e **número** para esquemas de texto informativo; **balões** de fala/pensamento/grito para narrativa |
| Encher | `fill` | sólido, gradiente linear, radial, padrões; tolerância que respeita linhas do modelo |
| Magia | `magic` | ≥ 60 efeitos (`MagicEffect`) em 5 categorias: pintar, cor, distorcer, padrões, página inteira |
| Borracha | `eraser` | redonda/quadrada, 5 tamanhos; repõe o papel |
| Mover | `move` | recortar um retângulo ou um laço, mover/aumentar/rodar/duplicar; **guardar como carimbo** |
| Desfazer / Refazer | — | ≥ 30 passos por página |
| Novo | — | cor do papel + modelos estruturais (liso, linhas, quadriculado, banda desenhada 2/3/4 vinhetas, esquema com legendas, ciclo, linha do tempo, cartaz) e cenários |
| Abrir | — | galeria com miniaturas; apagar (com confirmação e «anular»); diapositivos; importar/exportar |
| Guardar | — | automático + botão explícito (dá confiança); nunca pede nome de ficheiro |
| Imprimir | — | página (desenho + texto), livro inteiro; pode ser desligado pelo professor |

Magia — lista mínima: arco-íris, cintilar, desfocar, esborratar, clarear, escurecer, giz, blocos,
negativo, tingir, pingar, banda desenhada, espelho, virar, relva, tijolos, flor, espuma,
ondulações, ondas, caleidoscópio, mosaico, ruído, neve, chuva, carris, arte de fios, azulejo de
vidro, caligrafia, TV, relevo, contornos, silhueta, deslocar, lupa, perspetiva, puzzle, confetes,
olho de peixe, metal, luz, tornado, xadrez, pontilhismo, meio-tom, dessaturar, sépia, remover cor,
manter cor, pixelizar, aguada, estrelas, bolhas, teia, folhas, nuvens, simetria (2/4/8 eixos),
padrão repetido, redemoinho, vento.

## 5. Páginas, livro e animação

- Tira de páginas: adicionar, duplicar, apagar (com anular), reordenar por arrastar ou por botões.
- **Papel vegetal**: mostra a página anterior esbatida (e opcionalmente a seguinte).
- **Animar**: reproduz as páginas em ciclo; velocidade em 3 passos (devagar/normal/depressa) com
  nome e ícone (caracol, gato, lebre); exporta **GIF** e **vídeo WebM**.
- **Apresentar à turma**: ecrã inteiro, página + texto grande, setas grandes, teclado/clicker;
  no fim, painel de comentários «Gostei / Pergunto / Sugiro» (texto livre, com nome de quem diz).
- **Ler/Imprimir como livro**: capa (título, autor, para quem é) + página por página com texto.
- Ficheiro `.garatuja` (um único ficheiro) para levar o trabalho para outro dispositivo.

## 6. Área do professor

Porta de adulto (premir 3 s + responder a uma conta escrita por extenso). Opções: interface
simples/completa por defeito, som, leitura em voz alta, só maiúsculas, permitir imprimir,
permitir importar imagens, clique fixo, cursor grande, alto contraste, mão esquerda, língua
(pt-PT / en), nome da turma, exportar todos os trabalhos, apagar dados do dispositivo.

## 7. Arquitetura

- Vite + TypeScript estrito, **sem framework de UI** (DOM + pequeno `h()`), CSS com variáveis.
- Sem dependências de execução além de fontes e (se necessário) um codificador GIF pequeno.
- `src/core/` motor (superfície, ponteiro, histórico por diferenças de retângulo sujo, páginas,
  armazenamento IndexedDB, som WebAudio sintetizado, i18n).
- `src/tools/*.ts`, `src/brushes/*.ts`, `src/magic/*.ts`, `src/stamps/*`, `src/starters/*.ts`:
  um plug-in por ficheiro, descoberto por `import.meta.glob(..., { eager: true })`.
- `src/ui/` casca, painéis, diálogos. `src/features/` páginas, animação, apresentação, galeria,
  professor.
- Texto visível: sempre `L10n` (`pt` obrigatório em pt-PT AO90, `en` de recurso). Nunca strings soltas.
- Testes: Vitest (lógica pura: enchimento, histórico, geometria, armazenamento) e Playwright
  (fluxos reais em Chromium). `npm run check` = typecheck + lint + unit + build; `npm run e2e`.
- Desempenho: traço sem atraso percetível num Chromebook; enchimento de página inteira < 150 ms;
  efeitos de página inteira < 500 ms.

## 8. Feito quando

- Todas as ferramentas da tabela funcionam com rato, toque e caneta, e têm teste e2e.
- Um aluno de 5 anos consegue desenhar, mudar de cor, desfazer e encontrar o desenho no dia seguinte
  sem ler; um aluno de 10 anos consegue fazer um livro de 4 páginas com texto, um esquema legendado
  e uma animação de 8 páginas exportada em GIF.
- Zero pedidos de rede após o carregamento; funciona offline.
- `npm run check` e `npm run e2e` passam.

## Alterações ao contrato

(Quem precisar de alterar `src/core/types.ts` regista aqui o quê e porquê.)
