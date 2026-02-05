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
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
} from 'react';
import {
  uploadLocalFile,
  shareLocalFile,
  getExportFileName,
  generateID,
  dataFallbackMode,
  blobToBase64,
  base64ToBlob,
} from '../utils/utils';
import { useDebounce } from '../hooks/useDebounce';
import { useConfirmationDialog } from '../hooks/useConfirmationDialog';
import { notepadActions } from '../store/notepadActions';
import { FILE_CONFIG } from '../utils/constants';
import Spinner from './Spinner';
import {
  ShareIcon,
  NewNotepadIcon,
  ImportNotepadIcon,
  BackupNotepadsIcon,
  RestoreNotepadsIcon,
  DuplicateNotepadIcon,
  DeleteNotepadIcon,
} from './Icons';
import ConfirmationDialog from './ConfirmationDialog';

const NotepadsViewer = ({
  isOpen,
  onClose,
  notepads,
  onRefresh,
  onOpenNotepad,
  onCreateNotepad,
  db,
  activeNotepadId,
}) => {
  const searchId = useId();

  const dialogRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search function
  const debouncedSearch = useDebounce((term) => {
    setSearchTerm(term);
  }, 300);

  const {
    isOpen: isConfirmOpen,
    message,
    actions,
    customClasses,
    openDialog,
    closeDialog,
  } = useConfirmationDialog();

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  // Handlers
  const onInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  const handleClose = useCallback(() => {
    setInputValue('');
    setSearchTerm('');
    onClose();
  }, [onClose]);

  // Memoise the filtered list
  const filteredNotepads = useMemo(() => {
    if (!searchTerm) {
      return notepads;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    return notepads.filter((notepad) => {
      const matchTitle = notepad.title.toLowerCase().includes(lowerCaseSearch);
      if (matchTitle) {
        return true;
      }

      return notepad.notes.some((n) => {
        const noteTitleMatch = n.title.toLowerCase().includes(lowerCaseSearch);
        const noteContentMatch = n.content
          .toLowerCase()
          .includes(lowerCaseSearch);
        return noteTitleMatch || noteContentMatch;
      });
    });
  }, [notepads, searchTerm]);

  const onImport = () => {
    notepadActions.importSingleNotepad({
      db,
      setIsProcessing,
      openDialog,
      onOpenNotepad,
      onClose: () => {
        onRefresh();
        onClose();
      },
      uploadLocalFile,
      base64ToBlob,
      generateID,
      FILE_CONFIG,
    });
  };

  const onBackup = () => {
    notepadActions.backupFullLibrary({
      db,
      setIsProcessing,
      blobToBase64,
      getExportFileName,
      shareLocalFile,
      FILE_CONFIG,
    });
  };

  const onRestore = () => {
    notepadActions.restoreFullLibrary({
      db,
      setIsProcessing,
      openDialog,
      uploadLocalFile,
      base64ToBlob,
      dataFallbackMode,
      FILE_CONFIG,
    });
  };

  const onShare = (targetNotepad) => {
    notepadActions.shareSingleNotepad(targetNotepad, {
      setIsProcessing,
      blobToBase64,
      getExportFileName,
      shareLocalFile,
      FILE_CONFIG,
    });
  };

  const handleDuplicate = async (notepad) => {
    setIsProcessing(true);
    try {
      const duplicated = { ...notepad };
      duplicated.id = generateID('notepad', undefined, Date.now());
      duplicated.title = duplicated.title + ' (Copy)';
      const now = Date.now();
      duplicated.created = now;
      duplicated.lastUpdate = now;
      await db.bulkPut({ [duplicated.id]: duplicated });
      onRefresh();
    } catch (err) {
      console.error('Duplicate failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (notepadId) => {
    openDialog({
      isOpen: true,
      message: 'Delete notepad?',
      actions: [
        {
          actionLabel: 'Delete',
          customClasses: ['dialog-button-confirm'],
          action: async () => {
            const index = notepads.findIndex((n) => n.id === notepadId);
            await db.delete(notepadId);

            // Fetch the updated list to determine next steps
            const allData = await db.getAll();
            const updatedList = Object.values(allData).sort(
              (a, b) => b.lastUpdate - a.lastUpdate,
            );

            onRefresh(); // Sync app state

            if (notepadId === activeNotepadId) {
              if (updatedList.length === 0) {
                onCreateNotepad(true);
              } else {
                // Determine next notepad to show
                const nextNotepad =
                  updatedList[index] ||
                  updatedList[index - 1] ||
                  updatedList[0];
                if (nextNotepad) {
                  onOpenNotepad(nextNotepad);
                }
              }
            }
          },
        },
        {
          actionLabel: 'Cancel',
          customClasses: ['dialog-button-standard'],
          action: closeDialog,
        },
      ],
    });
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        className="dialog notepads-viewer"
        onClose={handleClose}
      >
        {isProcessing && <Spinner />}

        <header className="dialog-header viewer-header">
          <h2>Notepads</h2>
        </header>

        <div className="viewer-toolbox">
          <div className="viewer-toolbox-search-container">
            <input
              id={searchId}
              name="notepad-search"
              className="viewer-toolbox-control viewer-toolbox-search"
              placeholder="Search notepads..."
              value={inputValue}
              onInput={onInputChange}
              autoFocus
            />
          </div>
          <div className="viewer-toolbox-controls">
            <div className="viewer-toolbox-control-container">
              <button
                className="hovering-label viewer-toolbox-control"
                aria-label="New notepad"
                onClick={() => {
                  onCreateNotepad(true);
                  handleClose();
                }}
              >
                <NewNotepadIcon size="20" />
              </button>
            </div>
            <div className="viewer-toolbox-control-container">
              <button
                className="hovering-label viewer-toolbox-control"
                aria-label="Import notepad"
                onClick={onImport}
              >
                <ImportNotepadIcon />
              </button>
            </div>
            <div className="viewer-toolbox-control-container">
              <button
                className="hovering-label viewer-toolbox-control"
                aria-label="Backup notepads"
                onClick={onBackup}
              >
                <BackupNotepadsIcon />
              </button>
            </div>
            <div className="viewer-toolbox-control-container">
              <button
                className="hovering-label viewer-toolbox-control tooltip-left"
                aria-label="Restore backup"
                onClick={onRestore}
              >
                <RestoreNotepadsIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="dialog-body viewer-notepads-list">
          {filteredNotepads.length > 0 ? (
            filteredNotepads.map((np, idx) => (
              <div
                key={np.id}
                className={`viewer-list-item ${np.id === activeNotepadId ? 'active-notepad' : ''}`}
              >
                <div
                  className="hovering-label viewer-last-update"
                  aria-label="Last update"
                >
                  {new Date(np.lastUpdate).toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div
                  className="viewer-notepad-title-container viewer-notepad-title"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onOpenNotepad(np);
                    handleClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenNotepad(np);
                      handleClose();
                    }
                  }}
                >
                  {np.title}
                </div>
                <div className="viewer-controls">
                  <div className="viewer-control-container">
                    <button
                      className={`viewer-control hovering-label viewer-share-control${idx === 0 ? ' tooltip-below' : ''}`}
                      aria-label="Share notepad"
                      onClick={() => onShare(np)}
                    >
                      <ShareIcon size="20" />
                    </button>
                  </div>
                  <div className="viewer-control-container">
                    <button
                      className={`viewer-control hovering-label viewer-duplicate-control${idx === 0 ? ' tooltip-below' : ''}`}
                      aria-label="Duplicate notepad"
                      onClick={() => handleDuplicate(np)}
                    >
                      <DuplicateNotepadIcon />
                    </button>
                  </div>
                  <div className="viewer-control-container">
                    <button
                      className={`viewer-control hovering-label viewer-delete-control${idx === 0 ? ' tooltip-below tooltip-left' : ' tooltip-left'}`}
                      aria-label="Delete notepad"
                      onClick={() => handleDelete(np.id)}
                    >
                      <DeleteNotepadIcon size="20" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="viewer-list-empty">No notepads found</div>
          )}
        </div>

        <footer className="dialog-footer viewer-footer">
          <div className="dialog-button-container">
            <button
              className="dialog-button dialog-button-standard"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </footer>
      </dialog>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        message={message}
        actions={actions}
        onClose={closeDialog}
        customClasses={customClasses}
      />
    </>
  );
};

export default NotepadsViewer;
