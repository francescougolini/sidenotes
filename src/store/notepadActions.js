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

import { serializeNotes, hydrateNotes } from '../utils/utils';

export const notepadActions = {
  importSingleNotepad: async (deps) => {
    const {
      db,
      setIsProcessing,
      openDialog,
      onOpenNotepad,
      onClose,
      uploadLocalFile,
      base64ToBlob,
      generateID,
      FILE_CONFIG,
    } = deps;

    uploadLocalFile(async (json) => {
      setIsProcessing(true);
      try {
        const notepadData = JSON.parse(json);

        const isBackup =
          notepadData &&
          !notepadData.notes &&
          typeof notepadData === 'object' &&
          Object.values(notepadData).some((v) => v.notes);
        if (isBackup) {
          alert(
            'This file appears to be a full backup. Please use the "Restore" button instead of "Import".',
          );
          setIsProcessing(false);
          return;
        }

        if (!notepadData || !notepadData.notes) {
          setIsProcessing(false);
          throw new Error('Invalid structure');
        }

        const hydratedNotes = await hydrateNotes(
          notepadData.notes,
          base64ToBlob,
        );

        const notepad = { ...notepadData, notes: hydratedNotes };

        const saveToDatabase = async (target) => {
          await db.bulkPut({ [target.id]: target });
          onOpenNotepad(target);
          setIsProcessing(false);
          onClose();
        };

        const currentLibrary = await db.getAll();
        const isDuplicate = currentLibrary[notepad.id];

        if (isDuplicate) {
          setIsProcessing(false);
          openDialog({
            isOpen: true,
            message: 'A version of this notepad already exists.',
            actions: [
              {
                actionLabel: 'Keep both',
                customClasses: ['dialog-button-standard'],
                action: () =>
                  saveToDatabase({ ...notepad, id: generateID('notepad') }),
              },
              {
                actionLabel: 'Replace',
                customClasses: ['dialog-button-confirm'],
                action: () => saveToDatabase(notepad),
              },
              {
                actionLabel: 'Cancel',
                customClasses: ['dialog-button-standard'],
                action: () => setIsProcessing(false),
              },
            ],
          });
        } else {
          await saveToDatabase(notepad);
        }
      } catch (err) {
        setIsProcessing(false);
        alert('Import failed: Invalid file format.');
        console.error(err);
      }
    }, FILE_CONFIG.MIME_TYPE);
  },

  shareSingleNotepad: async (notepad, deps) => {
    const {
      setIsProcessing,
      blobToBase64,
      getExportFileName,
      shareLocalFile,
      FILE_CONFIG,
    } = deps;

    if (!notepad || !notepad.id || typeof notepad.id !== 'string') {
      console.error('Invalid notepad object provided to share.');
      return;
    }

    setIsProcessing(true);
    try {
      const serializedNotes = await serializeNotes(notepad.notes, blobToBase64);

      // Create a clean payload to avoid serialising extra DOM/Event properties
      const cleanPayload = {
        id: notepad.id,
        title: notepad.title,
        created: notepad.created,
        lastUpdate: notepad.lastUpdate,
        notes: serializedNotes,
      };

      const payload = JSON.stringify(cleanPayload);
      await shareLocalFile(
        payload,
        getExportFileName(notepad.title, 'NOTE'),
        FILE_CONFIG.MIME_TYPE,
        notepad.title,
      );
    } catch (err) {
      console.error('Sharing failed:', err);
      alert('Could not share notepad.');
    } finally {
      setIsProcessing(false);
    }
  },

  backupFullLibrary: async ({
    db,
    setIsProcessing,
    blobToBase64,
    getExportFileName,
    shareLocalFile,
    FILE_CONFIG,
  }) => {
    setIsProcessing(true);

    try {
      const library = await db.getAll();

      const serializedEntries = await Promise.all(
        Object.entries(library).map(async ([id, notepad]) => {
          const serializedNotes = await serializeNotes(
            notepad.notes,
            blobToBase64,
          );
          return [id, { ...notepad, notes: serializedNotes }];
        }),
      );

      const payload = JSON.stringify(Object.fromEntries(serializedEntries));
      await shareLocalFile(
        payload,
        getExportFileName(null, 'BACKUP'),
        FILE_CONFIG.MIME_TYPE,
        'Full Library Backup',
      );
    } catch (err) {
      console.error('Backup failed:', err);
      alert('Could not generate backup file.');
    } finally {
      setIsProcessing(false);
    }
  },

  restoreFullLibrary: (deps) => {
    const {
      db,
      setIsProcessing,
      openDialog,
      uploadLocalFile,
      dataFallbackMode,
      FILE_CONFIG,
    } = deps;

    openDialog({
      isOpen: true,
      message: 'This will replace all local data. Proceed?',
      actions: [
        {
          actionLabel: 'Proceed',
          customClasses: ['dialog-button-confirm'],
          action: () => {
            uploadLocalFile(async (json) => {
              setIsProcessing(true);
              try {
                const libraryData = JSON.parse(json);

                // Use dataFallbackMode to validate/hydrate everything BEFORE clearing the DB
                await dataFallbackMode(libraryData, async (validatedData) => {
                  await db.clear();
                  await db.bulkPut(validatedData);
                  setTimeout(() => window.location.reload(), 250);
                });
              } catch (err) {
                console.error('Restore failed:', err);
                alert('Restore failed: The file is corrupted or invalid.');
              } finally {
                setIsProcessing(false);
              }
            }, FILE_CONFIG.MIME_TYPE);
          },
        },
        {
          actionLabel: 'Cancel',
          customClasses: ['dialog-button-standard'],
          action: () => {},
        },
      ],
    });
  },
};
