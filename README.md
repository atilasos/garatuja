# Garatuja

Ateliê de desenho para crianças dos 4 aos 11 anos. Ilustra textos, faz livros, apresenta trabalhos à turma e anima desenhos. O trabalho fica no dispositivo. A aplicação abre com uma folha em branco, Pintar selecionado e som desligado.

A criança é autora do desenho e do texto. Pode desfazer, retomar o trabalho e partilhá-lo como livro, apresentação ou ficheiro. A Garatuja dispensa contas, telemetria e recompensas.

- A faixa **O meu texto** mantém o texto da página à vista enquanto se desenha. **Ler** e **Imprimir** juntam cada ilustração ao texto. Desfazer recupera o texto de uma sessão de edição.
- Em **Abrir → Diapositivos**, a turma escolhe a ordem dos trabalhos e apresenta todas as páginas em ecrã inteiro. As setas e o avanço automático percorrem o texto antes de mudar de página. Em **Abrir**, usa **Usar como modelo** para desenhar por cima da primeira ilustração de outro trabalho. A borracha repõe essa ilustração.
- A gravação é automática. Se dois separadores alterarem o mesmo trabalho, a Garatuja preserva uma cópia. A exportação do professor inclui as duas versões quando ainda há um conflito por gravar. Se faltar espaço, podes mudar de página ou começar outro desenho. Usa **Guardar num ficheiro** para levar os trabalhos que ainda estão em memória.
- Em **Definições → Adulto**, mantém premido para entrar na área do professor. Podes definir ou remover o PIN, escolher as ferramentas disponíveis e exportar os trabalhos em volumes.
- Ativa **Teclado no ecrã** nas definições para escrever com rato ou toque. Podes escolher a disposição alfabética ou QWERTY. O teclado afasta-se do campo que estás a editar na folha e inclui números e sinais. Num ecrã estreito, toca em **á ç 123** para os veres e escreveres letras acentuadas. O teclado físico continua disponível.
- **Misturar cor** combina gotas de tinta e guarda as seis últimas cores escolhidas. **Encher** também permite pintar dentro de um contorno ou voltar a ver o papel de uma zona.
- A ferramenta **Texto** avisa durante a escrita se o texto exceder a folha. Se saíres da edição, o texto fica em rascunho. Ao voltar à página, podes escolher um tamanho de letra mais pequeno e pousá-lo.

## Correr

Usa Node.js 24.

```sh
npm ci
npm run dev
```

Para experimentar o funcionamento sem rede, corre `npm run build` e `npm run preview`. Abre a aplicação uma vez e deixa o service worker concluir a instalação.

## Testar

```sh
npx playwright install chromium
npm run check
npm run e2e
```

A matriz de layout cobre oito formatos e seis modos com cada ferramenta disponível. Verifica também Texto e Legenda com o teclado no ecrã na metade inferior da folha. A matriz de edições pendentes cobre a troca de ferramenta ou página, a duplicação, a gravação, a impressão, a leitura, a apresentação, a animação, a exportação e o recarregamento. Os testes de armazenamento abrem dois separadores na mesma origem e repetem a saída após o primeiro traço aos 0, 50, 100, 250, 350 e 500 ms.

A [especificação](docs/SPEC.md) descreve os princípios de autoria, privacidade e inclusão. O [guia de plug-ins](docs/PLUGINS.md) explica como acrescentar ferramentas e recursos. O [relatório de QA](docs/QA.md) regista os fluxos, as capturas e as medições.

## Licenças

O código da Garatuja usa a licença MIT (ver `LICENSE`).


Andika, Playwrite PT, Fredoka e Courier Prime usam a SIL Open Font License 1.1. As ilustrações Noto Emoji incluídas na biblioteca de carimbos usam Apache License 2.0. O codificador gifenc usa MIT. Os textos integrais estão em **Definições → Créditos**.
