# QA da integração

## Percursos

- Interface simples → folha branca com Pintar selecionado. O traço a vermelho, o carimbo, o enchimento e Desfazer deixaram os píxeis esperados. Fechei o separador e recuperei o desenho pela galeria — 2026-11-23
- Texto narrativo → livro de quatro páginas com cenário, personagens, balões e O meu texto em cada página. Percorri o livro e a apresentação, guardei um comentário Gostei… e confirmei um PDF A4 de cinco folhas, incluindo a capa — 2026-11-23
- Texto informativo → modelo Esquema com legendas, quatro legendas numeradas com setas e um título pintado com Texto. O PNG exportado tem 1600 × 1200 px — 2026-11-23
- Animação → dupliquei até ter oito páginas e desloquei a bola com Mover e Papel vegetal. Reproduzi até ao fim a 3, 6 e 12 quadros por segundo. Verifiquei o GIF e o WebM, incluindo a presença da legenda no GIF — 2026-11-23
- Professor → a porta rejeitou uma resposta errada. Mudei o nome da turma e as permissões de impressão e importação. Exportei dois trabalhos num `.garatuja` e importei ambos na galeria de uma sessão limpa — 2026-11-23
- Offline → depois de o service worker assumir o controlo, recarreguei sem rede e repeti desenho, mudança de cor, carimbo, enchimento, Desfazer e recuperação pela galeria — 2026-11-23
- Legendas → confirmei o renderizador nas miniaturas, no livro, na apresentação, na impressão, no leitor de animação e no GIF. Em retrato, medi a barra de ações de um balão e confirmei que deixava livres a legenda e a pega. Em Só maiúsculas, Texto, Legenda e O meu texto guardaram acentos e cedilha em maiúsculas — 2026-11-23

## Layout

| Janela CSS | Folha CSS medida |
| --- | ---: |
| 1024 × 768 | 622 × 466,5 px |
| 1366 × 768 | 753,1 × 564,8 px |
| 1920 × 1080 | 1142,4 × 856,8 px |
| 768 × 1024 | 752 × 564 px |

O teste verifica a proporção da folha, o espaço entre os painéis e a ausência de deslocamento da página nas quatro resoluções. Mede os botões visíveis no ecrã principal, nas duas interfaces, nas opções de carimbo, nas definições e na galeria. O mínimo é 48 × 48 px. Também verifiquei um telemóvel emulado a 390 × 844, com a folha de 374 × 281 px, sem excesso de largura e com Desfazer e Refazer fixos.

Inspecionei as capturas da [mesa a 1024](screens/final-1024x768.png), [mesa a 1366](screens/final-1366x768.png), [mesa a 1920](screens/final-1920x1080.png) e [mesa em retrato](screens/final-768x1024.png), além da [interface simples](screens/final-simples-1024x768.png), [leitura](screens/final-leitura-1366x768.png), [apresentação](screens/final-apresentacao-1366x768.png), [comentários](screens/final-comentarios-1366x768.png), [impressão](screens/final-impressao-1366x768.png), [esquema](screens/final-esquema-1920x1080.png), [papel vegetal](screens/final-papel-vegetal-1366x768.png), [animação](screens/final-animacao-1366x768.png) e [área do professor](screens/final-professor-1366x768.png).

## Desempenho

Chromium com redução de CPU de 4× por CDP, janela de 1366 × 768, build de teste servido localmente. A latência mede o tempo entre o evento e o primeiro `requestAnimationFrame` depois do processamento na folha de 1600 × 1200. A troca inclui a leitura, a composição e a transição de estado. O arranque a frio mede uma sessão limpa até a folha aceitar ações. A tabela apresenta cinco amostras por operação, quatro recarregamentos e um arranque a frio.

| Medição | Mediana | Intervalo observado |
| --- | ---: | ---: |
| Segmento de um traço com Redondo | 89 ms | 1–99 ms |
| Enchimento sólido de folha uniforme | 76 ms | 71–77 ms |
| Negativo na página inteira | 153 ms | 19–253 ms |
| Troca de página | 161 ms | 98–208 ms |
| Arranque a frio | 1036 ms | Uma amostra |
| Recarregamento | 472 ms | 410–474 ms |

```sh
GARATUJA_BENCHMARK=1 npm run e2e -- performance.spec.ts --workers=1
```

O JavaScript inicial do build de produção tem **112,44 kB gzip**, segundo o Vite. O codificador GIF fica num worker separado. As licenças carregam ao abrir Créditos. Os ficheiros dos carimbos e as fontes do editor são locais e estão no pré-cache.

## Execuções finais

`npm run check` → 269 testes unitários passaram, com verificação de tipos, lint e build, nas duas execuções — 2026-11-23

`npm run e2e` → 83 passaram e 9 ficaram fora da execução normal, sem falhas, nas duas execuções consecutivas. Os testes de capturas opcionais e o benchmark correram à parte — 2026-11-23

## Limitações observadas

- Usei Chromium automatizado com ratos, teclados, toque e caneta simulados. A prova de autonomia de crianças, o toque num dispositivo físico e o tempo num Chromebook real continuam por verificar.
- A impressão foi verificada em PDF A4, incluindo a orientação dos dois formatos. A saída numa impressora física depende do dispositivo.
- Os títulos longos podem aparecer abreviados no cartão. O diálogo e o nome acessível mostram o título integral. As faixas de retrato deslocam-se na horizontal e os telemóveis mais baixos podem exigir deslocamento vertical.
- O limite de cada ficheiro `.garatuja` é 160 MiB. A galeria aceita a versão atual e trabalhos individuais v1. O formato JSON antigo da exportação do professor não é importável.
