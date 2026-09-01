# SLV Invoice — Emissor de Invoice

App desktop para SLV Cleaning Services emitir invoices em PDF ou Excel,
sem depender da planilha original.

## Rodar em desenvolvimento

```
pip install -r requirements.txt
python run.py
```

## Rodar os testes

```
pip install -r requirements.txt
pytest
```

## Gerar o .exe (Windows, sem precisar instalar Python no PC de destino)

```
pip install -r requirements.txt
python -m PyInstaller --onefile --windowed --name "SLV-Invoice" --add-data "assets;assets" run.py
```

O executável final fica em `dist/SLV-Invoice.exe` — copie esse arquivo
sozinho para o PC da cliente, ela só clica duas vezes.

## Estrutura

- `app/models.py` — dados da invoice (item, total).
- `app/invoice_builder.py` — validação do formulário e montagem dos dados.
- `app/storage.py` — número de invoice, salvo em `%APPDATA%/SLVInvoice/config.json`.
- `app/pdf_generator.py` / `app/excel_generator.py` — geram os arquivos, replicando o layout da aba "Invoice" original.
- `app/ui.py` / `app/main.py` — janela (CustomTkinter).
- `assets/logo.png` — logo da SLV Cleaning Services usada nos exports.

## Nota de compatibilidade

`reportlab` está fixado em `4.0.9` (não a versão mais recente) porque
este ambiente usa Python 3.8, e versões mais novas do reportlab exigem
uma API do `hashlib` que só existe a partir do Python 3.9. Se o PC de
build usar Python 3.9+, pode atualizar a dependência sem problema.
