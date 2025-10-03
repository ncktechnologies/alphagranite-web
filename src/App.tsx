import { AppRouting } from '@/routing/app-routing';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
// import { AuthProvider } from './auth/providers/supabase-provider';
import { QueryProvider } from './providers/query-provider';
import { SettingsProvider } from './providers/settings-provider';
import { ThemeProvider } from './providers/theme-provider';
import { TooltipsProvider } from './providers/tooltips-provider';
import ReduxProvider from './hoc/redux-providor';

const { BASE_URL } = import.meta.env;

export function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider>
        <SettingsProvider>
          <ThemeProvider>
              <HelmetProvider>
                <TooltipsProvider>
                  <QueryProvider>
                    <LoadingBarContainer>
                      <BrowserRouter basename={BASE_URL}>
                        <Toaster />
                        <AppRouting />
                      </BrowserRouter>
                    </LoadingBarContainer>
                  </QueryProvider>
                </TooltipsProvider>
              </HelmetProvider>
          </ThemeProvider>
        </SettingsProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
