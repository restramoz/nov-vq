import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicProvider, useMusic } from "@/contexts/MusicContext";
import { GlobalMusicPlayer } from "@/components/GlobalMusicPlayer";
import Index from "./pages/Index";
import CreateNovel from "./pages/CreateNovel";
import NovelDetail from "./pages/NovelDetail";
import ChapterReader from "./pages/ChapterReader";
import SettingsPage from "./pages/Settings";
import Worldbuilding from "./pages/Worldbuilding";
import Editor from "./pages/Editor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { audioUrl, novelTitle } = useMusic();
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/create" element={<CreateNovel />} />
        <Route path="/novel/:id" element={<NovelDetail />} />
        <Route path="/novel/:id/read" element={<ChapterReader />} />
        <Route path="/novel/:id/world" element={<Worldbuilding />} />
        <Route path="/novel/:id/edit" element={<Editor />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalMusicPlayer audioUrl={audioUrl} novelTitle={novelTitle} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
