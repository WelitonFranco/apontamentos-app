# ⏱️ QA Timer - Sistema de Apontamentos

Sistema web para controle de tempo por issues (Azure DevOps, Jira etc.), desenvolvido com **Next.js**.

Permite registrar, acompanhar e analisar o tempo gasto em testes e retestes de forma simples e eficiente.

## 🚀 Funcionalidades

- Cadastro rápido de issues por link
- Timer automático por issue
- Iniciar / Pausar / Encerrar
- Alternância automática entre issues
- Persistência local com `localStorage`
- Dashboard com métricas por dia, semana, mês e trimestre
- Histórico de issues encerradas
- Edição manual de tempo (`HH:MM:SS`)

## 🧠 Tecnologias utilizadas

- [Next.js 15](https://nextjs.org/)
- React 19
- CSS puro (sem framework)
- LocalStorage

## 📦 Estrutura do projeto

```text
.
├─ app/
│  ├─ globals.css
│  ├─ layout.js
│  └─ page.js
├─ .gitignore
├─ jsconfig.json
├─ next.config.mjs
├─ package.json
└─ README.md
```

## 🖥️ Rodando o projeto localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Rode o projeto em modo de desenvolvimento:

   ```bash
   npm run dev
   ```

3. Acesse no navegador:

   ```text
   http://localhost:3000
   ```

## 🏗️ Build de produção

```bash
npm run build
npm start
```

## 📊 Como funciona

Cada issue possui:

- data
- link
- tipo (Teste / Reteste)
- tempo acumulado
- status

O sistema:

- pausa automaticamente outras issues ao iniciar uma nova
- mantém os dados no navegador
- calcula métricas em tempo real

## 📄 Licença

Projeto livre para uso pessoal e estudos.
