## Reset de Sessões do WhatsApp (Signal / Baileys)

Em alguns cenários (por exemplo, erros de criptografia como `bad mac` ou `SessionError: Over 2000 messages into the future!`), pode ser necessário **zerar completamente todas as sessões** armazenadas no MongoDB.

Este projeto usa duas variáveis de ambiente para controlar esse comportamento:

- `RESET_ALL_SESSIONS_ON_START`
- `RESTORE_SESSIONS_ON_START_UP`

---

### 1. Reset completo de todas as sessões

Quando `RESET_ALL_SESSIONS_ON_START=true`, na inicialização da API:

- A aplicação conecta no MongoDB.
- Droppa o banco `whatsapp-api` (onde ficam:
  - as coleções de sessão do Baileys/libsignal;
  - as credenciais de login das instâncias).
- Ou seja, **todas as sessões são apagadas**.
- Em seguida, a API sobe normalmente, porém **sem nenhuma sessão ativa**.

#### Passo a passo para resetar tudo

1. Edite o `.env` e configure:

   ```env
   RESET_ALL_SESSIONS_ON_START=true
   RESTORE_SESSIONS_ON_START_UP=false
   ```

   - `RESET_ALL_SESSIONS_ON_START=true`  
     → apaga todas as sessões do banco `whatsapp-api` na próxima subida.
   - `RESTORE_SESSIONS_ON_START_UP=false`  
     → evita tentar restaurar sessões antigas (que já foram apagadas).

2. Reinicie a API (exemplos):

   ```bash
   pm2 restart api-whatsapp-nova
   ```

3. Verifique os logs de inicialização:

   Você deve ver algo como:

   - `STATE: RESET_ALL_SESSIONS_ON_START=true -> dropping whatsapp-api database`
   - `STATE: whatsapp-api database dropped successfully (all sessions cleared)`

4. Crie novamente as instâncias desejadas:

   - Chame a rota de init:

     ```http
     GET /instance/init?key=SUA_KEY
     ```

   - Escaneie o novo QR Code com o WhatsApp para cada `key`.

---

### 2. Voltando ao modo “normal”

Depois de resetar e recriar as sessões:

1. Edite novamente o `.env`:

   ```env
   RESET_ALL_SESSIONS_ON_START=false
   RESTORE_SESSIONS_ON_START_UP=false  # ou true, se quiser restaurar sessões no boot
   ```

   - Deixe `RESET_ALL_SESSIONS_ON_START=false` para **não apagar mais tudo** em cada restart.
   - Ajuste `RESTORE_SESSIONS_ON_START_UP` conforme o seu fluxo:
     - `false`: você controla tudo via API (`/instance/init`), sem restore automático.
     - `true`: ao iniciar, a API tenta restaurar todas as sessões que estiverem salvas no Mongo.

2. Reinicie a API mais uma vez para aplicar essas mudanças:

   ```bash
   pm2 restart api-whatsapp-nova
   ```

---

### 3. Quando usar esse reset completo

Use o combo:

- `RESET_ALL_SESSIONS_ON_START=true`
- `RESTORE_SESSIONS_ON_START_UP=false`

apenas quando:

- A sessão está quebrada a ponto de não conseguir mais usar o número.
- Você quer garantir que **todas as sessões antigas** serão apagadas e começar do zero.

No dia a dia, mantenha:

- `RESET_ALL_SESSIONS_ON_START=false`
- `RESTORE_SESSIONS_ON_START_UP` de acordo com a sua necessidade (normalmente `false` em produção, para evitar restaurar sessões muito antigas por engano).

