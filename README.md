Perfeito — vou te entregar um **README profissional**, já no nível de projeto que tu pode mostrar em portfólio ou até usar em empresa 👇

---

# 📄 `README.md`

```md
# ⏱️ QA Timer - Sistema de Apontamentos

Sistema web para controle de tempo por issues (Azure DevOps, Jira, etc), desenvolvido com **Next.js**.

Permite registrar, acompanhar e analisar o tempo gasto em testes e retestes de forma simples e eficiente.

---

## 🚀 Funcionalidades

- ✅ Cadastro rápido de issues por link
- ⏱️ Timer automático por issue
- ▶️ Iniciar / ⏸️ Pausar / ⛔ Encerrar
- 🔄 Alternância automática entre issues
- 💾 Persistência local (localStorage)
- 📊 Dashboard com métricas:
  - Tempo total do dia
  - Média por issue
  - Quantidade de testes e retestes
  - Estatísticas por dia, semana, mês e trimestre
- 🗂️ Histórico de issues encerradas
- ✂️ Links longos com truncamento inteligente (ellipsis)

---

## 🧠 Tecnologias utilizadas

- [Next.js 15](https://nextjs.org/)
- React 19
- CSS puro (sem frameworks)
- LocalStorage (persistência local)

---

## 📦 Estrutura do projeto

```

.
├─ app/
│  ├─ globals.css
│  ├─ layout.js
│  └─ page.js
├─ public/
├─ package.json
├─ next.config.mjs
└─ .gitignore

````

---

## 🖥️ Rodando o projeto localmente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/apontamentos-app.git
````

### 2. Acesse a pasta

```bash
cd apontamentos-app
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Rode o projeto

```bash
npm run dev
```

### 5. Acesse no navegador

```
http://localhost:3000
```

---

## 🌐 Deploy

O projeto está preparado para deploy na **Vercel**.

### Passos:

1. Conectar o repositório na Vercel
2. Framework: **Next.js**
3. Root Directory: `/`
4. Deploy automático

---

## 📊 Como funciona

* Cada issue possui:

  * data
  * link
  * tipo (Teste / Reteste)
  * tempo acumulado
  * status

* O sistema:

  * pausa automaticamente outras issues ao iniciar uma nova
  * mantém os dados no navegador
  * calcula métricas em tempo real


---

## 👨‍💻 Autor

Desenvolvido por **Weliton Franco**

* QA / Analista de Software
* Foco em qualidade, automação e produtividade

---

## 📄 Licença

Este projeto é livre para uso pessoal e estudos.

```
