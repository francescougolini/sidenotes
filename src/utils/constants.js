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

export const APP_DEFAULTS = {
  notepadTitle: 'New notepad',
  noteTitle: 'New note',
  tags: {
    note: 'note',
    notepad: 'notepad',
  },
  branding: {
    about: 'https://github.com/francescougolini/sidenotes',
  },
  accentColors: [
    '', // Default/None
    '#fefbe6', // Yellow
    '#e0f7fa', // Cyan
    '#f2eef9', // Purple
    '#fde6e6', // Red
    '#feddc9', // Orange
    '#e5f4da', // Green
    '#d1e3f8', // Blue
    '#e8dbcd', // Brown
    '#f5f5f5', // Grey
  ],
};

export const DB_CONFIG = {
  DB_NAME: 'SidenotesApp',
  STORE_NAME: 'notepads',
  VERSION: 1,
};

export const FILE_CONFIG = {
  MIME_TYPE: 'text/plain',
  EXTENSIONS: {
    NOTE: '.sidenotes.txt',
    BACKUP: '.backup.sidenotes.txt',
  },
};

// Words per minute for reading time calculation
export const READING_SPEED = 238;
