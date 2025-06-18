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