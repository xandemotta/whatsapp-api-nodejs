program WhatsAppWebhookServer;

{$APPTYPE CONSOLE}

uses
  System.SysUtils,
  IdHTTPServer,
  IdCustomHTTPServer,
  IdContext,
  System.JSON,
  System.Classes;

var
  HTTPServer: TIdHTTPServer;

procedure ShowNotification(const ATitle, AMessage: string);
begin
  // Exemplo simples: apenas escreve no console.
  // Na sua aplicação real, você pode trocar por um Form, Dialog, etc.
  Writeln('[' + ATitle + '] ' + AMessage);
end;

procedure OnCommandGet(AContext: TIdContext; ARequestInfo: TIdHTTPRequestInfo;
  AResponseInfo: TIdHTTPResponseInfo);
var
  BodyStream: TStringStream;
  JSON: TJSONObject;
  BodyObj: TJSONObject;
  EventType: string;
  QR: string;
  Retry: Integer;
begin
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
            QR := BodyObj.GetValue<string>('qr');
            Retry := BodyObj.GetValue<Integer>('retry');

            // Aqui você pode converter o QR (dataURL) em imagem e mostrar num Form
            ShowNotification('WhatsApp - QR Code',
              Format('Novo QR gerado (tentativa %d).', [Retry]));
          end;
        end
        else if SameText(EventType, 'session_expired') then
        begin
          BodyObj := JSON.GetValue<TJSONObject>('body');
          if Assigned(BodyObj) then
          begin
            ShowNotification('WhatsApp - Sessão expirada',
              'Sessão expirada, gerar novo QR.');
          end;
        end;

        AResponseInfo.ResponseNo := 200;
        AResponseInfo.ContentText := '{"status":"ok"}';
        AResponseInfo.ContentType := 'application/json; charset=utf-8';
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

begin
  try
    HTTPServer := TIdHTTPServer.Create(nil);
    try
      HTTPServer.DefaultPort := 3333;
      HTTPServer.OnCommandGet := OnCommandGet;
      HTTPServer.Active := True;
      Writeln('WhatsApp Webhook Server Delphi rodando em http://localhost:3333/webhook');
      Writeln('Pressione ENTER para sair...');
      Readln;
      HTTPServer.Active := False;
    finally
      HTTPServer.Free;
    end;
  except
    on E: Exception do
      Writeln(E.ClassName, ': ', E.Message);
  end;
end.

