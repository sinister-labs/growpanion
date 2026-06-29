"use client";

import { useEffect, useState } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/hooks/useSettings';
import { useRouting } from '@/hooks/useRouting';
import { ExportImportSection } from '@/components/export-import-dialog';
import { NotificationSettings } from '@/components/notifications';
import { IntegrationsSection } from '@/components/integrations/integrations-section';
import { Toaster } from '@/components/ui/toaster';

const SETTINGS_TABS = ['integrations', 'backup', 'notifications'] as const;
type SettingsTab = typeof SETTINGS_TABS[number];

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

interface SettingsPageProps {
  initialTab?: string;
}

export default function SettingsPage({ initialTab }: SettingsPageProps) {
  const { isLoading } = useSettings();
  const { navigateTo, params } = useRouting();
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');

  useEffect(() => {
    const tabParam = initialTab || params.tab;
    if (isSettingsTab(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [initialTab, params.tab]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center relative z-10">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center space-y-8">
      <Toaster />
      <div className="w-full">
        <div className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-foreground p-0 h-auto flex items-center gap-1"
                  onClick={() => navigateTo('dashboard')}
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
                <span className="text-muted-foreground">/</span>
                <h1 className="font-semibold text-foreground">Settings</h1>
              </div>
              <p className="text-muted-foreground">Integrations, backup, and notifications</p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isSettingsTab(value)) {
                setActiveTab(value);
                navigateTo('settings', { tab: value });
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="integrations">
                <IntegrationsSection />
              </TabsContent>
              <TabsContent value="backup">
                <ExportImportSection />
              </TabsContent>
              <TabsContent value="notifications">
                <NotificationSettings />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
