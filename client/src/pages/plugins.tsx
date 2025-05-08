import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AppShell from '@/components/layout/app-shell';
import PluginCard from '@/components/plugins/plugin-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPlugins, updatePlugin } from '@/lib/discord-api';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Plugin } from '@shared/schema';

// Sample marketplace plugins - in a real app, these would come from an API
const marketplacePlugins = [
  {
    name: 'Reaction Polls',
    version: 'v2.3.1',
    description: 'Create interactive polls using message reactions.',
    downloads: '25K+',
    icon: 'fas fa-poll',
    color: 'text-discord-blurple'
  },
  {
    name: 'Ticket System',
    version: 'v1.8.0',
    description: 'Support ticket management for helping server members.',
    downloads: '38K+',
    icon: 'fas fa-ticket-alt',
    color: 'text-discord-green'
  },
  {
    name: 'Mini Games',
    version: 'v3.2.0',
    description: 'Fun text-based games like trivia, hangman, and more.',
    downloads: '42K+',
    icon: 'fas fa-gamepad',
    color: 'text-discord-yellow'
  }
];

const Plugins: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/plugins'],
    retry: false,
  });

  const updatePluginMutation = useMutation({
    mutationFn: ({ id, update }: { id: number, update: Partial<Plugin> }) => updatePlugin(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      toast({
        title: 'Plugin Updated',
        description: 'Plugin settings have been updated.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update plugin settings.',
      });
    }
  });

  const handlePluginToggle = (id: number, enabled: boolean) => {
    updatePluginMutation.mutate({ 
      id, 
      update: { enabled } 
    });
  };

  const handleInstallPlugin = () => {
    toast({
      title: 'Install Plugin',
      description: 'Plugin installation functionality would be implemented here.',
    });
  };

  // Filter installed plugins based on search term
  const filteredPlugins = data?.plugins?.filter(plugin => 
    plugin.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter marketplace plugins based on search term
  const filteredMarketplacePlugins = marketplacePlugins.filter(plugin => 
    plugin.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const installButton = (
    <Button
      onClick={handleInstallPlugin}
      className="bg-discord-blurple hover:bg-opacity-80 px-4 py-2 rounded-md text-white text-sm flex items-center"
    >
      <i className="fas fa-puzzle-piece mr-2"></i> Install Plugin
    </Button>
  );

  return (
    <AppShell title="Plugins" actions={installButton}>
      {/* Installed Plugins */}
      <Card className="bg-discord-bg-secondary rounded-lg shadow mb-6">
        <CardHeader>
          <h3 className="font-bold">Installed Plugins</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="border border-gray-700 rounded-lg p-4 animate-pulse">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-discord-bg-tertiary rounded-lg mr-3"></div>
                      <div className="space-y-1">
                        <div className="h-4 bg-discord-bg-tertiary rounded w-28"></div>
                        <div className="h-3 bg-discord-bg-tertiary rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-4 bg-discord-bg-tertiary rounded mt-3 w-full"></div>
                </div>
              ))
            ) : filteredPlugins && filteredPlugins.length > 0 ? (
              filteredPlugins.map(plugin => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onToggle={(enabled) => handlePluginToggle(plugin.id, enabled)}
                />
              ))
            ) : (
              <div className="col-span-2 py-6 text-center text-discord-text-secondary">
                {searchTerm ? 'No plugins match your search' : 'No plugins installed'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Plugin Marketplace */}
      <Card className="bg-discord-bg-secondary rounded-lg shadow">
        <CardHeader>
          <h3 className="font-bold">Plugin Marketplace</h3>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <i className="fas fa-search text-discord-text-secondary"></i>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredMarketplacePlugins.map((plugin, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 hover:border-discord-blurple transition-colors">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-discord-bg-tertiary overflow-hidden mr-3 flex items-center justify-center">
                    <i className={`${plugin.icon} ${plugin.color}`}></i>
                  </div>
                  <div>
                    <h4 className="font-medium">{plugin.name}</h4>
                    <p className="text-xs text-discord-text-secondary">{plugin.version}</p>
                  </div>
                </div>
                
                <p className="text-sm text-discord-text-secondary mt-3">{plugin.description}</p>
                
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-discord-text-secondary">Downloads: {plugin.downloads}</span>
                  <Button
                    size="sm"
                    className="px-3 py-1 bg-discord-blurple text-white rounded text-xs"
                  >
                    Install
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="link" className="text-discord-blurple text-sm hover:underline">
              Browse All Plugins
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Plugins;
