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
- Carimbos e Mover → uma única zona deslocou a grelha e deu acesso à rotação livre. A coleção vazia mostrou uma instrução adequada à interface simples. Retângulo e Laço mostraram instruções diferentes — 2026-11-23
- Modelos estruturais → o Encher ficou dentro das zonas do esquema, linha do tempo, ciclo, antes/depois, cartaz, página de livro e postal — 2026-11-23
- Estados e acessibilidade → Animar, Desfazer e Refazer explicaram por que estavam indisponíveis. Só maiúsculas chegou aos botões, campos e diálogos. As orientações da impressão e os pares das definições tiveram ícones distintos. Em inglês a ajuda mostrou Space — 2026-11-23

## Layout

| Janela CSS | Mínimo com faixa visível | Mínimo com faixa recolhida |
| --- | ---: | ---: |
| 1024 × 768 | 580 × 435 px | 620 × 465 px |
| 1366 × 768 | 700 × 525 px | 740 × 555 px |
| 1920 × 1080 | 1100 × 825 px | 1100 × 825 px |
| 768 × 1024 | 740 × 555 px | 740 × 555 px |

- Layout em paisagem → a folha cumpriu os mínimos nos dois estados da faixa. Todos os botões visíveis passaram a medição `scrollWidth <= clientWidth` em modo normal, Alto contraste, Só maiúsculas e ambos em conjunto — 2026-11-23
- Layout em retrato a 768 × 1024 e 390 × 844 → Novo, Abrir, Guardar, Desfazer e Refazer estiveram à vista. Mover e Imprimir ficaram acessíveis na faixa com deslocamento horizontal — 2026-11-23
- Capturas `final-*.png` → confirmei visualmente a folha e a faixa, os números da seleção na galeria, o leitor em ecrã inteiro, a capa sem ilustração, o interruptor de Magia e a rotação livre dos carimbos — 2026-11-23

Capturas da [mesa a 1024](screens/final-1024x768.png), [mesa a 1366](screens/final-1366x768.png), [mesa a 1920](screens/final-1920x1080.png), [mesa em retrato](screens/final-768x1024.png), [interface simples](screens/final-simples-1024x768.png), [faixa de texto](screens/final-faixa-texto-1366x768.png), [capa](screens/final-capa-1366x768.png), [leitura](screens/final-leitura-1366x768.png), [galeria em modo Diapositivos](screens/final-diapositivos-1366x768.png), [leitor de diapositivos](screens/final-diapositivos-leitor-1366x768.png), [apresentação](screens/final-apresentacao-1366x768.png), [comentários](screens/final-comentarios-1366x768.png), [impressão](screens/final-impressao-1366x768.png), [esquema](screens/final-esquema-1920x1080.png), [papel vegetal](screens/final-papel-vegetal-1366x768.png), [animação](screens/final-animacao-1366x768.png), [Magia](screens/final-magia-1366x768.png), [carimbos](screens/final-carimbos-1366x768.png) e [área do professor](screens/final-professor-1366x768.png).

```sh
GARATUJA_CAPTURE_SCREENS=1 npm run e2e -- integration.spec.ts layout.spec.ts council-workflows.spec.ts batch-g.spec.ts
```

## Desempenho

Chromium com redução de CPU de 4× por CDP, janela de 1366 × 768, build de teste servido localmente. A latência mede o tempo entre o evento e o primeiro `requestAnimationFrame` depois do processamento na folha de 1600 × 1200. A troca inclui a leitura, a composição e a transição de estado. O arranque a frio mede uma sessão limpa até a folha aceitar ações. A tabela apresenta cinco amostras por operação, quatro recarregamentos e um arranque a frio.

| Medição | Mediana | Intervalo observado |
| --- | ---: | ---: |
| Segmento de um traço com Redondo | 88 ms | 2–141 ms |
| Enchimento sólido de folha uniforme | 131 ms | 127–159 ms |
| Negativo na página inteira | 204 ms | 46–216 ms |
| Troca de página | 145 ms | 125–148 ms |
| Arranque a frio | 1168 ms | Uma amostra |
| Recarregamento | 505 ms | 425–673 ms |

```sh
GARATUJA_BENCHMARK=1 npm run e2e -- performance.spec.ts --workers=1
```

O codificador GIF fica num worker separado. As licenças carregam ao abrir Créditos. Os ficheiros dos carimbos e as fontes do editor são locais e estão no pré-cache.

## Execuções finais

- `npm run check` → 17 ficheiros e 271 testes unitários passaram em cada execução. Tipos, lint e build também passaram. O JavaScript inicial tem 119,23 kB gzip — 2026-11-23
- `npm run e2e` → 106 passaram e 9 ficaram fora da execução normal em cada uma das duas execuções consecutivas. As capturas finais foram corridas à parte — 2026-11-23
- Benchmark Chromium 4× → passou numa execução isolada. O enchimento teve mediana de 131 ms e atingiu 159 ms, acima da meta de 150 ms numa amostra — 2026-11-23

## Limitações observadas

- Usei Chromium automatizado com ratos, teclados, toque e caneta simulados. A prova de autonomia de crianças, o toque num dispositivo físico e o tempo num Chromebook real continuam por verificar.
- A impressão foi verificada em PDF A4, incluindo a orientação dos dois formatos. A saída numa impressora física depende do dispositivo.
- Os títulos longos podem aparecer abreviados no cartão. O diálogo e o nome acessível mostram o título integral. As faixas de retrato deslocam-se na horizontal e os telemóveis mais baixos podem exigir deslocamento vertical.
- Os modelos antigos guardam o papel e as guias como imagens. As linhas novas dos modelos aplicam-se às páginas criadas com esses modelos.
- O limite de cada ficheiro `.garatuja` é 160 MiB. A galeria aceita a versão atual e trabalhos individuais v1. O formato JSON antigo da exportação do professor não é importável.
