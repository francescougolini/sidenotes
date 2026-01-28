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

import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  countWords,
  getReadTime,
  downloadLocalFile,
  darkenColor,
  getFileType,
  formatBytes,
} from '../utils/utils';
import {
  CopyIcon,
  DownloadIcon,
  PaletteIcon,
  TrashIcon,
  AttachFileIcon,
  DownloadFileIcon,
  RemoveFileIcon,
} from './Icons';

const Note = ({
  note,
  index,
  totalNotes,
  onUpdate,
  onDeleteRequest,
  onMove,
  availableColors,
  defaultTitle,
}) => {
  const { id, title, content, accentColor, attachment } = note;

  const positionId = useId();
  const fileInputId = useId();

  const [localContent, setLocalContent] = useState(content);
  const [isDragging, setIsDragging] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  // Refs
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);

  // Derived state and memoisation
  const iconColorStyle = useMemo(() => {
    const baseColor = darkenColor(accentColor, 50);
    const hoverColor = darkenColor(accentColor, 65);
    return baseColor
      ? {
          '--dynamic-icon-color': baseColor,
          '--dynamic-icon-hover': hoverColor,
        }
      : {};
  }, [accentColor]);

  // Create a temporary URL for the Blob attachment
  useEffect(() => {
    let url = null;
    const blob = attachment?.blob;
    if (blob instanceof Blob || blob instanceof File) {
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } else {
      setBlobUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [attachment?.blob]);

  // Sync content to local state when prop changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Debounced save function
  const debouncedUpdate = useDebounce((updatedFields) => {
    onUpdate({ ...note, ...updatedFields });
  }, 1000);

  // Ensures the DOM reflects the state only when external changes occur
  useEffect(() => {
    if (titleRef.current && titleRef.current.innerText !== title) {
      titleRef.current.innerText = title;
    }
    if (contentRef.current && contentRef.current.innerText !== content) {
      contentRef.current.innerText = content;
    }
  }, [title, content]);

  // Handlers
  const processFile = (file) => {
    if (!file) {
      return;
    }
    const newAttachment = {
      name: file.name,
      type: getFileType(file.type),
      mimeType: file.type,
      size: file.size,
      blob: file,
    };
    onUpdate({ ...note, attachment: newAttachment });
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        e.preventDefault();
        processFile(items[i].getAsFile());
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Text and title input handlers
  const handleTitleInput = (e) =>
    debouncedUpdate({ title: e.target.innerText });

  const handleContentInput = (e) => {
    const text = e.target.innerText;
    setLocalContent(text);
    debouncedUpdate({ content: text });
  };

  const handleTitleBlur = (e) => {
    if (e.target.innerText.trim() === '') {
      e.target.innerText = defaultTitle;
      debouncedUpdate({ attachment });
    }
  };

  const handleTitleFocus = (e) => {
    if (e.target.innerText === defaultTitle) {
      e.target.innerText = '';
    }
  };

  // Toolbar actions
  const handleCopyText = (e) => {
    const btn = e.currentTarget;
    navigator.clipboard.writeText(localContent).then(() => {
      const originalColor = btn.style.color;
      btn.style.color = '#00ad43';
      setTimeout(() => {
        btn.style.color = originalColor;
      }, 1000);
    });
  };

  const handleChangeColor = () => {
    let nextColor = availableColors[0];
    if (availableColors.includes(accentColor)) {
      const idx = availableColors.indexOf(accentColor);
      nextColor =
        idx !== availableColors.length - 1
          ? availableColors[idx + 1]
          : availableColors[0];
    }
    onUpdate({ ...note, accentColor: nextColor });
  };

  const handleMove = (e) => {
    const val = e.target.value;
    if (val === '') {
      return;
    }
    let newIndex = parseInt(val, 10);
    if (newIndex > totalNotes) {
      newIndex = totalNotes;
    }
    if (newIndex < 1) {
      newIndex = 1;
    }
    if (!isNaN(newIndex) && newIndex !== index) {
      onMove(id, index, newIndex);
    }
  };

  const handleDownload = () => {
    const fullNote = (title ? title + '\n\n' : '') + localContent;
    const filename =
      (title || 'note').replace(/[^\p{L}^\p{N}]+/gu, ' ').trim() + '.txt';
    downloadLocalFile(fullNote, filename, 'text/plain');
  };

  return (
    <div
      id={id}
      className={`note ${isDragging ? 'drag-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        id={fileInputId}
        name={`note-file-upload-${note.id}`}
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => processFile(e.target.files[0])}
      />

      <div
        className="note-title-container"
        style={{ backgroundColor: accentColor || 'inherit' }}
      >
        <h2
          ref={titleRef}
          className="note-title editable"
          contentEditable="plaintext-only"
          suppressContentEditableWarning={true}
          onInput={handleTitleInput}
          onFocus={handleTitleFocus}
          onBlur={handleTitleBlur}
        ></h2>
      </div>

      {attachment && (
        <div className="note-media-preview">
          <div className="media-controls-overlay">
            <button
              type="button"
              className="download-attachment"
              title="Download attachment"
              onClick={() =>
                downloadLocalFile(
                  attachment.blob,
                  attachment.name,
                  attachment.type,
                )
              }
            >
              <DownloadFileIcon />
            </button>
            <button
              type="button"
              className="remove-attachment"
              title="Remove attachment"
              onClick={() => onUpdate({ ...note, attachment: null })}
            >
              <RemoveFileIcon />
            </button>
          </div>

          <div
            className="file-chip"
            onClick={() =>
              downloadLocalFile(
                attachment.blob,
                attachment.name,
                attachment.type,
              )
            }
          >
            {attachment.mimeType?.startsWith('image/') && blobUrl && (
              <img
                src={blobUrl}
                alt={attachment.name}
                className="note-attachment-thumbnail"
                loading="lazy"
              />
            )}
            <div className="file-info">
              <strong>{attachment.name}</strong>
              <span>{formatBytes(attachment.size)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="note-text-container" onPaste={handlePaste}>
        <div
          ref={contentRef}
          className="note-text"
          contentEditable="plaintext-only"
          suppressContentEditableWarning={true}
          onInput={handleContentInput}
        ></div>
      </div>

      <div className="note-toolbox-container">
        <div className="note-insights">
          <div className="insight-container">
            <div
              className="insight-content hovering-label"
              aria-label="Characters"
            >
              <span>C:</span>
              <span className="character-counter">{localContent.length}</span>
            </div>
          </div>
          <div className="insight-container">
            <div className="insight-content hovering-label" aria-label="Words">
              <span>W:</span>
              <span className="word-counter">{countWords(localContent)}</span>
            </div>
          </div>
          <div className="insight-container">
            <div
              className="insight-content hovering-label"
              aria-label="Time (sec)"
            >
              <span>T:</span>
              <span className="time-counter">{getReadTime(localContent)}</span>
            </div>
          </div>
        </div>

        <div className="note-controls">
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label attach-file"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              style={iconColorStyle}
            >
              <AttachFileIcon />
            </button>
          </div>

          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label copy-text"
              aria-label="Copy text"
              onClick={handleCopyText}
            >
              <CopyIcon />
            </button>
          </div>
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label download-note"
              aria-label="Download"
              onClick={handleDownload}
            >
              <DownloadIcon />
            </button>
          </div>
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label change-accent-color"
              aria-label="Color"
              onClick={handleChangeColor}
              style={iconColorStyle}
            >
              <PaletteIcon />
            </button>
          </div>
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label delete-note"
              aria-label="Delete"
              onClick={() => onDeleteRequest(id)}
            >
              <TrashIcon />
            </button>
          </div>
          <div className="note-control-container">
            <div
              className="note-control hovering-label move-note"
              aria-label="Move note"
            >
              <input
                id={positionId}
                name={`note-position-${note.id}`}
                type="number"
                min="1"
                max={totalNotes}
                className="note-index editable"
                aria-label={`Change position for note: ${title || 'Untitled'}`}
                defaultValue={index}
                onBlur={handleMove}
                onKeyDown={(e) => e.key === 'Enter' && handleMove(e)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Note);
