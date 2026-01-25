export const dockerComposeTemplate = (srvPath: string, certPath: string) => {
  return `services:
  filebrowser:
    image: filebrowser/filebrowser:latest
    container_name: filebrowser
    restart: unless-stopped
    volumes:
      - ${srvPath}:/srv
      - ./filebrowser.db:/database/filebrowser.db
      - ./settings.json:/config/settings.json
      - ${certPath}:/certs:ro
    environment:
      - PUID=1000
      - PGID=1000
    ports:
      - "8443:443"`;
};

export const settingsJsonTemplate = (certFile = 'fb-cert.pem', keyFile = 'fb-key.pem') => {
  return JSON.stringify(
    {
      port: 443,
      address: '0.0.0.0',
      cert: `/certs/${certFile}`,
      key: `/certs/${keyFile}`,
      log: 'stdout',
      database: '/database/filebrowser.db',
      root: '/srv',
      auth: {
        method: 'json',
      },
      branding: {
        name: 'Secure Setup Portal',
        disableExternal: true,
      },
    },
    null,
    2,
  );
};
