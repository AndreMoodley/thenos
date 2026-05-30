// Remotion compositions for VOIDBORN's pre-rendered hero moments. `remotion studio` to preview;
// render to video and bundle for the app's anticipation set-pieces. Realm names/sigils mirror the
// shared realm contract (constants/realms.ts) so cinematics stay consistent with the game.
import React from 'react';
import { Composition } from 'remotion';
import { Rebirth } from './Rebirth';
import { RealmAscension } from './RealmAscension';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Rebirth" component={Rebirth} durationInFrames={150} fps={30} width={1080} height={1920} defaultProps={{ name: 'Adept' }} />
      <Composition
        id="RealmAscension"
        component={RealmAscension}
        durationInFrames={156}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ realmName: 'True Ki Awakening', sigil: '◈◈◈◈', stage: 4 }}
      />
    </>
  );
};
