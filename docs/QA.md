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

## Regressões da terceira ronda

- Desfazer a meio de um gesto ou durante a escrita → botão e Ctrl+Z cancelaram a edição pendente em nove ferramentas ou efeitos. O traço já confirmado só desapareceu no passo seguinte. Refazer reabriu as sessões de Texto e Legenda — 2026-11-23
- Apagar o conteúdo de O meu texto e fechar → Desfazer repôs o texto anterior e Refazer voltou a apagá-lo. Título, autor e destinatário foram reversíveis num passo por sessão — 2026-11-23
- Ler, Apresentar à turma e Diapositivos com uma ou duas páginas → as setas e Page Down percorreram o texto antes de mudar de página. Anterior funcionou na primeira página quando havia texto acima. O avanço automático parou no último ecrã de escrita — 2026-11-23
- Carregamento de Ler e impressão em Livro inteiro → com a composição atrasada 500 ms, a miniatura apareceu antes da ilustração completa. As amostras curta e longa imprimiram com 18 pt e 16 pt — 2026-11-23
- Teclado no ecrã na metade inferior → a matriz manteve à vista o campo, as ações e a última fila de teclas em Texto, Só texto e balões nos oito formatos. As teclas 0–9, «º», «ª» e hífen escreveram nos três campos. Um campo multilinha a meio da folha também deixou disponíveis os comandos e os números — 2026-11-23
- Conflito com dois separadores e falha de quota → a cópia de segurança do professor incluiu a versão guardada e a versão em memória com «(cópia)». Duplicar e Diapositivos usaram o rascunho local, mesmo depois de trocar de trabalho — 2026-11-23
- Apagar o trabalho aberto com a quota esgotada → a galeria retirou o trabalho. Anular repôs a revisão guardada e o rascunho descartado deixou de aparecer nas recuperações — 2026-11-23
- Navegar para fora aos 0, 50, 100, 250, 350 e 500 ms do primeiro traço → o Chromium recuperou o traço nas três repetições de cada intervalo. A escrita do rascunho também concluiu com a publicação bloqueada por outra transação. Em `e94402c` reproduzi perdas aos 0, 100 e 350 ms. Num ensaio instrumentado aos 0 ms, o IndexedDB ficou com zero trabalhos e zero rascunhos — 2026-11-23
- Papel vegetal com papel Noite, Céu e Floresta → só as marcas diferentes do papel ou guia surgiram na camada fantasma. Fora das marcas a camada ficou transparente — 2026-11-23
- Misturar cor → Enter e as setas juntaram tintas primárias. Mais uma gota alterou a mistura. A prateleira conservou as seis últimas cores após recarregar — 2026-11-23
- Encher em duas vinhetas → Pincel pintou a partir da região tocada sem atravessar o contorno. Apagar zona repôs a cor do papel e Desfazer recuperou a tinta — 2026-11-23
- Carimbos a 1366 × 768 e 1024 × 768 → a grelha mostrou pelo menos três e duas filas inteiras. Espelhar, virar e os dois botões de rotação ficaram numa fila — 2026-11-23
- Legendas em clique fixo → Só texto e Narrador abriram o campo no primeiro toque — 2026-11-23
- Texto demasiado alto → o aviso apareceu junto aos comandos enquanto se escrevia. Ao reduzir a letra, desapareceu e o texto pôde ser pousado — 2026-11-23
- Ações lado a lado → o tipo Só texto distingue-se da ferramenta Texto. A organização da página e o recorte têm ações de duplicação com nomes próprios — 2026-11-23
- Ferramentas desativadas no professor → a ajuda omitiu Mover e Magia. Os meus carimbos deixou de sugerir Mover e o painel Mover ocultou Fazer carimbo quando Carimbo ficou desativado. Os dois botões de língua partilharam um ícone próprio — 2026-11-23
- Português → English → português sem recarregar → os nomes de botões, barras e avisos mudaram de língua e o estado da mesa manteve-se — 2026-11-23
- Novo nos oito formatos → a grelha deslocou-se numa área acima de Começar. O primeiro e o último modelos ficaram ao alcance do foco, com folga em relação ao botão — 2026-11-23

## Regressões da quarta ronda

- Fechar O meu texto e desenhar no mesmo instante → o primeiro Desfazer retirou o traço e o segundo repôs o texto anterior. O resultado foi igual com Fechar e Escape — 2026-11-23
- Gravar a página selecionada com a transação em espera → a folha anterior e a miniatura ativa mantiveram-se. Desfazer anunciou a espera. Depois da gravação, Desfazer retirou o traço e recarregar manteve a página selecionada — 2026-11-23
- Alterar título na página 1 e título, autora e destinatário na página 2 → Desfazer na página 1 retirou primeiro o traço mais recente. Os dois passos seguintes repuseram os dados do livro pela ordem inversa. Refazer percorreu a sequência ao contrário — 2026-11-23
- Consultar texto, legenda, título e autor com Só maiúsculas ativo → os valores mistos conservaram-se e Desfazer retirou a última alteração real. Ao inserir caracteres, só esses caracteres passaram a maiúsculas — 2026-11-23
- Confirmação, aviso âmbar e falha de gravação → as coordenadas e as dimensões da folha mantiveram-se nos oito formatos — 2026-11-23
- Cartão com «A ponte», «A ponte da Lia» e «Rui» → título e autor couberam por inteiro nos oito formatos — 2026-11-23
- Conta-gotas e Misturar cor → os dois comandos ficaram inteiros e acessíveis sem deslocar a paleta ou a página nos oito formatos — 2026-11-23
- Ler, Apresentar à turma e Diapositivos → Anterior e Seguinte ficaram à mesma altura ao passar da capa à página, entre páginas e na passagem para os comentários — 2026-11-23
- Balão de sete linhas no tamanho Máximo → o aviso apareceu durante a escrita e Pronto manteve o campo aberto. Depois de encurtar o texto, Pronto aceitou-o e o contorno manteve-se na folha ao arrastar para o canto — 2026-11-23
- Livro A4 com 1, 10, 30 e 60 linhas → 2, 2, 3 e 4 páginas ao alto e 2, 3, 3 e 5 ao baixo, incluindo a capa. A extração do texto confirmou o rodapé junto da última linha nos oito PDFs — 2026-11-23
- Só texto e Narrador em Clique fixo → um toque livre abriu uma legenda nova. Uma legenda existente e a pega da seta responderam ao movimento entre dois cliques — 2026-11-23
- Teclado no ecrã → «á ç 123» deu acesso a acentos e números no telemóvel. Nos restantes formatos, a fila de acentos seguiu-se às letras — 2026-11-23
- Fechar Definições, experimentar cores e sair sem aplicar, ou cancelar a rotação de uma forma → Pingo voltou à dica da ferramenta ativa — 2026-11-23
- Falha de gravação durante a troca de língua → o aviso persistente e os botões de recuperação passaram para inglês e voltaram a português na mesma sessão — 2026-11-23
- Usar como modelo → criou um trabalho de uma página com a primeira ilustração como papel. A borracha repôs a ilustração após desenhar por cima. O trabalho de origem conservou as duas páginas — 2026-11-23
- Capturas finais → foram regeneradas e inspecionadas as 26 imagens da mesa, da galeria e das atividades. A captura do leitor de diapositivos resultou no mesmo ficheiro — 2026-11-23

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
GARATUJA_CAPTURE_SCREENS=1 npm run e2e -- integration.spec.ts layout.spec.ts council-workflows.spec.ts batch-g.spec.ts layout-matrix.spec.ts council-regressions.spec.ts
```

A terceira ronda acrescenta capturas do [misturador de cor](screens/final-misturador-1366x768.png),
do [teclado com o campo em baixo](screens/final-teclado-em-baixo-1366x768.png) e do
[papel vegetal sobre papel Noite](screens/final-papel-vegetal-noite-1366x768.png).

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

## Execuções da terceira ronda

- `npm run check`, duas execuções consecutivas → tipos, lint e build passaram. Cada execução passou 273 testes em 17 ficheiros. O JavaScript inicial ficou em 128,73 kB gzip — 2026-11-23
- `npm run e2e`, duas execuções consecutivas → 337 passaram e 9 ficaram fora da execução normal em cada execução. A primeira demorou 3,6 min e a segunda 3,5 min — 2026-11-23
- Regeneração das capturas → 118 testes passaram em 1,4 min. Conferi as 26 imagens `final-*.png`, incluindo a posição do teclado, a poça do misturador e as cores do papel Noite — 2026-11-23

## Execuções da quarta ronda

- `npm run check` → TypeScript, ESLint, 273 testes unitários e compilação passaram — 2026-11-23
- Cinco execuções seguidas de `npm run e2e` → cada uma teve 356 testes aprovados, 9 ignorados pela configuração e zero falhas. Duração por ordem em minutos: 3,6, 3,6, 3,6, 3,5 e 3,6 — 2026-11-23

## Quinta ronda

### Recuperação e autoria

- Quota de publicação esgotada ao recarregar → abre o texto e o desenho do rascunho, mostra o aviso âmbar, exporta para `.garatuja` e publica quando a próxima tentativa tem espaço — 2026-11-23
- Saída durante a publicação ou depois do primeiro traço → o rascunho é recuperado e o trabalho reaparece uma única vez. Um rascunho de outro trabalho conserva a entrada na galeria e fornece a imagem atual a Usar como modelo. Rascunhos independentes do mesmo trabalho ficam disponíveis em separado — 2026-11-23
- Publicações simultâneas, cópia alterada noutro separador e Anular → página e comentário são repostos na cópia em que a eliminação ficou gravada. Anular um carimbo repõe o carimbo apagado mesmo que outro separador crie um novo — 2026-11-23
- Reciclagem, expiração e apagar dados → a expiração confirma a revisão, Anular repõe um trabalho que só tinha rascunho, um aviso antigo de Anular só vale para a eliminação que o criou e um separador antigo não recria os trabalhos apagados pelo professor — 2026-11-23
- Importação e exportação do professor → a importação valida as imagens antes de publicar o lote, atribui identificadores novos e abre o primeiro trabalho importado sem substituir o anterior. A exportação inclui os rascunhos e as revisões guardadas em conflito, exclui a reciclagem e divide arquivos grandes em volumes importáveis — 2026-11-23
- Só maiúsculas em Ler, Apresentar, Diapositivos, impressão e faixa da mesa → texto e autoria mantêm a grafia. Miniatura, PNG, GIF e `.garatuja` têm o mesmo conteúdo com a opção ligada ou desligada — 2026-11-23
- Capa e texto em PDF A4 → o PDF conserva «A Lia chegou ao Funchal.» e usa 36 pt no título, 20 pt no autor e 18 pt no corpo do exemplo — 2026-11-23
- Texto junto ao lado direito e balão de fala → os blocos acomodam a palavra mais comprida e deslocam-se para dentro da folha. Ctrl+Z mantém a edição e desfaz a escrita nativa. Desfazer na mesa cancela a edição — 2026-11-23

- Confirmação de eliminação na área do professor → aceita espaços antes e depois de APAGAR na confirmação final — 2026-11-23

### Controlos e layout

- Matriz de oito formatos e três modos → verifica alvos de 48 px, quebras entre palavras e rótulos dentro dos botões com legenda selecionada, recorte ativo, forma por rodar, texto em edição e diálogos abertos — 2026-11-23
- Teclado nos oito formatos, com Só maiúsculas ligado e desligado → teclas de comando cabem e os sinais do discurso direto são introduzidos no campo — 2026-11-23
- Tinta branca, amarela e limão → pincéis, linhas, formas, letras e carimbos tingíveis ganham um fundo escuro abaixo de 1,6:1 de contraste — 2026-11-23
- Ouvir sem vozes e comentário incompleto → o aviso aparece junto de Ouvir. Os dois campos de comentário apresentam a validação da app em português e inglês — 2026-11-23
- Fazer carimbo, Encher e espaçamento → o carimbo novo fica selecionado em Os meus carimbos. Encher tem dicas por modo e cinco tamanhos no Pincel. Junto, Normal e Afastado mudam a distância entre marcas em Pintar e Linhas na interface completa — 2026-11-23

### Execuções

- `npm run check` → tipos, lint, 274 testes unitários em 17 ficheiros e build passaram — 2026-11-23
- Três execuções consecutivas de `npm run e2e` → 400 testes passaram e 9 ficaram fora da execução normal em cada uma. As três execuções duraram 4,4 min, 4,6 min e 4,6 min — 2026-11-23
- Regeneração das capturas → 163 testes passaram em 2,3 min. Foram revistas as 25 imagens alteradas ou novas, incluindo a [legenda selecionada](screens/final-legenda-selecionada-1024x768.png), o [teclado no telemóvel](screens/final-teclado-em-baixo-390x844.png) e a [pré-visualização de impressão](screens/final-impressao-1366x768.png) — 2026-11-23

## Limitações observadas

- Usei Chromium automatizado com ratos, teclados, toque e caneta simulados. A prova de autonomia de crianças, o toque num dispositivo físico e o tempo num Chromebook real continuam por verificar.
- Os testes simulam uma quota esgotada na publicação com espaço no armazenamento de rascunhos. O esgotamento simultâneo dos dois armazenamentos continua por verificar.
- A impressão foi verificada em PDF A4, incluindo a orientação dos dois formatos. A saída numa impressora física depende do dispositivo.
- Os títulos longos podem aparecer abreviados no cartão. O diálogo e o nome acessível mostram o título integral. As faixas de retrato deslocam-se na horizontal e os telemóveis mais baixos podem exigir deslocamento vertical.
- Os modelos antigos guardam o papel e as guias como imagens. As linhas novas dos modelos aplicam-se às páginas criadas com esses modelos.
- O limite de cada ficheiro `.garatuja` é 160 MiB. A exportação do professor fornece vários ficheiros acima desse valor. A galeria aceita a versão atual e trabalhos individuais v1. O formato JSON antigo da exportação do professor não é importável.
