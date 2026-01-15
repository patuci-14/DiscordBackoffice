import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { importCommands, SlashCommandImport, ImportCommandsResponse } from '@/lib/discord-api';
import ToggleSwitch from '@/components/ui/toggle-switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CommandImportProps {
  onClose: () => void;
}

interface ParsedCommand extends SlashCommandImport {
  _valid: boolean;
  _error?: string;
}

const CommandImport: React.FC<CommandImportProps> = ({ onClose }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [jsonInput, setJsonInput] = useState('');
  const [parsedCommands, setParsedCommands] = useState<ParsedCommand[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importResult, setImportResult] = useState<ImportCommandsResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const validCommands = parsedCommands.filter(cmd => cmd._valid);
      return importCommands(validCommands, { skipDuplicates, updateExisting });
    },
    onSuccess: (result) => {
      setImportResult(result);
      
      if (result.success) {
        toast({
          title: 'Importação Concluída',
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      } else {
        toast({
          variant: 'destructive',
          title: 'Importação com Erros',
          description: result.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: error.message || 'Falha ao importar comandos',
      });
    }
  });

  // Parse JSON and validate commands
  const parseJson = (json: string) => {
    setParseError(null);
    setParsedCommands([]);
    setImportResult(null);
    setShowPreview(false);

    if (!json.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(json);
      
      // Check if it has the commands array
      const commands = parsed.commands || (Array.isArray(parsed) ? parsed : [parsed]);
      
      if (!Array.isArray(commands) || commands.length === 0) {
        setParseError('O JSON deve conter um array de comandos ou um objeto com a propriedade "commands"');
        return;
      }

      // Validate each command
      const validatedCommands: ParsedCommand[] = commands.map((cmd: any, index: number) => {
        const errors: string[] = [];

        // Required fields
        if (!cmd.name || typeof cmd.name !== 'string') {
          errors.push('nome é obrigatório');
        } else if (cmd.name.length > 32) {
          errors.push('nome deve ter no máximo 32 caracteres');
        } else if (!/^[\w-]+$/.test(cmd.name)) {
          errors.push('nome deve conter apenas letras, números, - e _');
        }

        if (!cmd.description || typeof cmd.description !== 'string') {
          errors.push('descrição é obrigatória');
        } else if (cmd.description.length > 100) {
          errors.push('descrição deve ter no máximo 100 caracteres');
        }

        if (!cmd.response || typeof cmd.response !== 'string') {
          errors.push('resposta é obrigatória');
        }

        // Optional field validations
        if (cmd.requiredPermission && !['everyone', 'moderator', 'admin', 'server-owner'].includes(cmd.requiredPermission)) {
          errors.push('permissão inválida');
        }

        if (cmd.cooldown !== undefined && (typeof cmd.cooldown !== 'number' || cmd.cooldown < 0)) {
          errors.push('cooldown deve ser um número >= 0');
        }

        // Validate options if present
        if (cmd.options && Array.isArray(cmd.options)) {
          cmd.options.forEach((opt: any, optIndex: number) => {
            if (!opt.name) {
              errors.push(`opção ${optIndex + 1}: nome é obrigatório`);
            }
            if (!opt.description) {
              errors.push(`opção ${optIndex + 1}: descrição é obrigatória`);
            }
            if (!opt.type || !['STRING', 'INTEGER', 'BOOLEAN', 'USER', 'CHANNEL', 'ROLE', 'ATTACHMENT'].includes(opt.type)) {
              errors.push(`opção ${optIndex + 1}: tipo inválido`);
            }
          });
        }

        return {
          ...cmd,
          _valid: errors.length === 0,
          _error: errors.length > 0 ? errors.join('; ') : undefined
        };
      });

      setParsedCommands(validatedCommands);
      setShowPreview(true);

      const validCount = validatedCommands.filter(c => c._valid).length;
      const invalidCount = validatedCommands.filter(c => !c._valid).length;

      if (invalidCount > 0) {
        toast({
          variant: 'default',
          title: 'JSON Parseado',
          description: `${validCount} comando(s) válido(s), ${invalidCount} com erros`,
        });
      }

    } catch (e) {
      setParseError(`Erro ao parsear JSON: ${e instanceof Error ? e.message : 'Formato inválido'}`);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      parseJson(content);
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo selecionado',
      });
    };
    reader.readAsText(file);
  };

  // Handle text change with debounced parse
  const handleJsonChange = (value: string) => {
    setJsonInput(value);
  };

  // Get status badge for import result
  const getStatusBadge = (action?: string, success?: boolean, error?: string) => {
    if (error) {
      return <Badge variant="destructive">Erro</Badge>;
    }
    switch (action) {
      case 'created':
        return <Badge className="bg-green-600">Criado</Badge>;
      case 'updated':
        return <Badge className="bg-blue-600">Atualizado</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Ignorado</Badge>;
      default:
        return success ? <Badge className="bg-green-600">OK</Badge> : <Badge variant="destructive">Erro</Badge>;
    }
  };

  const validCommandsCount = parsedCommands.filter(c => c._valid).length;
  const invalidCommandsCount = parsedCommands.filter(c => !c._valid).length;

  return (
    <div className="space-y-6">
      {/* JSON Input Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-discord-text-secondary">JSON de Comandos</Label>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm"
              iconLeft="fas fa-upload"
            >
              Upload JSON
            </Button>
          </div>
        </div>
        
        <Textarea
          value={jsonInput}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder={`{
  "commands": [
    {
      "name": "exemplo",
      "description": "Um comando de exemplo",
      "response": "Olá, {user}!",
      "options": []
    }
  ]
}`}
          className="w-full min-h-[200px] font-mono text-sm bg-discord-bg-tertiary border border-gray-700 rounded"
          rows={10}
        />

        {parseError && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {parseError}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => parseJson(jsonInput)}
            disabled={!jsonInput.trim()}
            className="bg-discord-blurple hover:bg-opacity-80"
          >
            <i className="fas fa-check mr-2"></i>
            Validar JSON
          </Button>
        </div>
      </div>

      {/* Import Options */}
      {showPreview && (
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <Label className="text-discord-text-secondary">Opções de Importação</Label>
          
          <div className="space-y-3">
            <ToggleSwitch
              checked={skipDuplicates}
              onChange={setSkipDuplicates}
              label="Ignorar comandos duplicados"
            />
            
            <ToggleSwitch
              checked={updateExisting}
              onChange={(checked) => {
                setUpdateExisting(checked);
                if (checked) setSkipDuplicates(false);
              }}
              label="Atualizar comandos existentes (substitui ignorar duplicados)"
            />
          </div>
        </div>
      )}

      {/* Preview Section */}
      {showPreview && parsedCommands.length > 0 && (
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-discord-text-secondary">
              Preview ({validCommandsCount} válido(s), {invalidCommandsCount} com erro(s))
            </Label>
          </div>
          
          <ScrollArea className="h-[200px] border border-gray-700 rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[80px]">Params</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedCommands.map((cmd, index) => (
                  <TableRow key={index} className={!cmd._valid ? 'bg-red-900/10' : ''}>
                    <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{cmd.name || '-'}</TableCell>
                    <TableCell className="text-sm truncate max-w-[200px]">
                      {cmd.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {cmd.options?.length || 0}
                    </TableCell>
                    <TableCell>
                      {cmd._valid ? (
                        <Badge className="bg-green-600">Válido</Badge>
                      ) : (
                        <Badge variant="destructive" title={cmd._error}>
                          Inválido
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {invalidCommandsCount > 0 && (
            <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded text-yellow-300 text-sm">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {invalidCommandsCount} comando(s) com erros serão ignorados na importação.
              <details className="mt-2">
                <summary className="cursor-pointer">Ver detalhes dos erros</summary>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {parsedCommands.filter(c => !c._valid).map((cmd, i) => (
                    <li key={i} className="text-xs">
                      <strong>{cmd.name || `Comando ${i + 1}`}:</strong> {cmd._error}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-discord-text-secondary">Resultado da Importação</Label>
          </div>

          <div className={`p-4 rounded border ${
            importResult.success 
              ? 'bg-green-900/30 border-green-700' 
              : 'bg-yellow-900/30 border-yellow-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <i className={`fas ${importResult.success ? 'fa-check-circle text-green-400' : 'fa-exclamation-circle text-yellow-400'}`}></i>
              <span className="font-medium">{importResult.message}</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-sm mt-3">
              <div className="text-center p-2 bg-discord-bg-tertiary rounded">
                <div className="text-lg font-bold text-green-400">{importResult.summary.created}</div>
                <div className="text-xs text-discord-text-secondary">Criados</div>
              </div>
              <div className="text-center p-2 bg-discord-bg-tertiary rounded">
                <div className="text-lg font-bold text-blue-400">{importResult.summary.updated}</div>
                <div className="text-xs text-discord-text-secondary">Atualizados</div>
              </div>
              <div className="text-center p-2 bg-discord-bg-tertiary rounded">
                <div className="text-lg font-bold text-gray-400">{importResult.summary.skipped}</div>
                <div className="text-xs text-discord-text-secondary">Ignorados</div>
              </div>
              <div className="text-center p-2 bg-discord-bg-tertiary rounded">
                <div className="text-lg font-bold text-red-400">{importResult.summary.errors}</div>
                <div className="text-xs text-discord-text-secondary">Erros</div>
              </div>
            </div>
          </div>

          {importResult.results.length > 0 && (
            <ScrollArea className="h-[150px] border border-gray-700 rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comando</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{result.name}</TableCell>
                      <TableCell>
                        {getStatusBadge(result.action, result.success, result.error)}
                      </TableCell>
                      <TableCell className="text-sm text-discord-text-secondary">
                        {result.error || (result.action === 'skipped' ? 'Comando já existe' : '-')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={importMutation.isPending}
        >
          {importResult ? 'Fechar' : 'Cancelar'}
        </Button>
        
        {!importResult && (
          <Button
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={validCommandsCount === 0 || importMutation.isPending}
            className="bg-discord-blurple hover:bg-opacity-80"
            isLoading={importMutation.isPending}
          >
            <i className="fas fa-file-import mr-2"></i>
            Importar {validCommandsCount} Comando(s)
          </Button>
        )}
      </div>
    </div>
  );
};

export default CommandImport;

