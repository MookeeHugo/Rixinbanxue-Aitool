"use client";

import { useState, useCallback, useEffect } from 'react';
import { Whiteboard } from './Whiteboard';
import { WhiteboardSync, useBroadcastDrawAction, useBroadcastFileDisplayed } from './WhiteboardSync';

interface DrawAction {
  tool: "pen" | "eraser" | "line" | "rectangle" | "circle" | "text";
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
}

interface SharedFile {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  storage_url: string;
  is_displayed_on_whiteboard: boolean;
  created_at: string;
  uploader_name?: string;
}

interface CollaborativeWhiteboardProps {
  sessionId: string;
  displayedFile?: SharedFile | null;
}

/**
 * CollaborativeWhiteboard combines the Whiteboard component with LiveKit Data Channel sync
 * Must be rendered inside LiveKitRoom context
 */
export function CollaborativeWhiteboard({ sessionId, displayedFile }: CollaborativeWhiteboardProps) {
  const [remoteDrawActions, setRemoteDrawActions] = useState<DrawAction[]>([]);
  const [remoteDisplayedFile, setRemoteDisplayedFile] = useState<SharedFile | null>(null);
  const broadcastDrawAction = useBroadcastDrawAction();
  const broadcastFileDisplayed = useBroadcastFileDisplayed();

  // Handle local drawing actions - broadcast to others
  const handleDrawAction = useCallback(
    (action: DrawAction) => {
      broadcastDrawAction(action);
    },
    [broadcastDrawAction]
  );

  // Handle remote drawing actions - add to state to trigger replay
  const handleRemoteDrawAction = useCallback((action: DrawAction) => {
    setRemoteDrawActions((prev) => [...prev, action]);
  }, []);

  // Handle remote file displayed event
  const handleRemoteFileDisplayed = useCallback((file: SharedFile) => {
    setRemoteDisplayedFile(file);
  }, []);

  // Display file on whiteboard when displayedFile changes
  useEffect(() => {
    if (displayedFile && displayedFile.file_type.startsWith('image/')) {
      // Broadcast to other participants
      broadcastFileDisplayed(displayedFile);
      // Display locally
      setRemoteDisplayedFile(displayedFile);
    }
  }, [displayedFile, broadcastFileDisplayed]);

  return (
    <>
      <Whiteboard
        sessionId={sessionId}
        onDrawAction={handleDrawAction}
        remoteDrawActions={remoteDrawActions}
        displayedImage={remoteDisplayedFile?.storage_url}
      />
      <WhiteboardSync
        onRemoteDrawAction={handleRemoteDrawAction}
        onRemoteFileDisplayed={handleRemoteFileDisplayed}
      />
    </>
  );
}
