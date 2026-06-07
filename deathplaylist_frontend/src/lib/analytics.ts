const track = (name: string, data?: Record<string, string | number>) => {
  (window as any).umami?.track(name, data);
};

export const analytics = {
  playlistCreated: (songCount: number) =>
    track('playlist_create', { songCount }),
  playlistShared: (method: string) =>
    track('playlist_share', { method }),
  friendsViewed: () =>
    track('friends_view'),
  playlistViewed: () =>
    track('playlist_view'),
};
