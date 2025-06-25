# Exemplos de Autocomplete com Filtros

## Exemplo 1: Comando de Banimento Inteligente

### Configuração do Comando
```json
{
  "name": "ban",
  "type": "slash",
  "options": [
    {
      "name": "user",
      "type": "USER",
      "description": "Usuário para banir",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "users"
      }
    },
    {
      "name": "reason",
      "type": "STRING",
      "description": "Razão do banimento",
      "required": false,
      "autocomplete": {
        "enabled": true,
        "service": "external",
        "apiUrl": "https://sua-api.com/ban-reasons",
        "apiMethod": "POST",
        "usePreviousParameters": true,
        "filterByParameters": ["user"]
      }
    }
  ]
}
```

### API Externa para Razões de Banimento
```javascript
// POST https://sua-api.com/ban-reasons
app.post('/ban-reasons', (req, res) => {
  const { input, previousParameters, currentParameter } = req.body;
  
  // previousParameters.user contém o usuário selecionado
  const userId = previousParameters.user?.id;
  const username = previousParameters.user?.username;
  
  // Lógica para gerar razões baseadas no usuário
  let reasons = [];
  
  if (userId) {
    // Buscar histórico do usuário
    const userHistory = getUserHistory(userId);
    
    if (userHistory.spamCount > 0) {
      reasons.push({ name: "Spam repetido", value: "spam" });
    }
    
    if (userHistory.warningCount > 2) {
      reasons.push({ name: "Múltiplos avisos", value: "warnings" });
    }
    
    if (userHistory.inappropriateMessages > 0) {
      reasons.push({ name: "Conteúdo inadequado", value: "inappropriate" });
    }
  }
  
  // Razões padrão
  reasons = reasons.concat([
    { name: "Violação das regras", value: "rules_violation" },
    { name: "Comportamento tóxico", value: "toxic_behavior" },
    { name: "Spam", value: "spam" },
    { name: "Outro", value: "other" }
  ]);
  
  // Filtrar por input
  const filteredReasons = reasons.filter(reason => 
    reason.name.toLowerCase().includes(input.toLowerCase())
  );
  
  res.json(filteredReasons.slice(0, 25));
});
```

## Exemplo 2: Comando de Configuração de Canais

### Configuração do Comando
```json
{
  "name": "config-channel",
  "type": "slash",
  "options": [
    {
      "name": "server",
      "type": "STRING",
      "description": "Servidor para configurar",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "servers"
      }
    },
    {
      "name": "channel",
      "type": "CHANNEL",
      "description": "Canal para configurar",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "channels",
        "usePreviousParameters": true,
        "filterByParameters": ["server"]
      }
    },
    {
      "name": "setting",
      "type": "STRING",
      "description": "Configuração para aplicar",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "external",
        "apiUrl": "https://sua-api.com/channel-settings",
        "apiMethod": "POST",
        "usePreviousParameters": true,
        "filterByParameters": ["server", "channel"]
      }
    }
  ]
}
```

### API Externa para Configurações de Canal
```javascript
// POST https://sua-api.com/channel-settings
app.post('/channel-settings', (req, res) => {
  const { input, previousParameters } = req.body;
  
  const serverId = previousParameters.server;
  const channelId = previousParameters.channel?.id;
  const channelName = previousParameters.channel?.name;
  
  let settings = [];
  
  // Configurações baseadas no tipo de canal
  if (channelName?.includes('anúncios')) {
    settings = [
      { name: "Permitir apenas admins", value: "admin_only" },
      { name: "Webhook de anúncios", value: "announcement_webhook" },
      { name: "Auto-moderar links", value: "auto_mod_links" }
    ];
  } else if (channelName?.includes('geral')) {
    settings = [
      { name: "Slow mode", value: "slow_mode" },
      { name: "Filtro de palavras", value: "word_filter" },
      { name: "Permitir imagens", value: "allow_images" }
    ];
  } else {
    settings = [
      { name: "Permissões personalizadas", value: "custom_permissions" },
      { name: "Integração com bot", value: "bot_integration" },
      { name: "Logs de atividade", value: "activity_logs" }
    ];
  }
  
  // Filtrar por input
  const filteredSettings = settings.filter(setting => 
    setting.name.toLowerCase().includes(input.toLowerCase())
  );
  
  res.json(filteredSettings.slice(0, 25));
});
```

## Exemplo 3: Comando de Gerenciamento de Cargos

### Configuração do Comando
```json
{
  "name": "manage-role",
  "type": "slash",
  "options": [
    {
      "name": "user",
      "type": "USER",
      "description": "Usuário para gerenciar",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "users"
      }
    },
    {
      "name": "action",
      "type": "STRING",
      "description": "Ação a realizar",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "external",
        "apiUrl": "https://sua-api.com/role-actions",
        "apiMethod": "POST",
        "usePreviousParameters": true,
        "filterByParameters": ["user"]
      }
    },
    {
      "name": "role",
      "type": "ROLE",
      "description": "Cargo para aplicar",
      "required": true,
      "autocomplete": {
        "enabled": true,
        "service": "roles",
        "usePreviousParameters": true,
        "filterByParameters": ["user", "action"]
      }
    }
  ]
}
```

## Benefícios da Implementação

1. **Experiência do Usuário**: Sugestões mais relevantes e contextuais
2. **Redução de Erros**: Menos opções inválidas são mostradas
3. **Performance**: Menos dados para processar e exibir
4. **Flexibilidade**: Funciona tanto com APIs externas quanto serviços internos
5. **Configurabilidade**: Controle total sobre quais parâmetros usar como filtros

## Considerações de Cache

O sistema usa cache inteligente que:
- Cacheia sugestões por comando + parâmetro + input
- **NÃO** cacheia por parâmetros anteriores para permitir filtros dinâmicos
- TTL de 30 segundos para balancear performance e atualidade 

# Using Webhook Follow-Up URLs

When a command with a webhook URL is executed, the webhook payload includes a special URL that can be used to send follow-up messages to the interaction after the initial response. This is useful for sending additional information or updates to the user without requiring them to run another command.

## Follow-Up Webhook URL Format

The follow-up webhook URL is included in the webhook payload as:

```json
{
  "interaction": {
    "id": "interaction_id",
    "token": "interaction_token",
    "followUpWebhookUrl": "https://discord.com/api/webhooks/{application_id}/{interaction_token}"
  }
}
```

## How to Use the Follow-Up Webhook URL

You can use this URL to send follow-up messages to the interaction by making a POST request to the URL with the following format:

```javascript
// Example using axios
const axios = require('axios');

// The followUpWebhookUrl from the webhook payload
const followUpWebhookUrl = payload.interaction.followUpWebhookUrl;

// Send a follow-up message
await axios.post(followUpWebhookUrl, {
  content: "This is a follow-up message!",
  flags: 64  // 64 is the flag for ephemeral messages (only visible to the command user)
});

// Send a follow-up message with an embed
await axios.post(followUpWebhookUrl, {
  embeds: [{
    title: "Follow-up Embed",
    description: "This is a follow-up embed message",
    color: 0x7289DA
  }],
  flags: 64  // Optional: Make the message ephemeral
});
```

## Important Notes

1. The interaction token is valid for up to 15 minutes after the initial interaction.
2. After 15 minutes, the token expires and you can no longer send follow-up messages.
3. Use ephemeral messages (flags: 64) for sensitive information that should only be visible to the command user.
4. You can send multiple follow-up messages to the same interaction.

## Example Implementation

Here's a complete example of how to handle a webhook and send a follow-up message:

```javascript
// Your webhook handler
app.post('/webhook', async (req, res) => {
  const payload = req.body;
  
  // Process the command
  // ...
  
  // Send a success response to the webhook
  res.status(200).send({ success: true });
  
  // Later, send a follow-up message with the result
  try {
    const result = await processCommand(payload.parameters);
    
    await axios.post(payload.interaction.followUpWebhookUrl, {
      content: `Command processing completed! Result: ${result}`,
      flags: 64  // Make it ephemeral
    });
  } catch (error) {
    // Send an error message as a follow-up
    await axios.post(payload.interaction.followUpWebhookUrl, {
      content: `Error processing command: ${error.message}`,
      flags: 64  // Make it ephemeral
    });
  }
});
```

This approach allows you to acknowledge the webhook immediately and then send follow-up messages as your processing completes, providing a better user experience. 