# SLV Invoice — versão web (Chromebook)

Mesma ferramenta do app desktop, rodando como página estática dentro do Chrome.
Não precisa de instalação, de internet nem de servidor: é só abrir o
`index.html`. As bibliotecas ficam em `vendor/`, nada vem de CDN.

---

## Parte 1 — Passo a passo para a cliente

Gere o arquivo único e mande **só ele**:

```
cd webapp
npm install
npm run bundle      # gera dist/SLV-Invoice.html (~1,7 MB)
```

`dist/SLV-Invoice.html` carrega CSS, JavaScript, as três bibliotecas e a logo
embutidos. Não depende de nenhum arquivo vizinho, nem de internet. Mande por
e-mail, Drive ou pendrive. Os nomes dos menus abaixo estão como aparecem no
Chrome em inglês.

1. Clique duas vezes em **SLV-Invoice.html**. Ele abre no Chrome.
2. No canto superior direito do Chrome, clique no menu **⋮**.
3. Vá em **More tools** → **Create shortcut…**
   (em versões mais novas do Chrome: **Cast, save and share** → **Install page as app**).
4. Marque a opção **Open as window** e clique em **Create**.
5. O ícone aparece no launcher. Dali em diante é só clicar no ícone.

Usando:

- Preencha **Bill to**, os dados da invoice e os itens.
- **+ Add item** adiciona uma linha; **Remove** tira.
- O total e o total de horas atualizam sozinhos enquanto ela digita.
- **Export PDF** ou **Export Excel** salvam o arquivo na pasta **Downloads**.
- O número da invoice avança sozinho depois de cada exportação.

### Aviso importante sobre o número da invoice

O contador fica guardado no Chrome, amarrado ao **caminho exato do arquivo**.
Ou seja:

- Abrir sempre o **mesmo** `SLV-Invoice.html`, do mesmo lugar → a numeração
  continua de onde parou.
- Mover o arquivo de pasta, ou abrir uma cópia → começa do 1 de novo.
- Limpar os dados de navegação do Chrome ("Cookies and other site data") →
  o contador zera.

Se isso acontecer, é só digitar o número certo no campo **Invoice no.** antes de
exportar: a próxima invoice continua a partir do número digitado.

---

## Parte 2 — Manutenção (para você)

### Rodar os testes

```
cd webapp
npm install
npm test
```

Os testes usam Vitest + jsdom e **não** vão para o Chromebook — só existem aqui.
`tests/page.test.js` carrega o `index.html` de verdade, com os bundles de
`vendor/`, e exporta um PDF e um xlsx reais.

### Gerar uma amostra para conferir o layout

```
npm run sample
```

Escreve `out/sample-invoice.pdf` e `out/sample-invoice.xlsx`.

### Atualizar as bibliotecas

As versões estão travadas no `package.json`. Depois de mudar uma versão:

```
npm install
npm run vendor   # recopia os bundles para vendor/
npm test
```

### Trocar a logo

Substitua `assets/logo.png` e rode:

```
npm run logo     # regera js/logoData.js (a logo embutida em base64)
```

O `js/logoData.js` é gerado — não edite na mão. Ele existe porque uma página
aberta em `file://` não consegue `fetch()` uma imagem local, e um canvas
desenhado a partir de um `<img>` local fica "tainted", então nem o jsPDF nem o
ExcelJS conseguiriam ler os pixels em tempo de execução.

### O que copiar para o Chromebook

Só `dist/SLV-Invoice.html`, gerado por `npm run bundle`. Mais nada.

Se preferir mandar a pasta solta em vez do arquivo único (dá para editar um
`.js` sem reconstruir), o mínimo é `index.html`, `css/`, `js/`, `vendor/` e
`assets/` — os cinco juntos, senão a página não abre.

Depois de mexer em qualquer coisa dentro de `js/`, `css/` ou `assets/`, rode
`npm run bundle` de novo: o `dist/` não se atualiza sozinho.

### Estrutura

- `js/models.js` — porta de `app/models.py`.
- `js/dateInput.js` — porta de `app/date_input.py`.
- `js/invoiceBuilder.js` — porta de `app/invoice_builder.py`.
- `js/storage.js` — porta de `app/storage.py`, usando `localStorage`
  (chave `slv_invoice_next_no`) no lugar de `%APPDATA%`.
- `js/pdfGenerator.js` — porta de `app/pdf_generator.py` (jsPDF + autotable).
- `js/excelGenerator.js` — porta de `app/excel_generator.py` (ExcelJS).
- `js/ui.js` — porta de `app/ui.py`: monta o formulário, linhas dinâmicas,
  total ao vivo, banner de erro.
- `js/app.js` — liga tudo: validar → montar → gerar → baixar → renumerar.

Decisões de arquitetura e diferenças em relação ao desktop estão em
`docs/superpowers/specs/2026-09-12-static-webapp-design.md`.

### Por que os scripts não são ES modules

O Chrome bloqueia `<script type="module">` em `file://` (origem `null`, política
de CORS). Por isso cada arquivo de `js/` é um script comum dentro de um IIFE que
publica o que exporta em `window.SLV`, e a ordem das tags `<script>` no
`index.html` é a ordem de dependência. Não troque para módulos sem passar a
servir a pasta por HTTP.
