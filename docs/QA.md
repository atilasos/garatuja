# QA da integração

## Percursos

- Interface simples → folha branca com Pintar selecionado. O traço a vermelho, o carimbo, o enchimento e Desfazer deixaram os píxeis esperados. Fechei o separador e recuperei o desenho pela galeria — 2026-11-23
- Texto narrativo → livro de quatro páginas com cenário, personagens, balões e O meu texto em cada página. Percorri o livro e a apresentação, guardei um comentário Gostei… e confirmei um PDF A4 de cinco folhas, incluindo a capa — 2026-11-23
- Texto informativo → modelo Esquema com legendas, quatro legendas numeradas com setas e um título pintado com Texto. O PNG exportado tem 1600 × 1200 px — 2026-11-23
- Animação → dupliquei até ter oito páginas e desloquei a bola com Mover e Papel vegetal. Reproduzi até ao fim a 3, 6 e 12 quadros por segundo. Verifiquei o GIF e o WebM, incluindo a presença da legenda no GIF — 2026-11-23
- Professor → a porta rejeitou uma resposta errada. Mudei o nome da turma e as permissões de impressão e importação. Exportei dois trabalhos num `.garatuja` e importei ambos na galeria de uma sessão limpa — 2026-11-23
- Offline → depois de o service worker assumir o controlo, recarreguei sem rede e repeti desenho, mudança de cor, carimbo, enchimento, Desfazer e recuperação pela galeria — 2026-11-23
- Legendas → confirmei o renderizador nas miniaturas, no livro, na apresentação, na impressão, no leitor de animação e no GIF. Em retrato, medi a barra de ações de um balão e confirmei que deixava livres a legenda e a pega. Em Só maiúsculas, Texto, Legenda e O meu texto guardaram acentos e cedilha em maiúsculas — 2026-11-23

## Regressões

- Dois separadores no mesmo trabalho → Abrir manteve a revisão quando a folha estava limpa. As alterações chegaram ao outro separador. Duas gravações concorrentes preservaram as duas versões. Uma repetição também preservou as alterações feitas a uma cópia recuperada — 2026-11-23
- Saída durante uma gravação → o arranque recuperou o rascunho com título e texto. Anular a eliminação de um comentário e sair da apresentação preservou o comentário após recarregar — 2026-11-23
- `QuotaExceededError` no IndexedDB → Abrir mostrou a galeria e o aviso âmbar. Os ficheiros da criança e do professor incluíram o desenho e o texto em memória. Libertar espaço e tentar de novo removeu o aviso — 2026-11-23
- Histórico de três páginas → a página inativa mais antiga perdeu o histórico primeiro. As 30 alterações de folha inteira ocuparam 172 800 000 bytes, cerca de 164,8 MiB, antes e depois de passar para Refazer. Apagar a página ou mudar de trabalho libertou o histórico — 2026-11-23
- PIN e limpeza → toque curto mostrou a instrução no diálogo. A conta rejeitou respostas em algarismos. O PIN guardado com salt continuou a funcionar após recarregar. APAGAR eliminou os carimbos e o trabalho na reciclagem, revogou o URL do carimbo e impediu a gravação de um separador desatualizado — 2026-11-23
- Faixa de texto → abriu o editor, acompanhou a página selecionada e manteve o estado recolhido após recarregar. A miniatura ganhou um ícone quando a página tinha texto — 2026-11-23
- Papel vegetal → a cor de um píxel da folha atual ficou idêntica numa captura do ecrã fora dos traços fantasma — 2026-11-23
- Livro e diapositivos → a capa tipográfica incluiu título, autor, destinatário e turma. A pré-visualização do livro de uma página sem título nem autor mostrou uma única folha. Os diapositivos mantiveram a ordem escolhida, mostraram todas as páginas e avançaram por teclado e em modo automático — 2026-11-23
- Texto e tipos de letra → o bloco multilinear subiu no fundo da folha. Um bloco demasiado alto ficou em edição com aviso âmbar. As amostras manuscrita e de máquina de escrever tiveram margens nos quatro lados — 2026-11-23
- Magia → as cinco categorias ficaram visíveis. O interruptor Em toda a folha ficou junto dos tamanhos. As inversões foram reversíveis e as dobras continuaram disponíveis. Deslocar envolveu as duas margens e voltou à posição inicial — 2026-11-23
- Carimbos e Mover → a grelha deslocou-se abaixo dos controlos fixos dos carimbos. A rotação livre continuou visível ao percorrer a grelha. A coleção vazia mostrou uma instrução adequada à interface simples. Retângulo e Laço mostraram instruções diferentes — 2026-11-23
- Modelos estruturais → o Encher ficou dentro das zonas do esquema, linha do tempo, ciclo, antes/depois, cartaz, página de livro e postal — 2026-11-23
- Estados e acessibilidade → Animar, Desfazer e Refazer explicaram por que estavam indisponíveis. Só maiúsculas chegou aos botões, campos e diálogos. As orientações da impressão e os pares das definições tiveram ícones distintos. Em inglês a ajuda mostrou Space — 2026-11-23

## Regressões da segunda ronda

- Edições pendentes → 99 combinações de nove ferramentas ou efeitos com 11 ações de saída. Os testes confirmaram as alterações recuperadas do IndexedDB e descodificaram a primeira imagem dos PNG e GIF exportados — 2026-11-23
- Texto demasiado alto → Guardar persistiu a frase em rascunho. Recarregar reabriu o campo com a mesma frase. O formato de intercâmbio também conservou o rascunho — 2026-11-23
- Cancelar a escrita → Escape e Cancelar fecharam Texto e Legenda. Desfazer repôs a escrita e Refazer voltou a fechá-la — 2026-11-23
- Clique fixo → Carimbo, Encher sólido e Magia na folha inteira ficaram concluídos depois do primeiro clique e permaneceram no histórico após trocar de ferramenta — 2026-11-23
- Dois separadores → a eliminação diferida manteve o trabalho que o segundo separador tinha guardado. Uma alteração ao som manteve as permissões do professor. Dois carimbos gravados ao mesmo tempo receberam números distintos — 2026-11-23
- Quota esgotada → foi possível mudar de página, começar outro trabalho, exportar a versão em memória e gravá-la depois de libertar espaço — 2026-11-23
- Exportação do professor → excluiu um trabalho na reciclagem noutro separador. O teste unitário confirmou o progresso e a importação de cada volume. Uma prova com 23 desenhos sintéticos usou o limite real de 160 MiB e recuperou os 23 trabalhos de dois volumes de 161 343 547 e 15 366 353 bytes — 2026-11-23
- Histórico revisto → visitar de novo a página criada primeiro protegeu o seu histórico. A página inativa visitada há mais tempo perdeu o histórico primeiro. O mesmo cenário passou em `5017596` — 2026-11-23
- Folha inicial intacta → Novo criou o trabalho escolhido sem deixar uma folha inicial vazia na galeria — 2026-11-23
- Interação → Pronto deixou a legenda sem seleção. A apresentação percorreu o texto antes de avançar. Título, autor e texto guardaram maiúsculas e acentos. A faixa anunciou o texto da página — 2026-11-23
- Definições do professor → Remover PIN voltou a abrir a porta pela soma. As ferramentas desativadas permaneceram ocultas após escolher Simples ou Completa. A confirmação de eliminação aceitou «apagar» — 2026-11-23
- Teclado no ecrã → QWERTY, cedilha, vogais acentuadas, maiúsculas, apagar e nova linha funcionaram em campos de escrita da folha e dos diálogos. Foi possível misturar toques nas teclas e teclado físico. Um comentário escrito no teclado foi submetido com o primeiro clique — 2026-11-23
- Categorias e confirmações → os separadores mostraram ícone e seleção. Em toda a folha teve ícone próprio. A confirmação de gravação apareceu no rodapé e desapareceu ao fim de quatro segundos — 2026-11-23

## Layout

| Janela CSS | Mínimo com faixa visível | Mínimo com faixa recolhida |
| --- | ---: | ---: |
| 1024 × 768 | 580 × 435 px | 620 × 465 px |
| 1280 × 800 | 700 × 525 px | 740 × 555 px |
| 1366 × 768 | 700 × 525 px | 740 × 555 px |
| 1920 × 1080 | 1100 × 825 px | 1100 × 825 px |
| 768 × 1024 | 740 × 555 px | 740 × 555 px |
| 810 × 1080 | 780 × 585 px | 780 × 585 px |
| 834 × 1194 | 800 × 600 px | 800 × 600 px |
| 390 × 844 | 330 × 247,5 px | 330 × 247,5 px |

- Matriz de layout → 464 combinações de formato, modo e ferramenta. As caixas individuais dos caracteres detetaram quebras dentro de palavras, corte e sobreposição. A matriz também verificou os alvos, a altura da folha, a miniatura da primeira página, as escolhas visíveis e a ausência de deslocamento horizontal da página — 2026-11-23
- Layout em retrato a 768 × 1024 e 390 × 844 → Novo, Abrir, Guardar, Desfazer e Refazer estiveram à vista. Mover e Imprimir ficaram acessíveis na faixa com deslocamento horizontal — 2026-11-23
- 23 capturas `final-*.png` → confirmei visualmente a folha e a faixa, os números da seleção na galeria, o leitor em ecrã inteiro, a capa sem ilustração, o interruptor de Magia e a rotação livre dos carimbos — 2026-11-23

Capturas da [mesa a 1024](screens/final-1024x768.png), [mesa a 1280](screens/final-1280x800.png), [mesa a 1366](screens/final-1366x768.png), [mesa a 1920](screens/final-1920x1080.png), [mesa em retrato](screens/final-768x1024.png), [retrato a 810](screens/final-810x1080.png), [retrato a 834](screens/final-834x1194.png), [telemóvel](screens/final-390x844.png), [interface simples](screens/final-simples-1024x768.png), [faixa de texto](screens/final-faixa-texto-1366x768.png), [capa](screens/final-capa-1366x768.png), [leitura](screens/final-leitura-1366x768.png), [galeria em modo Diapositivos](screens/final-diapositivos-1366x768.png), [leitor de diapositivos](screens/final-diapositivos-leitor-1366x768.png), [apresentação](screens/final-apresentacao-1366x768.png), [comentários](screens/final-comentarios-1366x768.png), [impressão](screens/final-impressao-1366x768.png), [esquema](screens/final-esquema-1920x1080.png), [papel vegetal](screens/final-papel-vegetal-1366x768.png), [animação](screens/final-animacao-1366x768.png), [Magia](screens/final-magia-1366x768.png), [carimbos](screens/final-carimbos-1366x768.png) e [área do professor](screens/final-professor-1366x768.png).

```sh
GARATUJA_CAPTURE_SCREENS=1 npm run e2e -- integration.spec.ts layout.spec.ts council-workflows.spec.ts batch-g.spec.ts layout-matrix.spec.ts
```

## Desempenho

Chromium a 4× de redução de CPU por CDP, janela de 1366 × 768, build de teste servido localmente.
A latência mede o tempo entre o evento e o primeiro `requestAnimationFrame` depois do processamento
na folha de 1600 × 1200. A troca inclui a leitura, a composição e a transição de estado.

| Medição | Amostras | Mediana | p95 | Intervalo |
| --- | ---: | ---: | ---: | ---: |
| Segmento de um traço com Redondo | 5 | 94 ms | 112 ms | 2–112 ms |
| Enchimento sólido de folha uniforme | 20 | 38 ms | 42 ms | 33–43 ms |
| Negativo na página inteira | 5 | 179 ms | 222 ms | 21–222 ms |
| Troca de página | 5 | 201 ms | 205 ms | 134–205 ms |
| Arranque a frio | 1 | 1100 ms | 1100 ms | 1100–1100 ms |
| Recarregamento | 4 | 478 ms | 660 ms | 419–660 ms |

```sh
GARATUJA_BENCHMARK=1 npm run e2e -- performance.spec.ts --workers=1
```

O codificador GIF fica num worker separado. As licenças carregam ao abrir Créditos. Os ficheiros dos carimbos e as fontes do editor são locais e estão no pré-cache.

## Execuções finais

- `npm run check` → 17 ficheiros e 273 testes unitários passaram em cada uma das duas execuções. Tipos, lint e build também passaram. O JavaScript inicial tem 124,10 kB gzip — 2026-11-23
- `npm run e2e` → 278 passaram e 9 ficaram fora da execução normal em cada uma das duas execuções consecutivas. A primeira demorou 2,7 min e a segunda 2,8 min — 2026-11-23
- Capturas finais → 88 testes passaram na execução de captura. Depois do ajuste à miniatura, os quatro testes de captura em retrato passaram de novo — 2026-11-23
- Benchmark Chromium 4× → o enchimento ficou abaixo da meta de 150 ms. O traço teve mediana de 94 ms e p95 de 112 ms nesta execução — 2026-11-23

## Limitações observadas

- Usei Chromium automatizado com ratos, teclados, toque e caneta simulados. A prova de autonomia de crianças, o toque num dispositivo físico e o tempo num Chromebook real continuam por verificar.
- A impressão foi verificada em PDF A4, incluindo a orientação dos dois formatos. A saída numa impressora física depende do dispositivo.
- Os títulos longos podem aparecer abreviados no cartão. O diálogo e o nome acessível mostram o título integral. As faixas de retrato deslocam-se na horizontal e os telemóveis mais baixos podem exigir deslocamento vertical.
- Os modelos antigos guardam o papel e as guias como imagens. As linhas novas dos modelos aplicam-se às páginas criadas com esses modelos.
- O limite de cada ficheiro `.garatuja` é 160 MiB. A exportação do professor fornece vários ficheiros acima desse valor. A galeria aceita a versão atual e trabalhos individuais v1. O formato JSON antigo da exportação do professor não é importável.
