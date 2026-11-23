# Garatuja

Ateliê de desenho para crianças dos 4 aos 11 anos. Ilustra textos, faz livros, apresenta trabalhos à turma e anima desenhos. O trabalho fica no dispositivo. A aplicação abre com uma folha em branco, Pintar selecionado e som desligado.

A criança é autora do desenho e do texto. Pode desfazer, retomar o trabalho e partilhá-lo como livro, apresentação ou ficheiro. A Garatuja dispensa contas, telemetria e recompensas.

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

A [especificação](docs/SPEC.md) descreve os princípios de autoria, privacidade e inclusão. O [guia de plug-ins](docs/PLUGINS.md) explica como acrescentar ferramentas e recursos. O [relatório de QA](docs/QA.md) regista os fluxos, as capturas e as medições.

## Licenças dos recursos

Andika, Playwrite PT, Fredoka e Courier Prime usam a SIL Open Font License 1.1. As ilustrações Noto Emoji incluídas na biblioteca de carimbos usam Apache License 2.0. O codificador gifenc usa MIT. Os textos integrais estão em **Definições → Créditos**.
