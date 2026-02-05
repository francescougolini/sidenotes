/**
 * Sidenotes - Notes App
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at
 * https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2023-2026 Francesco Ugolini
 *
 * SPDX-License-Identifier: MPL-2.0
 */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useReducer,
} from 'react';
import { StorageDB } from './services/db';
import { notepadActions } from './store/notepadActions';
import {
  generateID,
  shareLocalFile,
  getExportFileName,
  blobToBase64,
} from './utils/utils';
import { APP_DEFAULTS, FILE_CONFIG } from './utils/constants';
import { notepadReducer, ACTIONS } from './store/notepadReducer';
import { useDebounce } from './hooks/useDebounce';
import { useConfirmationDialog } from './hooks/useConfirmationDialog';
import Note from './components/Note';
import NotepadsViewer from './components/NotepadsViewer';
import ConfirmationDialog from './components/ConfirmationDialog';
import Spinner from './components/Spinner';
import {
  LogoIcon,
  AddNoteIcon,
  NotepadsViewerIcon,
  NewNotepadIcon,
  DeleteNotepadIcon,
  ShareIcon,
  AboutIcon,
} from './components/Icons';

const db = new StorageDB();

function App() {
  // --- Centralised state ---
  const [notepad, dispatch] = useReducer(notepadReducer, {
    id: generateID(APP_DEFAULTS.tags.notepad),
    title: APP_DEFAULTS.notepadTitle,
    created: 0,
    lastUpdate: 0,
    notes: [],
  });

  const [notepadsList, setNotepadsList] = useState([]);
  const [availableColors, setAvailableColors] = useState([
    ...APP_DEFAULTS.accentColors,
  ]);

  // UI state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog state
  const { isOpen, message, actions, customClasses, openDialog, closeDialog } =
    useConfirmationDialog();

  // Refs
  const titleRef = useRef(null);

  // --- Data synchronisation ---

  // Fetches all notepads from DB to keep the list updated
  const refreshNotepadsList = useCallback(async () => {
    try {
      const allData = await db.getAll();
      const list = Object.values(allData).sort(
        (a, b) => b.lastUpdate - a.lastUpdate,
      );
      setNotepadsList(list);
    } catch (err) {
      console.error('Failed to refresh notepads list', err);
    }
  }, []);

  // Debounced database update
  const persistNotepad = useDebounce((updatedNotepad) => {
    db.bulkPut({ [updatedNotepad.id]: updatedNotepad }).then(() => {
      // Refresh the list whenever the active notepad is saved
      refreshNotepadsList();
    });
  }, 300);

  // --- Handlers ---

  const handleTitleChange = (e) => {
    const newTitle = e.target.innerText;
    dispatch({ type: ACTIONS.UPDATE_TITLE, payload: newTitle });
  };

  const handleOpenViewer = useCallback(() => {
    setIsViewerOpen(true);
    // Refresh list immediately when opening viewer to ensure accuracy
    refreshNotepadsList();
  }, [refreshNotepadsList]);

  const fillNotepad = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_NOTEPAD, payload: data });
    const usedColors = data.notes.map((n) => n.accentColor).filter((c) => c);
    setAvailableColors([
      ...new Set([...APP_DEFAULTS.accentColors, ...usedColors]),
    ]);
    document.title = data.title || APP_DEFAULTS.notepadTitle;
  }, []);

  const createNewNotepad = useCallback((addEmptyNote = true) => {
    const now = Date.now();
    const newNotepad = {
      id: generateID(APP_DEFAULTS.tags.notepad),
      title: APP_DEFAULTS.notepadTitle,
      created: now,
      lastUpdate: now,
      notes: addEmptyNote
        ? [
            {
              id: generateID(APP_DEFAULTS.tags.note, 1),
              title: APP_DEFAULTS.noteTitle,
              content: '',
              accentColor: '',
              collapsed: false,
            },
          ]
        : [],
    };
    dispatch({ type: ACTIONS.SET_NOTEPAD, payload: newNotepad });
    setAvailableColors([...APP_DEFAULTS.accentColors]);
    document.title = APP_DEFAULTS.notepadTitle;
  }, []);

  const addNote = useCallback(() => {
    const index = notepad.notes.length + 1;
    const newNote = {
      id: generateID(APP_DEFAULTS.tags.note, index),
      title: APP_DEFAULTS.noteTitle,
      content: '',
      accentColor: '',
      collapsed: false,
    };
    dispatch({ type: ACTIONS.ADD_NOTE, payload: newNote });
  }, [notepad.notes.length]);

  const duplicateNote = useCallback((originalNote) => {
    const newNote = {
      ...originalNote,
      id: generateID(APP_DEFAULTS.tags.note, Date.now()),
      title: originalNote.title + ' (Copy)',
    };
    dispatch({
      type: ACTIONS.DUPLICATE_NOTE,
      payload: { originalId: originalNote.id, newNote },
    });
  }, []);

  const updateNote = useCallback((updatedNote) => {
    dispatch({ type: ACTIONS.UPDATE_NOTE, payload: updatedNote });
  }, []);

  const deleteNote = useCallback((id) => {
    dispatch({ type: ACTIONS.DELETE_NOTE, payload: id });
  }, []);

  const onDeleteNote = (id) => {
    openDialog({
      isOpen: true,
      message: 'Delete this note permanently?',
      actions: [
        {
          actionLabel: 'Delete',
          action: () => deleteNote(id),
          customClasses: ['dialog-button-confirm'],
        },
        {
          actionLabel: 'Cancel',
          action: () => {},
          customClasses: ['dialog-button-standard'],
        },
      ],
    });
  };

  const moveNote = useCallback((id, oldIndex, newIndex) => {
    dispatch({ type: ACTIONS.MOVE_NOTE, payload: { oldIndex, newIndex } });
  }, []);

  const deleteCurrentNotepad = () => {
    openDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this notepad?',
      actions: [
        {
          actionLabel: 'Delete',
          customClasses: ['dialog-button-confirm'],
          action: async () => {
            await db.delete(notepad.id);
            await refreshNotepadsList();
            createNewNotepad(true);
          },
        },
        {
          actionLabel: 'Cancel',
          customClasses: ['dialog-button-standard'],
          action: () => {},
        },
      ],
    });
  };

  const onShare = useCallback(() => {
    notepadActions.shareSingleNotepad(notepad, {
      setIsProcessing,
      blobToBase64,
      getExportFileName,
      shareLocalFile,
      FILE_CONFIG,
    });
  }, [notepad]);

  // Title handlers
  const handleTitleFocus = (e) => {
    if (e.target.innerText === APP_DEFAULTS.notepadTitle) {
      e.target.innerText = '';
    }
  };

  const handleTitleBlur = (e) => {
    if (e.target.innerText.trim() === '') {
      e.target.innerText = APP_DEFAULTS.notepadTitle;
      dispatch({
        type: ACTIONS.UPDATE_TITLE,
        payload: APP_DEFAULTS.notepadTitle,
      });
      document.title = APP_DEFAULTS.notepadTitle;
    }
  };

  // --- Effects ---

  // Initial data load
  useEffect(() => {
    const init = async () => {
      try {
        await db.init();
        await refreshNotepadsList();

        // Load the most recently updated notepad
        const all = await db.getAll();
        const last = Object.values(all).sort(
          (a, b) => b.lastUpdate - a.lastUpdate,
        )[0];
        last ? fillNotepad(last) : createNewNotepad(true);
      } catch (err) {
        console.error('Database initialisation failed', err);
      }
    };
    init();
  }, [fillNotepad, createNewNotepad, refreshNotepadsList]);

  // Sync title to DOM
  useEffect(() => {
    if (titleRef.current && titleRef.current.innerText !== notepad.title) {
      titleRef.current.innerText = notepad.title;
    }
  }, [notepad.id, notepad.title]);

  // Persist changes
  useEffect(() => {
    if (!isProcessing) {
      persistNotepad(notepad);
    }
  }, [notepad, isProcessing, persistNotepad]);

  // Emergency LocalStorage backup
  useEffect(() => {
    const handleUnload = () =>
      localStorage.setItem('sp_emergency_backup', JSON.stringify(notepad));
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [notepad]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Alt+K (Cmd+Alt+K on Mac) to open NotepadsViewer
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'k') {
        e.preventDefault();
        handleOpenViewer();
      }
      // Ctrl+Alt+N (Cmd+Alt+N on Mac) to add a new note
      else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'n') {
        e.preventDefault();
        addNote();
      }
      // Ctrl+Alt+M (Cmd+Alt+M on Mac) to create a new notepad
      else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'm') {
        e.preventDefault();
        createNewNotepad(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenViewer, addNote, createNewNotepad]);

  return (
    <div id="notepad-entry-point" className="entry-point">
      {isProcessing && <Spinner />}

      <main
        id={notepad.id}
        className="notepad"
        data-notepad-created={notepad.created}
        data-notepad-last-update={notepad.lastUpdate}
      >
        <h1
          ref={titleRef}
          key={notepad.id}
          className="notepad-title editable"
          contentEditable="plaintext-only"
          aria-label="Notepad title"
          suppressContentEditableWarning={true}
          onFocus={handleTitleFocus}
          onBlur={handleTitleBlur}
          onInput={handleTitleChange}
        ></h1>

        <div className="notes-container">
          {notepad.notes.map((note, idx) => (
            <Note
              key={note.id}
              note={note}
              index={idx + 1}
              totalNotes={notepad.notes.length}
              defaultTitle={APP_DEFAULTS.noteTitle}
              onUpdate={updateNote}
              onDeleteRequest={onDeleteNote}
              onMove={moveNote}
              onDuplicate={duplicateNote}
              availableColors={availableColors}
            />
          ))}
        </div>
      </main>

      <div className="toolbox">
        <div className="toolbox-element branding">
          <LogoIcon />
        </div>
        <div className="toolbox-element">
          <button
            className="toolbox-control hovering-label tooltip-right add-note"
            aria-label="Add note"
            onClick={addNote}
          >
            <AddNoteIcon />
          </button>
        </div>
        <div className="toolbox-element">
          <button
            className="toolbox-control hovering-label tooltip-right notepads-viewer-control"
            aria-label="Notepads"
            onClick={handleOpenViewer}
          >
            <NotepadsViewerIcon />
          </button>
        </div>
        <div className="toolbox-element">
          <button
            className="toolbox-control hovering-label tooltip-right"
            aria-label="New notepad"
            onClick={() => createNewNotepad(true)}
          >
            <NewNotepadIcon />
          </button>
        </div>
        <div className="toolbox-element">
          <button
            className="toolbox-control hovering-label tooltip-right"
            aria-label="Delete notepad"
            onClick={deleteCurrentNotepad}
          >
            <DeleteNotepadIcon size="32" />
          </button>
        </div>
        <div className="toolbox-element">
          <button
            className="toolbox-control hovering-label tooltip-right"
            aria-label="Share notepad"
            onClick={onShare}
          >
            <ShareIcon size="32" />
          </button>
        </div>
        <div className="toolbox-element">
          <button
            className="toolbox-control hovering-label tooltip-right about"
            aria-label="About"
            onClick={() => window.open(APP_DEFAULTS.branding.about, '_blank')}
          >
            <AboutIcon />
          </button>
        </div>
      </div>

      <NotepadsViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        notepads={notepadsList}
        onRefresh={refreshNotepadsList}
        onOpenNotepad={fillNotepad}
        onCreateNotepad={createNewNotepad}
        db={db}
        activeNotepadId={notepad.id}
      />

      <ConfirmationDialog
        isOpen={isOpen}
        message={message}
        actions={actions}
        onClose={closeDialog}
        customClasses={customClasses}
      />
    </div>
  );
}

export default App;
