import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface MusicState {
  audioUrl: string | null;
  novelTitle: string;
  setMusic: (url: string | null, title?: string) => void;
  clearMusic: () => void;
}

const MusicContext = createContext<MusicState>({
  audioUrl: null,
  novelTitle: "",
  setMusic: () => {},
  clearMusic: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [novelTitle, setNovelTitle] = useState("");

  const setMusic = useCallback((url: string | null, title = "") => {
    setAudioUrl(url);
    setNovelTitle(title);
  }, []);

  const clearMusic = useCallback(() => {
    setAudioUrl(null);
    setNovelTitle("");
  }, []);

  return (
    <MusicContext.Provider value={{ audioUrl, novelTitle, setMusic, clearMusic }}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => useContext(MusicContext);
