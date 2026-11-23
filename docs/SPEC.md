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
   acompanha o texto. A faixa junto da folha mostra o texto da página durante o desenho. A app nunca fornece textos nem temas.
3. **Circuito completo: produzir → trabalhar em cooperação → comunicar.** Modo «Apresentar à turma»
   (ecrã inteiro), impressão/exportação para jornal, livro ou cartaz, e comentários dos colegas
   apenas qualitativos («Gostei…», «Pergunto…», «Sugiro…»).
4. **Sem recompensas.** Proibido: pontos, estrelas, medalhas, níveis, streaks, rankings, confetes
   de «parabéns», avaliação automática do desenho.
5. **O erro é reparável.** Desfazer/refazer sempre visíveis; avisos em âmbar, concretos, nunca
   vermelhos nem sonoros por defeito. A gravação automática preserva as duas versões em caso de conflito.
   Se falhar, mantém o desenho em memória e oferece nova tentativa ou um ficheiro `.garatuja`.
6. **Autonomia.** Interface estável e previsível, utilizável sem o professor e sem saber ler:
   ícone + palavra em todos os botões, linha de ajuda do Pingo, leitura em voz alta opcional.
7. **Inclusão no contexto comum.** Os apoios (interface simples/completa, clique fixo, cursor
   grande, alto contraste, mão esquerda, maiúsculas e teclado no ecrã) são opções da mesma ferramenta, escolhidas
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

```text
Marca · Dados do trabalho · Páginas · O meu texto · Animar · Ler · Apresentar
Ferramentas em duas colunas  │                    │ Tamanhos e categorias
Desfazer / Refazer           │    Folha (4:3)      │ Opções com deslocamento
Novo / Abrir                 │ Faixa de texto     │
Guardar / Imprimir           │ recolhível         │
Cores com nome · Conta-gotas · Misturar cor
Pingo · Ouvir · Som · Definições
```

- Com a faixa recolhida, a folha mede pelo menos 740 × 555 a 1366 × 768 e 620 × 465 a 1024 × 768.
  Com a faixa aberta, mede pelo menos 700 × 525 e 580 × 435, respetivamente. A 1920 × 1080,
  mede pelo menos 1100 × 825 nos dois estados. O ecrã principal cabe na janela nestes três formatos.
- A faixa mostra até duas linhas do texto da página com reticências quando falta espaço. Tocar abre o editor.
  A escolha de recolher a faixa fica no dispositivo. Uma miniatura com texto tem um ícone.
- Em retrato, a folha usa até 55% da altura da janela nos tablets. Aos 390 × 844, mede pelo menos
  330 × 247,5 px. Os mínimos a 768 × 1024, 810 × 1080 e 834 × 1194 são, respetivamente,
  740 × 555 px, 780 × 585 px e 800 × 600 px. A 1280 × 800, são 700 × 525 com a faixa
  aberta e 740 × 555 com a faixa recolhida.
- As opções em retrato têm duas filas de escolhas de pelo menos 56 px quando há escolhas suficientes.
  As faixas de ferramentas e opções podem deslocar-se na horizontal. A página pode deslocar-se
  na vertical, com Desfazer, Refazer, Novo, Abrir e Guardar na faixa de ferramentas fixa ao percorrer.
  Os controlos dos carimbos ficam acima da grelha. Os rótulos dos botões quebram entre palavras ou
  junto de um hífen.
- Os botões têm pelo menos 48 × 48 px. Onde há espaço, os controlos principais têm 56 px ou mais.
- A interface simples esconde Linhas e Mover, filtra as escolhas por nível e aumenta os botões de ferramentas. A opção Mão esquerda espelha as colunas em paisagem.
- O cartão do trabalho abre Título, Autor e Para quem é?. A galeria em Abrir abre trabalhos guardados, exporta a folha atual para PNG e importa ou exporta `.garatuja`.
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
| Texto | `text` | escreve no bitmap; fontes: Andika, manuscrita escolar (Playwrite PT), título, máquina de escrever; tamanhos; o bloco sobe para caber na folha e fica em edição se for demasiado alto; opção Só maiúsculas em toda a interface |
| Legenda | `label` | texto que continua editável (mover, reescrever, apagar). Pronto termina a edição e liberta a seleção; **seta de legenda** e **número** para esquemas de texto informativo; **balões** de fala/pensamento/grito para narrativa |
| Encher | `fill` | sólido, gradiente linear, radial, padrões; tolerância que respeita linhas do modelo |
| Magia | `magic` | ≥ 60 efeitos (`MagicEffect`) em 5 categorias: pintar, cor, distorcer, padrões, página inteira |
| Borracha | `eraser` | redonda/quadrada, 5 tamanhos; repõe o papel |
| Mover | `move` | recortar um retângulo ou um laço, mover/aumentar/rodar/duplicar; **guardar como carimbo** |
| Desfazer / Refazer | — | ≥ 30 alterações de bitmap de folha inteira na página ativa. Orçamento global de 168 MiB e prioridade à página ativa. |
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
padrão repetido, redemoinho, vento. Espelho e Virar invertem toda a folha e são reversíveis.
Dobrar ao meio e Dobrar de cima refletem uma metade sobre a outra. Nos efeitos com pincel e modo de folha
inteira, o interruptor Em toda a folha fica junto dos tamanhos.

## 5. Páginas, livro e animação

- Tira de páginas: adicionar, duplicar, apagar (com anular), reordenar por arrastar ou por botões.
- **Papel vegetal**: mostra a página anterior esbatida (e opcionalmente a seguinte).
  O branco é neutro e deixa intactas as cores da folha atual fora dos traços fantasma.
- **Animar**: reproduz as páginas em ciclo; velocidade em 3 passos (devagar/normal/depressa) com
  nome e ícone (caracol, gato, lebre); exporta **GIF** e **vídeo WebM**.
- **Apresentar à turma**: ecrã inteiro, página + texto grande, setas grandes, teclado/clicker;
  o avanço percorre primeiro o texto da página por ecrãs. No fim, painel de comentários «Gostei / Pergunto / Sugiro» (texto livre, com nome de quem diz).
- **Ler/Imprimir como livro** tem capa tipográfica com título, autor, destinatário e turma, quando definida.
  Cada ilustração aparece junto do seu texto. Um trabalho de uma página sem título nem autor começa na própria página.
- **Abrir → Diapositivos** permite selecionar trabalhos pela ordem em que a turma os vai ver.
  O leitor em ecrã inteiro passa por todas as páginas e mostra o título e autor de cada trabalho.
  As setas e o teclado avançam manualmente. O avanço automático tem três velocidades.
- O ficheiro `.garatuja` leva um ou mais trabalhos para outro dispositivo, com páginas, texto, legendas e comentários. Abrir importa os ficheiros atuais e os trabalhos individuais do formato v1.

## 6. Área do professor

A porta do adulto exige premir durante 3 s e escrever por extenso a resposta a uma soma de dois números
de 23 a 47. O professor pode configurar um PIN local opcional de quatro algarismos. A aplicação guarda
um hash com salt. Para repor um PIN perdido, é preciso limpar os dados do site no navegador.

O professor pode remover o PIN na área do professor. Pode ocultar Carimbo, Magia, Texto, Legenda,
Mover, Formas, Linhas e Encher. As restrições aplicam-se às interfaces Simples e Completa e são
partilhadas pelos separadores.

O professor pode exportar os trabalhos com as alterações atuais, mesmo quando a gravação falha.
A exportação exclui a reciclagem e mostra o progresso. Quando o arquivo excede 160 MiB, apresenta
volumes `.garatuja` importáveis individualmente. Um trabalho maior do que um volume divide-se nas
fronteiras entre páginas.
A eliminação exige escrever APAGAR (DELETE na interface em inglês). Limpa os trabalhos, carimbos,
reciclagem, rascunhos de recuperação e definições.

Opções: interface
simples/completa por defeito, som, leitura em voz alta, só maiúsculas, permitir imprimir,
permitir importar ficheiros, clique fixo, cursor grande, alto contraste, mão esquerda, teclado no ecrã, língua
(pt-PT / en), nome da turma, exportar todos os trabalhos, apagar dados do dispositivo.

O teclado no ecrã é opcional e também está nas definições da criança. A disposição pode ser
alfabética ou QWERTY. Texto, Legenda, O meu texto, os dados do trabalho e os comentários aceitam
rato, toque e teclado físico. O teclado no ecrã tem teclas de pelo menos 48 px, maiúsculas, vogais acentuadas,
cedilha, pontuação, espaço, apagar e nova linha nos campos com várias linhas.

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
- Os separadores com o mesmo trabalho detetam alterações por BroadcastChannel. Um separador limpo recarrega
  a versão nova. A gravação compara a versão dentro da transação do IndexedDB e cria um trabalho com o sufixo
  «(cópia)» se outro separador já tiver guardado. Ao expirar o prazo de Anular, uma eliminação
  confirma a revisão dentro da transação. Se o trabalho mudou, mantém-no na galeria e avisa.
  As definições são gravadas por campo. As alterações chegam aos restantes separadores.
- Antes de guardar, tirar uma cópia da folha, mudar de ferramenta ou página, abrir um ecrã ou sair
  do separador, o motor assenta os gestos pendentes. Um texto que excede a folha é guardado como
  rascunho da página e volta ao campo de edição quando a página é reaberta. Escape cancela a edição.
  Desfazer recupera a sessão de Texto ou Legenda cancelada. Carimbo, Encher sem degradé e Magia de
  folha inteira terminam com um toque, também em clique fixo.
- Se faltar espaço para guardar, a criança pode mudar de página ou começar outro trabalho. A
  versão em memória continua disponível na galeria e no ficheiro de recuperação. O aviso de
  gravação mantém-se até a gravação das alterações. A folha inicial intacta fica fora da galeria.
- O histórico guarda diferenças RGB reversíveis por XOR no retângulo alterado. Trinta substituições de bitmap
  de 1600 × 1200 ocupam 164,8 MiB, mesmo com píxeis aleatórios. O orçamento inclui Desfazer e Refazer e liberta
  primeiro o histórico das páginas inativas menos recentes. Apagar uma página ou trocar de trabalho liberta o
  histórico correspondente. Uma troca entre duas cores lisas guarda as duas cores num passo reversível.
- Testes: Vitest (lógica pura: enchimento, histórico, geometria, armazenamento) e Playwright
  (fluxos reais em Chromium). `npm run check` = typecheck + lint + unit + build; `npm run e2e`.
- Desempenho: traço sem atraso percetível num Chromebook; enchimento de página inteira < 150 ms;
  usa-se o p95 do benchmark de Chromium a 4×. Efeitos de página inteira < 500 ms.

## 8. Feito quando

- Todas as ferramentas da tabela funcionam com rato, toque e caneta, e têm teste e2e.
- Um aluno de 5 anos consegue desenhar, mudar de cor, desfazer e encontrar o desenho no dia seguinte
  sem ler; um aluno de 10 anos consegue fazer um livro de 4 páginas com texto, um esquema legendado
  e uma animação de 8 páginas exportada em GIF.
- Zero pedidos de rede após o carregamento; funciona offline.
- `npm run check` e `npm run e2e` passam.

## Alterações ao contrato

- `ChoiceItem.level` é opcional. Permite que o painel aplique o modo simples também aos pincéis e efeitos alojados numa ferramenta.
- `OptionSpec.shared` é opcional nas escolhas. Pintar e Linhas partilham a seleção de pincel.
- `BrushDef.extent` é opcional. Dá ao histórico a margem necessária para pincéis que pintem além da área habitual.
- `BrushDab.speed` é opcional. Dá a velocidade suavizada do ponteiro aos pincéis sensíveis ao movimento (fita, caneta).
- `BrushDef.segment` permite preencher um segmento contínuo. O pincel Quadrado usa-o para suavizar as bordas em curvas.
- `Tool.tapOnly` identifica as ações que terminam com um único toque mesmo quando clique fixo está ativo.
- `Tool.flushPending` assenta o estado que sobrevive ao fim de um gesto antes de sair da ferramenta ou copiar a folha.
- `Tool.updatePending` redesenha uma pré-visualização que aguarda outro gesto depois de uma alteração de cor ou opção.
- `ChoiceItem.hint`, `BrushDef.hint` e `WorkAction.hint` alimentam a linha de ajuda do Pingo.
