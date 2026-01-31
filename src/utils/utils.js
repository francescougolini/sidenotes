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

import { FILE_CONFIG, READING_SPEED } from './constants';

export const countWords = (text = '') => {
  if (!text.trim()) {
    return 0;
  }
  // Use Intl.Segmenter if available (modern browsers), otherwise fall back to regex
  if ('Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
    return Array.from(segmenter.segment(text)).filter((s) => s.isWordLike)
      .length;
  }
  const regex =
    /[\n\s]{0,}[a-zA-Z0-9\u00C0-\u017F\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}]+/gu;
  return (text.match(regex) || []).length;
};

export const getReadTime = (targetString = '') => {
  const wordNumber = countWords(targetString);
  const seconds = Math.ceil(wordNumber / (READING_SPEED / 60));
  return seconds;
};

/**
 * Converts a Blob to a Base64 string for JSON serialisation.
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob)) {
      return resolve(null);
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Converts a Base64 string back to a Blob for app usage.
 */
export const base64ToBlob = async (base64Data) => {
  try {
    if (!base64Data || typeof base64Data !== 'string') {
      return null;
    }

    // Ensure it's a valid data URL
    if (!base64Data.startsWith('data:')) {
      return null;
    }

    const response = await fetch(base64Data);
    return await response.blob();
  } catch (e) {
    console.error('Conversion to blob failed', e);
    return null;
  }
};

export const downloadLocalFile = (data, filename, contentType) => {
  const file = new Blob([data], { type: contentType });
  const temporaryLink = document.createElement('a');
  temporaryLink.href = URL.createObjectURL(file);
  temporaryLink.download = filename;
  temporaryLink.click();
  URL.revokeObjectURL(temporaryLink.href);
  temporaryLink.remove();
};

export const uploadLocalFile = (callbackAction, contentType = 'text/plain') => {
  const temporaryInput = document.createElement('input');
  temporaryInput.type = 'file';
  temporaryInput.accept = contentType;

  temporaryInput.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    } // Safeguard against cancel

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        callbackAction(event.target.result);
      } catch (error) {
        console.error('File reading failed: ' + error);
      }
    };
    reader.readAsText(file);
  };

  temporaryInput.click();
  temporaryInput.remove();
};

/**
 * Shares a file using the Web Share API if available and supported.
 * Falls back to clipboard (when possible) or download as last resort.
 */
export const shareLocalFile = async (
  data,
  filename,
  contentType,
  title = '',
) => {
  const file = new File([data], filename, {
    type: contentType,
    lastModified: Date.now(),
  });

  const shareData = {
    files: [file],
    title: title || filename,
  };

  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'share' };
    } catch (error) {
      // User cancelled - don't fall through
      if (error.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }

      // Other errors - log and fall through
      console.warn('Share failed, falling back:', error.name);
    }
  }

  // Fallback: Try copying filename/title to clipboard as a hint
  if (navigator.clipboard && typeof data === 'string') {
    try {
      // For text-based files (JSON, TXT), copy content to clipboard
      const textToCopy =
        contentType.includes('json') || contentType.includes('text')
          ? data
          : `File ready: ${filename}`;

      await navigator.clipboard.writeText(textToCopy);

      // Still download the file, but let user know it's also in clipboard
      downloadLocalFile(data, filename, contentType);
      return { success: true, method: 'clipboard+download' };
    } catch (clipErr) {
      // Clipboard failed, just download
      console.warn('Clipboard failed:', clipErr);
    }
  }

  // Final fallback: download only
  downloadLocalFile(data, filename, contentType);
  return { success: true, method: 'download' };
};

export const getExportFileName = (title, type = 'NOTE') => {
  // Clean spaces and lowercase for cross-platform safety
  const cleanTitle = (title || 'sidenotes')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();

  if (type === 'BACKUP') {
    // Generate timestamp: YYYYMMDD
    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');

    return `notepads_${dateStamp}${FILE_CONFIG.EXTENSIONS.BACKUP}`;
  }

  return `${cleanTitle}${FILE_CONFIG.EXTENSIONS.NOTE}`;
};

export const generateID = (prefix = '') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Validate and filter data during import/restore to prevent app crashes.
 * It ensures the incoming data structure matches what the app expects.
 */
export const dataFallbackMode = async (newData, callbackAction) => {
  try {
    // Detect structure type
    const isSingleNotepad =
      newData && newData.notes && Array.isArray(newData.notes);
    const isBackupCollection =
      newData && !isSingleNotepad && typeof newData === 'object';

    const validatedData = {};

    // Handle single notepad import
    if (isSingleNotepad) {
      alert(
        'This is a single notepad file. Please use the "Import" button instead of "Restore".',
      );
      return;
    }

    // Handle backup collection (restore)
    if (isBackupCollection) {
      const notepadIds = Object.keys(newData);

      await Promise.all(
        notepadIds.map(async (id) => {
          const notepad = newData[id];

          // Standard Safeguard: check for required structure
          if (notepad && notepad.id && Array.isArray(notepad.notes)) {
            // Convert attachments back to Blobs securely
            const processedNotes = await Promise.all(
              notepad.notes.map(async (note) => {
                const noteCopy = { ...note };
                if (
                  noteCopy.attachment?.blob &&
                  typeof noteCopy.attachment.blob === 'string'
                ) {
                  noteCopy.attachment.blob = await base64ToBlob(
                    noteCopy.attachment.blob,
                  );
                }

                return {
                  id: noteCopy.id || generateID('note'),
                  title: noteCopy.title || '',
                  content: noteCopy.content || '',
                  accentColor: noteCopy.accentColor || '',
                  attachment: noteCopy.attachment || null,
                };
              }),
            );

            validatedData[id] = {
              id: notepad.id,
              title: notepad.title || 'Untitled Notepad',
              created: notepad.created || Date.now(),
              lastUpdate: notepad.lastUpdate || Date.now(),
              notes: processedNotes,
            };
          }
        }),
      );
    }

    // Final validation and messaging
    if (Object.keys(validatedData).length > 0) {
      await callbackAction(validatedData);
    } else {
      alert('No valid backup data found.');
    }
  } catch (error) {
    console.error('Data validation failed:', error);
    alert('The file format is invalid.');
  }
};

/**
 * Categorises a MIME type into image, video, audio, or generic file.
 */
export const getFileType = (mimeType = '') => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
};

/**
 * Formats file size into human-readable strings.
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const serializeNotes = async (notes, blobToBase64) => {
  if (!Array.isArray(notes)) {
    return [];
  }
  return Promise.all(
    notes.map(async (note) => {
      // Check if blob is actually a Blob/File object before converting
      if (note.attachment?.blob instanceof Blob) {
        return {
          ...note,
          attachment: {
            ...note.attachment,
            blob: await blobToBase64(note.attachment.blob),
          },
        };
      }
      return note;
    }),
  );
};

export const hydrateNotes = async (notes, base64ToBlob) => {
  if (!Array.isArray(notes)) {
    return [];
  }
  return Promise.all(
    notes.map(async (note) => {
      // Check if blob is a Base64 string before converting
      if (typeof note.attachment?.blob === 'string') {
        return {
          ...note,
          attachment: {
            ...note.attachment,
            blob: await base64ToBlob(note.attachment.blob),
          },
        };
      }
      return note;
    }),
  );
};

/**
 * Darkens a hex colour while maintaining or boosting saturation for vividness.
 */
export const darkenColor = (hex, percent = 35) => {
  if (!hex || hex === 'transparent' || hex.toLowerCase() === '#ffffff') {
    return null;
  }

  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  // Hex to RGB using bitwise operators
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return null;
  }

  let r = (num >> 16) / 255;
  let g = ((num >> 8) & 0x00ff) / 255;
  let b = (num & 0x0000ff) / 255;

  // Find HSL values
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) {
      h = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h /= 6;
  }

  // Decrease lightness, increase saturation slightly to avoid "muddiness"
  const saturationMultiplier = 1 + percent / 100;
  s = Math.min(1, s * saturationMultiplier);
  l = Math.max(0, l - percent / 100);

  // HSL to RGB
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };

  return `rgb(${Math.round(f(0) * 255)}, ${Math.round(f(8) * 255)}, ${Math.round(f(4) * 255)})`;
};
