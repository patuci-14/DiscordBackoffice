import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AppShell from '@/components/layout/app-shell';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ToggleSwitch from '@/components/ui/toggle-switch';
import ServerListItem from '@/components/discord/server-list-item';
import { getBotInfo, updateBotConfig, getServers, updateServer } from '@/lib/discord-api';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { BotConfig, Server } from '@shared/schema';
import { useAuth } from '@/components/auth/auth-provider';

const Config: React.FC = () => {
  const { toast } = useToast();
  const { botInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bot config form state
  const [botName, setBotName] = useState('');
  const [botPrefix, setBotPrefix] = useState('!');
  const [botStatus, setBotStatus] = useState('online');
  const [activityType, setActivityType] = useState('PLAYING');
  const [activity, setActivity] = useState('');
  const [useSlashCommands, setUseSlashCommands] = useState(true);
  const [logCommandUsage, setLogCommandUsage] = useState(true);
  const [respondToMentions, setRespondToMentions] = useState(true);
  const [deleteCommandMessages, setDeleteCommandMessages] = useState(false);
  const [enableWelcomeMessages, setEnableWelcomeMessages] = useState(true);
  const [enableGoodbyeMessages, setEnableGoodbyeMessages] = useState(true);
  const [enableAutoRole, setEnableAutoRole] = useState(false);
  const [enableLogging, setEnableLogging] = useState(true);
  const [enableAntiSpam, setEnableAntiSpam] = useState(true);
  const [enableAutoMod, setEnableAutoMod] = useState(true);
  const [formChanged, setFormChanged] = useState(false);

  // Fetch bot config
  const { data: botInfoData, isLoading: isBotInfoLoading } = useQuery({
    queryKey: ['/api/bot', botInfo?.id],
    queryFn: () => getBotInfo(),
    retry: false,
    enabled: !!botInfo?.id
  });

  // Fetch servers
  const { data: serversData, isLoading: isServersLoading } = useQuery({
    queryKey: ['/api/bot/servers', botInfo?.id],
    queryFn: () => getServers(),
    retry: false,
    enabled: !!botInfo?.id
  });
  
  // Filter servers based on search term
  const filteredServers = serversData?.servers?.filter(server => 
    server.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update bot configuration mutation
  const updateBotConfigMutation = useMutation({
    mutationFn: (configUpdate: Partial<BotConfig>) => updateBotConfig(configUpdate),
    onSuccess: () => {
      toast({
        title: 'Configuration Updated',
        description: 'Bot configuration has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bot'] });
      setFormChanged(false);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update bot configuration.',
      });
    }
  });

  // Update server mutation
  const updateServerMutation = useMutation({
    mutationFn: ({ id, update }: { id: number, update: Partial<Server> }) => updateServer(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/servers'] });
      toast({
        title: 'Server Updated',
        description: 'Server settings have been updated.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update server settings.',
      });
    }
  });

  // Initialize form with bot config data
  useEffect(() => {
    if (botInfoData?.config) {
      const config = botInfoData.config;
      setBotName(config.name || '');
      setBotPrefix(config.prefix || '!');
      setBotStatus(config.status || 'online');
      setActivityType(config.activityType || 'PLAYING');
      setActivity(config.activity || '');
      setUseSlashCommands(config.useSlashCommands === true);
      setLogCommandUsage(config.logCommandUsage === true);
      setRespondToMentions(config.respondToMentions === true);
      setDeleteCommandMessages(config.deleteCommandMessages === true);
      setEnableWelcomeMessages(config.enableWelcomeMessages === true);
      setEnableGoodbyeMessages(config.enableGoodbyeMessages === true);
      setEnableAutoRole(config.enableAutoRole === true);
      setEnableLogging(config.enableLogging === true);
      setEnableAntiSpam(config.enableAntiSpam === true);
      setEnableAutoMod(config.enableAutoMod === true);
      setFormChanged(false);
    }
  }, [botInfoData]);

  // Mark form as changed when any field is updated
  useEffect(() => {
    if (!isBotInfoLoading && botInfoData?.config) {
      const config = botInfoData.config;
      const changed = 
        botName !== (config.name || '') ||
        botPrefix !== (config.prefix || '!') ||
        botStatus !== (config.status || 'online') ||
        activityType !== (config.activityType || 'PLAYING') ||
        activity !== (config.activity || '') ||
        useSlashCommands !== (config.useSlashCommands === true) ||
        logCommandUsage !== (config.logCommandUsage === true) ||
        respondToMentions !== (config.respondToMentions === true) ||
        deleteCommandMessages !== (config.deleteCommandMessages === true) ||
        enableWelcomeMessages !== (config.enableWelcomeMessages === true) ||
        enableGoodbyeMessages !== (config.enableGoodbyeMessages === true) ||
        enableAutoRole !== (config.enableAutoRole === true) ||
        enableLogging !== (config.enableLogging === true) ||
        enableAntiSpam !== (config.enableAntiSpam === true) ||
        enableAutoMod !== (config.enableAutoMod === true);
      
      setFormChanged(changed);
    }
  }, [
    botName, botPrefix, botStatus, activityType, activity, useSlashCommands,
    logCommandUsage, respondToMentions, deleteCommandMessages,
    enableWelcomeMessages, enableGoodbyeMessages, enableAutoRole,
    enableLogging, enableAntiSpam, enableAutoMod,
    botInfoData, isBotInfoLoading
  ]);

  // Handle server toggle
  const handleServerToggle = (serverId: number, enabled: boolean) => {
    updateServerMutation.mutate({ id: serverId, update: { enabled } });
  };

  // Create invite link
  const createInviteLink = () => {

      const copyText = "https://discord.com/oauth2/authorize?client_id=1305619506500206622&permissions=8&integration_type=0&scope=bot+applications.commands";
    
      navigator.clipboard.writeText(copyText)
        .then(() => {
          toast({
            title: 'Link de convite copiado para a área de transferência',
            description: '',
          });
        })
        .catch(err => {
          toast({
            title: 'Erro ao copiar link de convite',
            description: 'Por favor, tente novamente.',
          });
        });
      
  };

  // Handle save configuration
  const handleSaveConfig = () => {
    const configUpdate: Partial<BotConfig> = {
      name: botName,
      prefix: botPrefix,
      status: botStatus,
      activityType,
      activity,
      useSlashCommands,
      logCommandUsage,
      respondToMentions,
      deleteCommandMessages,
      enableWelcomeMessages,
      enableGoodbyeMessages,
      enableAutoRole,
      enableLogging,
      enableAntiSpam,
      enableAutoMod
    };
    
    updateBotConfigMutation.mutate(configUpdate);
  };

  const saveButton = (
    <Button
      onClick={handleSaveConfig}
      disabled={!formChanged || updateBotConfigMutation.isPending}
      className="bg-discord-blurple hover:bg-opacity-80 px-4 py-2 rounded-md text-white text-sm"
    >
      {updateBotConfigMutation.isPending ? (
        <>
          <i className="fas fa-circle-notch spin mr-2"></i>
          Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
  );

  return (
    <AppShell title="Bot Configuration" actions={saveButton}>
      {/* General Settings Card */}
      <Card className="bg-discord-bg-secondary rounded-lg shadow mb-6">
        <CardHeader>
          <h3 className="font-bold">General Settings</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-discord-text-secondary text-sm mb-1">Bot Name</Label>
              <Input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
              />
            </div>
            
            <div>
              <Label className="block text-discord-text-secondary text-sm mb-1">Bot Prefix</Label>
              <Input
                type="text"
                value={botPrefix}
                onChange={(e) => setBotPrefix(e.target.value)}
                className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
              />
            </div>
            
            <div>
              <Label className="block text-discord-text-secondary text-sm mb-1">Bot Status</Label>
              <Select value={botStatus} onValueChange={setBotStatus}>
                <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="dnd">Do Not Disturb</SelectItem>
                  <SelectItem value="invisible">Invisible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-discord-text-secondary text-sm mb-1">Activity</Label>
              <div className="flex space-x-2">
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="flex-1 px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                    <SelectValue placeholder="Activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYING">Playing</SelectItem>
                    <SelectItem value="WATCHING">Watching</SelectItem>
                    <SelectItem value="LISTENING">Listening to</SelectItem>
                    <SelectItem value="COMPETING">Competing in</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Activity text"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="flex-1 px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <ToggleSwitch
              checked={useSlashCommands}
              onChange={setUseSlashCommands}
              label="Use Slash Commands"
              description="Enable to use Discord's slash command integration"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Bot Features Card */}
      <Card className="bg-discord-bg-secondary rounded-lg shadow mb-6">
        <CardHeader>
          <h3 className="font-bold">Bot Features</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <ToggleSwitch
                checked={logCommandUsage}
                onChange={setLogCommandUsage}
              />
              <Label className="text-discord-text-secondary ml-3">Log Command Usage</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={respondToMentions}
                onChange={setRespondToMentions}
              />
              <Label className="text-discord-text-secondary ml-3">Respond to Mentions</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={deleteCommandMessages}
                onChange={setDeleteCommandMessages}
              />
              <Label className="text-discord-text-secondary ml-3">Delete Command Messages</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={enableWelcomeMessages}
                onChange={setEnableWelcomeMessages}
              />
              <Label className="text-discord-text-secondary ml-3">Welcome Messages</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={enableGoodbyeMessages}
                onChange={setEnableGoodbyeMessages}
              />
              <Label className="text-discord-text-secondary ml-3">Goodbye Messages</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={enableAutoRole}
                onChange={setEnableAutoRole}
              />
              <Label className="text-discord-text-secondary ml-3">Auto Role</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={enableLogging}
                onChange={setEnableLogging}
              />
              <Label className="text-discord-text-secondary ml-3">Enable Logging</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={enableAntiSpam}
                onChange={setEnableAntiSpam}
              />
              <Label className="text-discord-text-secondary ml-3">Anti-Spam Protection</Label>
            </div>
            
            <div className="flex items-center">
              <ToggleSwitch
                checked={enableAutoMod}
                onChange={setEnableAutoMod}
              />
              <Label className="text-discord-text-secondary ml-3">Auto Moderation</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Servers Configuration Card */}
      <Card className="bg-discord-bg-secondary rounded-lg shadow mb-6">
        <CardHeader>
          <h3 className="font-bold">Servers Configuration</h3>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search servers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <i className="fas fa-search text-discord-text-secondary"></i>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-64">
            <div className="divide-y divide-gray-700">
              {isServersLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="py-3 animate-pulse">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-discord-bg-tertiary rounded-full mr-3"></div>
                      <div className="space-y-1">
                        <div className="h-4 bg-discord-bg-tertiary rounded w-32"></div>
                        <div className="h-3 bg-discord-bg-tertiary rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredServers && filteredServers.length > 0 ? (
                filteredServers.map(server => (
                  <ServerListItem
                    key={server.id}
                    server={server}
                    onToggle={(enabled) => handleServerToggle(server.id, enabled)}
                  />
                ))
              ) : (
                <div className="py-6 text-center text-discord-text-secondary">
                  {searchTerm ? 'No servers match your search' : 'No servers found'}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="link" className="text-discord-blurple text-sm hover:underline" onClick={createInviteLink}>
              Invite Bot to New Server
            </Button>
          </div>
        </CardContent>
      </Card>
    
    </AppShell>
  );
};

export default Config;
