# Integração Desktop Delphi com Webhook de QR Code (WhatsApp API)

Este documento explica, passo a passo, como fazer a aplicação **desktop Delphi** receber avisos da API WhatsApp e exibir mensagens do tipo **“Leia o QR novamente!”** quando for necessário o usuário escanear um novo QR Code.

O cenário é:

- A API WhatsApp (Node.js) já está rodando em `http://mmsistemas.ddns.net:3333`.
- Quando o WhatsApp precisa de um novo QR ou quando a sessão expira, a API envia um **webhook HTTP POST** para um endpoint.
- A sua aplicação Delphi desktop sobe um pequeno servidor HTTP interno e recebe esse POST, decidindo quando exibir mensagens na tela.

---

## 1. Fluxo Geral

1. **API WhatsApp Node** detecta que precisa de QR (ou que a sessão foi encerrada).
2. Ela gera um QR e monta um JSON com as informações do evento (`type`, `body`, `instanceKey`).
3. Ela faz um `POST` para a URL configurada em `WEBHOOK_URL` (no `.env`):
   - Ex.: `WEBHOOK_URL=http://mmsistemas.ddns.net:3333/webhook`
4. **Aplicação Delphi**, que tem um `TIdHTTPServer` rodando nessa porta, recebe o JSON:
   - Se `type = "qr_code"` → exibir QR (ou pelo menos uma mensagem: **“Leia o QR novamente!”**).
   - Se `type = "session_expired"` → exibir algo como **“Sessão expirada, gere um novo QR.”**.

---

## 2. Configuração da API WhatsApp (Node.js)

No arquivo `.env` da API já estão definidos:

```env
WEBHOOK_ENABLED=true
WEBHOOK_URL=http://mmsistemas.ddns.net:3333/webhook
WEBHOOK_BASE64=false
WEBHOOK_ALLOWED_EVENTS=qr,connection
```

Pontos importantes:

- **`WEBHOOK_URL`**: é o endereço HTTP para ONDE a API Node vai mandar os eventos.  
  - Ele *não* é o endereço de acesso do usuário; é o endereço que o **servidor interno** do Delphi precisa “escutar”.
  - Neste cenário, a aplicação Delphi precisa estar acessível em `http://mmsistemas.ddns.net:3333/webhook`.
- **`WEBHOOK_ALLOWED_EVENTS=qr,connection`** garante que os eventos relacionados a QR serão enviados.

Você não precisa alterar o código Node além do que já está feito; a responsabilidade agora é do Delphi receber e processar o POST.

---

## 3. Contrato do Webhook (JSON recebido pelo Delphi)

Quando a API precisa de um novo QR ou quando a sessão é finalizada por exceder o limite de tentativas de leitura, ela faz um `POST` com um JSON neste formato:

### 3.1. Evento de novo QR (`type = "qr_code"`)

```json
{
  "type": "qr_code",
  "body": {
    "qr": "data:image/png;base64,AAAA...",
    "retry": 1
  },
  "instanceKey": "alguma-instancia"
}
```

- `type`: `"qr_code"` – indica que um **novo QR** foi gerado.
- `body.qr`: string em formato **DataURL** (`data:image/png;base64,...`) contendo o QR em base64.
- `body.retry`: número da tentativa de geração de QR para essa sessão (`1`, `2`, `3`, ...).
- `instanceKey`: identificador da instância do WhatsApp (caso você tenha várias instâncias).

### 3.2. Evento de sessão expirada (`type = "session_expired"`)

```json
{
  "type": "session_expired",
  "body": {
    "reason": "max_retry_qr",
    "retry": 2
  },
  "instanceKey": "alguma-instancia"
}
```

- `type`: `"session_expired"` – indica que a sessão foi encerrada (por exemplo, estourou o limite de tentativas de QR).
- `body.reason`: motivo textual (`"max_retry_qr"` indica que ultrapassou `INSTANCE_MAX_RETRY_QR`).
- `body.retry`: quantas tentativas foram feitas até encerrar.
- `instanceKey`: identificador da instância do WhatsApp.

---

## 4. Exatamente quando exibir “Leia o QR novamente!”

Na sua aplicação Delphi, a lógica para disparar a mensagem **“Leia o QR novamente!”** pode ser simples e direta:

1. **Sempre que receber um webhook com `type = "qr_code"`**, significa que a API gerou um QR novo e o usuário precisa escanear.
2. A partir dessa informação, você decide o texto:
   - Para qualquer `retry >= 1`: exibir **“Leia o QR novamente!”**.
   - Opcionalmente, você pode usar o valor de `retry` para personalizar:
     - `retry = 1`: “Leia o QR para conectar.”
     - `retry > 1`: “Leia o QR novamente! (Tentativa X)”

Em termos de código, você usará **dois campos** do JSON:

- `type` → se for `"qr_code"`, dispara a ação.
- `body.retry` → apenas para informação adicional (qual tentativa é).

Exemplo de pseudo‑código da lógica Delphi:

```pascal
if SameText(EventType, 'qr_code') then
begin
  // sempre que chegar aqui, peça para o usuário ler o QR
  ShowMessage('Leia o QR novamente!');
end;
```

Você pode também usar `body.qr` para desenhar o QR na tela, se quiser.

---

## 5. Implementando o servidor HTTP na aplicação Delphi Desktop

A ideia é embutir um **`TIdHTTPServer` (Indy)** na sua aplicação desktop (Form), de forma que ela receba os POSTs em `http://mmsistemas.ddns.net:PORTA/webhook`.

### 5.1. Estrutura básica do Form

1. Crie um **novo Form** (por exemplo, `TfrmWebhookServer`).
2. Coloque um componente `TIdHTTPServer` no Form (`IdHTTPServer1`).
3. Configure:
   - `IdHTTPServer1.DefaultPort := 3333;` (ou outra porta).
   - Clique em **Events** e implemente o evento `OnCommandGet`.

### 5.2. Código de exemplo do servidor Delphi

Exemplo simplificado (pode ser adaptado ao seu projeto):

```pascal
uses
  System.SysUtils, System.Classes, System.JSON,
  IdHTTPServer, IdCustomHTTPServer, IdContext;

procedure TfrmWebhookServer.FormCreate(Sender: TObject);
begin
  IdHTTPServer1.DefaultPort := 3333;
  IdHTTPServer1.Active := True;
end;

procedure TfrmWebhookServer.IdHTTPServer1CommandGet(
  AContext: TIdContext;
  ARequestInfo: TIdHTTPRequestInfo;
  AResponseInfo: TIdHTTPResponseInfo);
var
  BodyStream: TStringStream;
  JSON: TJSONObject;
  BodyObj: TJSONObject;
  EventType: string;
  Retry: Integer;
begin
  // Aceita apenas POST /webhook
  if (ARequestInfo.CommandType = hcPOST) and
     SameText(ARequestInfo.Document, '/webhook') then
  begin
    BodyStream := TStringStream.Create('', TEncoding.UTF8);
    try
      BodyStream.CopyFrom(ARequestInfo.PostStream, ARequestInfo.PostStream.Size);
      JSON := TJSONObject(TJSONObject.ParseJSONValue(BodyStream.DataString));
      if Assigned(JSON) then
      try
        EventType := JSON.GetValue<string>('type');

        if SameText(EventType, 'qr_code') then
        begin
          BodyObj := JSON.GetValue<TJSONObject>('body');
          if Assigned(BodyObj) then
          begin
            Retry := BodyObj.GetValue<Integer>('retry');

            // Aqui você dispara a mensagem para o usuário
            // Exemplo simples:
            ShowMessage(Format('Leia o QR novamente! (Tentativa %d)', [Retry]));

            // Opcional: ler BodyObj.GetValue<string>('qr') para exibir o QR em um TImage
          end;
        end
        else if SameText(EventType, 'session_expired') then
        begin
          ShowMessage('Sessão expirada, gere um novo QR.');
        end;

        AResponseInfo.ResponseNo := 200;
        AResponseInfo.ContentType := 'application/json; charset=utf-8';
        AResponseInfo.ContentText := '{"status":"ok"}';
      finally
        JSON.Free;
      end;
    finally
      BodyStream.Free;
    end;
  end
  else
  begin
    AResponseInfo.ResponseNo := 404;
    AResponseInfo.ContentText := 'Not Found';
  end;
end;
```

> Observação: `ShowMessage` é apenas um exemplo. Na sua aplicação real, você provavelmente vai atualizar um `TLabel`, abrir um Form específico, ou mostrar a imagem do QR.

---

## 6. Tornando o Delphi acessível em `http://mmsistemas.ddns.net`

Para que a API Node consiga chegar até o Delphi usando **`http://mmsistemas.ddns.net:3333/webhook`**, o seguinte precisa estar configurado:

- A máquina onde o Delphi está rodando deve estar acessível pelo DNS `mmsistemas.ddns.net` (por exemplo, usando um serviço de DDNS e apontando para o IP dessa máquina).
- A porta configurada no `TIdHTTPServer` (ex.: `3333`) deve estar:
  - Aberta no firewall da máquina.
  - Redirecionada no roteador/modem (port forwarding) para a máquina onde o Delphi está.
- O `WEBHOOK_URL` da API Node deve apontar exatamente para esse endereço/porta:

  ```env
  WEBHOOK_URL=http://mmsistemas.ddns.net:3333/webhook
  ```

Se você rodar tudo na mesma máquina e testar localmente, pode usar `localhost` para desenvolvimento, mas em produção o que vale é o endereço público `mmsistemas.ddns.net`.

---

## 7. Como testar a integração

1. **Teste direto com `curl` para o Delphi**  
   Com o Delphi rodando e o `TIdHTTPServer` ativo na porta 3333, rode:

   ```bash
   curl -X POST "http://mmsistemas.ddns.net:3333/webhook" ^
     -H "Content-Type: application/json" ^
     -d "{\"type\":\"qr_code\",\"body\":{\"qr\":\"data:image/png;base64,AAAA...\",\"retry\":1},\"instanceKey\":\"teste-instancia\"}"
   ```

   - Você deve ver a mensagem “Leia o QR novamente!” na aplicação Delphi.

2. **Teste a partir da própria API Node**  
   - Certifique‑se de que o `.env` está com `WEBHOOK_URL=http://mmsistemas.ddns.net:3333/webhook`.
   - Suba a API Node normalmente.
   - Gere uma nova instância/QR pela API (por exemplo, via rota `/instance`).
   - Quando a API gerar o QR, ela enviará o webhook automaticamente e o Delphi exibirá a mensagem.

---

## 8. Resumo

- A API WhatsApp Node manda POST para `WEBHOOK_URL` sempre que for gerar um QR novo ou quando a sessão expira.
- O JSON enviado contém:
  - `type = "qr_code"` + `body.retry` → **dispara a mensagem “Leia o QR novamente!”**.
  - `type = "session_expired"` → exibe “Sessão expirada, gere um novo QR.”.
- A aplicação Delphi desktop:
  - Sobe um `TIdHTTPServer` expondo `/webhook` na porta escolhida (ex.: 3333).
  - Lê o JSON, verifica `type` e decide o que mostrar para o usuário.
  - Usa `body.retry` apenas como informação extra (qual tentativa de QR).  

Com isso, o frontend Delphi passa a ser avisado automaticamente pela API sempre que o usuário precisar ler o QR novamente.  
*** End Patch***">
