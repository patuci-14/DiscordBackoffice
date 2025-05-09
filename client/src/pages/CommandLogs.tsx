import { useEffect, useState } from 'react';
import { CommandLog } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CommandLogs() {
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CommandLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/command-logs');
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'permission_denied':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatParameters = (parameters: Record<string, any>) => {
    if (!parameters || Object.keys(parameters).length === 0) {
      return 'Nenhum parâmetro';
    }
    return Object.entries(parameters)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Logs de Comandos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Servidor</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Comando</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Parâmetros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{log.serverName}</TableCell>
                  <TableCell>{log.channelName}</TableCell>
                  <TableCell>{log.username}</TableCell>
                  <TableCell>{log.commandName}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(log.status)}>
                      {log.status === 'success' && 'Sucesso'}
                      {log.status === 'failed' && 'Falha'}
                      {log.status === 'permission_denied' && 'Permissão Negada'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => setSelectedLog(log)}
                        >
                          Ver Parâmetros
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Parâmetros do Comando</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
                            {formatParameters(log.parameters)}
                          </pre>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 